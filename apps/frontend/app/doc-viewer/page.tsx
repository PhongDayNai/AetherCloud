'use client';

import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { CloudProvider, useCloud } from '../../context/CloudContext';
import { useConfirm } from '../../context/ConfirmContext';
import VersionWidget from '../../components/VersionWidget';
import MergeEditor from '../../components/MergeEditor';
import { docCategoryOf, fmtBytes, hasWritePermission } from '../../lib/utils';
import { alignAndDiffTwoWay, DiffLineBlock } from '../../lib/diffUtils';
import { Asset } from '../../types';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import DOMPurify from 'isomorphic-dompurify';
import * as Icons from '../../components/Icons';
import { docViewerTips, getLocalizedText } from './tipsViewerTips';

import MascotTipsWidget from '../../components/MascotTipsWidget';
import QuantumLoader from '../../components/QuantumLoader';

import './docViewer.css';
import 'highlight.js/styles/github-dark.css';

const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';

function splitHtmlIntoLines(html: string): string[] {
  const lines = html.split('\n');
  const openTags: string[] = [];

  return lines.map((line) => {
    let prefix = openTags.join('');

    // Find all span tags in the current line
    const tagRegex = /<\/?span[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(line)) !== null) {
      const tag = match[0];
      if (tag.startsWith('</')) {
        openTags.pop();
      } else {
        openTags.push(tag);
      }
    }

    let suffix = '';
    for (let i = openTags.length - 1; i >= 0; i--) {
      suffix += '</span>';
    }

    return prefix + line + suffix;
  });
}



function DocViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { resolvedTheme: globalTheme } = useTheme();
  const [docTheme, setDocTheme] = useState<'light' | 'dark'>('dark');

  const currentLang = (language === 'vi' || language === 'en') ? language : 'vi';

  const tabId = useRef('');
  const { user, groups, addToast } = useCloud();
  const confirm = useConfirm();

  const id = searchParams.get('id');
  console.log('[DocViewer] Global Resolved Theme:', globalTheme);

  // Tab tracking to clean up temporary theme when all DocViewer tabs close
  useEffect(() => {
    tabId.current = Math.random().toString(36).substring(2, 9);

    const registerTab = () => {
      try {
        const activeTabs = JSON.parse(localStorage.getItem('docviewer_active_tabs') || '[]');
        if (!activeTabs.includes(tabId.current)) {
          activeTabs.push(tabId.current);
          localStorage.setItem('docviewer_active_tabs', JSON.stringify(activeTabs));
        }
      } catch (err) {
        console.error('Failed to register docviewer tab:', err);
      }
    };

    const unregisterTab = () => {
      try {
        const activeTabs = JSON.parse(localStorage.getItem('docviewer_active_tabs') || '[]');
        const updated = activeTabs.filter((id: string) => id !== tabId.current);
        if (updated.length === 0) {
          localStorage.removeItem('docviewer_active_tabs');
          localStorage.removeItem('docviewer_theme');
        } else {
          localStorage.setItem('docviewer_active_tabs', JSON.stringify(updated));
        }
      } catch (err) {
        console.error('Failed to unregister docviewer tab:', err);
      }
    };

    registerTab();

    const handleUnload = () => {
      unregisterTab();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      unregisterTab();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Sync docTheme with globalTheme whenever globalTheme changes
  useEffect(() => {
    if (globalTheme === 'light' || globalTheme === 'dark') {
      setDocTheme(globalTheme);
      localStorage.setItem('docviewer_theme', globalTheme);
    }
  }, [globalTheme]);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', docTheme);
  }, [docTheme]);

  // Sync temporary theme across docviewer tabs via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'docviewer_theme') {
        const val = e.newValue as 'light' | 'dark';
        if (val === 'light' || val === 'dark') {
          setDocTheme(val);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleDocTheme = () => {
    const next = docTheme === 'light' ? 'dark' : 'light';
    setDocTheme(next);
    localStorage.setItem('docviewer_theme', next);
  };

  const [asset, setAsset] = useState<Asset | null>(null);
  const [markdownText, setMarkdownText] = useState<string>('');
  const [originalMarkdown, setOriginalMarkdown] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [codeText, setCodeText] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewVersion, setPreviewVersion] = useState<any | null>(null);
  const [historyContent, setHistoryContent] = useState<string>('');
  const [mdCompareMode, setMdCompareMode] = useState<'diff' | 'preview'>('diff');
  const [sandboxMode, setSandboxMode] = useState<boolean>(true);
  const [isModeHovered, setIsModeHovered] = useState<boolean>(false);
  const draftContentRef = useRef<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('default_sandbox_mode');
    setSandboxMode(saved === 'off' ? false : true);
  }, []);

  // Lắng nghe sự kiện group_kick để kiểm tra quyền truy cập tài liệu realtime
  useEffect(() => {
    const handleGroupUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, metadata } = customEvent.detail || {};

      if ((type === 'group_kick' || type === 'group_delete') && metadata && metadata.groupId) {
        if (asset && asset.groupId === metadata.groupId) {
          setError(
            language === 'vi'
              ? 'Bạn không có quyền truy cập tài liệu này do nhóm đã bị giải tán hoặc bạn không còn là thành viên.'
              : 'You do not have permission to access this document as the group has been disbanded or you are no longer a member.'
          );
          setAsset(null); // Gỡ bỏ metadata để bảo vệ thông tin tài liệu
        }
      }
    };

    window.addEventListener('group-update', handleGroupUpdate);
    return () => {
      window.removeEventListener('group-update', handleGroupUpdate);
    };
  }, [asset, language]);

  const [showMerge, setShowMerge] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<number>(1);
  const [conflictServerContent, setConflictServerContent] = useState<string>('');
  const [conflictLocalContent, setConflictLocalContent] = useState<string>('');

  const category = asset ? docCategoryOf(asset) : 'other';

  const [enableJustify, setEnableJustify] = useState(false);
  const [justifyClass, setJustifyClass] = useState('');
  const justifySupportedCategories = ['markdown'];

  // Load justify state from localStorage when category changes
  useEffect(() => {
    if (category && category !== 'other') {
      const saved = localStorage.getItem(`justify_${category}`);
      setEnableJustify(saved === 'on');
    }
  }, [category]);

  const handleToggleJustify = () => {
    const nextVal = !enableJustify;
    setEnableJustify(nextVal);
    if (category && category !== 'other') {
      localStorage.setItem(`justify_${category}`, nextVal ? 'on' : 'off');
    }
  };

  useEffect(() => {
    if (enableJustify) {
      setJustifyClass('justify-active justify-text');
    } else {
      setJustifyClass((prev) => prev.includes('justify-text') ? 'justify-inactive' : '');
    }
  }, [enableJustify]);

  const getCodeContainerClass = (extraClasses = '') => {
    const isSupported = justifySupportedCategories.includes(category);
    return `codeContainer ${isSupported ? justifyClass : ''} ${extraClasses}`.trim();
  };
  const isDirty = category === 'markdown' ? (markdownText !== originalMarkdown) : (codeText !== originalCode);
  const isWritable = asset ? hasWritePermission(asset, user, groups) : false;

  const codeDiffRows = useMemo(() => {
    if (!previewVersion) return [];
    const alignedBlocks = alignAndDiffTwoWay(codeText, historyContent);
    let leftLineNo = 0;
    let rightLineNo = 0;
    return alignedBlocks.map(block => {
      let lNo = '';
      let rNo = '';
      if (block.type === 'normal' || block.type === 'modified') {
        leftLineNo++;
        rightLineNo++;
        lNo = String(leftLineNo);
        rNo = String(rightLineNo);
      } else if (block.type === 'deleted') {
        leftLineNo++;
        lNo = String(leftLineNo);
      } else if (block.type === 'added') {
        rightLineNo++;
        rNo = String(rightLineNo);
      }
      return {
        ...block,
        leftLineNo: lNo,
        rightLineNo: rNo
      };
    });
  }, [codeText, historyContent, previewVersion]);

  const mdDiffRows = useMemo(() => {
    if (!previewVersion) return [];
    const alignedBlocks = alignAndDiffTwoWay(markdownText, historyContent);
    let leftLineNo = 0;
    let rightLineNo = 0;
    return alignedBlocks.map(block => {
      let lNo = '';
      let rNo = '';
      if (block.type === 'normal' || block.type === 'modified') {
        leftLineNo++;
        rightLineNo++;
        lNo = String(leftLineNo);
        rNo = String(rightLineNo);
      } else if (block.type === 'deleted') {
        leftLineNo++;
        lNo = String(leftLineNo);
      } else if (block.type === 'added') {
        rightLineNo++;
        rNo = String(rightLineNo);
      }
      return {
        ...block,
        leftLineNo: lNo,
        rightLineNo: rNo
      };
    });
  }, [markdownText, historyContent, previewVersion]);

  const leftLineDiffTypes = useMemo(() => {
    const map: Record<number, 'normal' | 'added' | 'deleted' | 'modified'> = {};
    const diffRows = category === 'markdown' ? mdDiffRows : codeDiffRows;
    diffRows.forEach(row => {
      if (row.leftLineNo) {
        const lineNum = Number(row.leftLineNo);
        map[lineNum] = row.type;
      }
    });
    return map;
  }, [codeDiffRows, mdDiffRows, category]);

  const rightLineDiffTypes = useMemo(() => {
    const map: Record<number, 'normal' | 'added' | 'deleted' | 'modified'> = {};
    const diffRows = category === 'markdown' ? mdDiffRows : codeDiffRows;
    diffRows.forEach(row => {
      if (row.rightLineNo) {
        const lineNum = Number(row.rightLineNo);
        map[lineNum] = row.type;
      }
    });
    return map;
  }, [codeDiffRows, mdDiffRows, category]);

  const mdHighlightedLines = useMemo(() => {
    if (!markdownText) return [];
    try {
      const html = hljs.highlight(markdownText, { language: 'markdown' }).value;
      return splitHtmlIntoLines(html);
    } catch {
      return markdownText.split('\n');
    }
  }, [markdownText]);

  const historyPreviewHtml = useMemo(() => {
    if (!previewVersion || !historyContent) return '';
    try {
      const html = marked.parse(historyContent);
      return DOMPurify.sanitize(html as string);
    } catch {
      return '';
    }
  }, [previewVersion, historyContent]);


  // Sidebar query parameters & pagination states
  const tabQuery = searchParams.get('tab') || '';
  const spaceId = searchParams.get('spaceId') || '';
  const postId = searchParams.get('postId') || '';
  const docProjectParam = searchParams.get('docProject');
  const docProject = docProjectParam !== null ? docProjectParam : 'all';

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Sidebar files list
  const [sidebarFiles, setSidebarFiles] = useState<Asset[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [visibleLinesCount, setVisibleLinesCount] = useState<number>(2000);

  // Reset visible lines count when document ID changes
  useEffect(() => {
    setVisibleLinesCount(2000);
  }, [id]);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = useRef<'left' | 'right' | null>(null);
  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScrollingFast, setIsScrollingFast] = useState<boolean>(false);
  const lastScrollTop = useRef<number>(0);
  const lastScrollTime = useRef<number>(Date.now());
  const scrollDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lineNoRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFetchedContext = useRef<{
    tabQuery: string;
    spaceId: string;
    postId: string;
    docProjectParam: string | null;
    groupId: string | null;
  } | null>(null);
  const codePreRef = useRef<HTMLPreElement>(null);
  const leftCodePreRef = useRef<HTMLPreElement>(null);
  const leftLineNoRef = useRef<HTMLDivElement>(null);

  const handleEditorScroll = () => {
    if (textareaRef.current && lineNoRef.current) {
      lineNoRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const leftCodeContainerRef = useRef<HTMLDivElement>(null);
  const rightCodeContainerRef = useRef<HTMLDivElement>(null);

  const handleLeftCodeScroll = () => {
    if (activeScrollRef.current === 'right') return;
    activeScrollRef.current = 'left';
    if (leftCodeContainerRef.current && rightCodeContainerRef.current) {
      rightCodeContainerRef.current.scrollTop = leftCodeContainerRef.current.scrollTop;
      rightCodeContainerRef.current.scrollLeft = leftCodeContainerRef.current.scrollLeft;
    }
    if (scrollSyncTimeoutRef.current) clearTimeout(scrollSyncTimeoutRef.current);
    scrollSyncTimeoutRef.current = setTimeout(() => { activeScrollRef.current = null; }, 50);
  };

  const handleRightCodeScroll = () => {
    if (activeScrollRef.current === 'left') return;
    activeScrollRef.current = 'right';
    if (leftCodeContainerRef.current && rightCodeContainerRef.current) {
      leftCodeContainerRef.current.scrollTop = rightCodeContainerRef.current.scrollTop;
      leftCodeContainerRef.current.scrollLeft = rightCodeContainerRef.current.scrollLeft;
    }
    if (scrollSyncTimeoutRef.current) clearTimeout(scrollSyncTimeoutRef.current);
    scrollSyncTimeoutRef.current = setTimeout(() => { activeScrollRef.current = null; }, 50);
  };
  // Initialize marked parser with custom code renderer
  const markedRenderer = new marked.Renderer();
  markedRenderer.code = (code: string, language?: string) => {
    if (language === 'mermaid') {
      return `<div class="mermaid" data-code="${encodeURIComponent(code)}"></div>`;
    }
    const validLang = language && hljs.getLanguage(language) ? language : null;
    const highlighted = validLang
      ? hljs.highlight(code, { language: validLang }).value
      : hljs.highlightAuto(code).value;
    return `<pre><code class="hljs ${validLang || ''}">${highlighted}</code></pre>`;
  };

  // Configure marked options
  marked.setOptions({
    renderer: markedRenderer,
    gfm: true,
    breaks: true
  });

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose'
    });
  }, []);

  // Sync scroll handlers
  const resetActiveScroll = () => {
    if (scrollSyncTimeoutRef.current) clearTimeout(scrollSyncTimeoutRef.current);
    scrollSyncTimeoutRef.current = setTimeout(() => {
      activeScrollRef.current = null;
    }, 50);
  };

  const handleLeftScroll = () => {
    if (activeScrollRef.current === 'right') return;
    activeScrollRef.current = 'left';
    resetActiveScroll();

    const left = leftPaneRef.current;
    const right = rightPaneRef.current;
    if (left && right) {
      const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight);
      right.scrollTop = percentage * (right.scrollHeight - right.clientHeight);
    }
  };

  // Sync right scroll
  const handleRightScroll = () => {
    if (activeScrollRef.current === 'left') return;
    activeScrollRef.current = 'right';
    resetActiveScroll();

    const left = leftPaneRef.current;
    const right = rightPaneRef.current;
    if (left && right) {
      const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight);
      left.scrollTop = percentage * (left.scrollHeight - left.clientHeight);
    }
  };

  // Fetch sidebar files list (with context filter)
  useEffect(() => {
    if (isLoading) return;

    const fetchSidebarFiles = async () => {
      const activeGroupId = asset?.groupId || '';

      // Prevent reload if context is identical
      if (
        lastFetchedContext.current &&
        lastFetchedContext.current.tabQuery === tabQuery &&
        lastFetchedContext.current.spaceId === spaceId &&
        lastFetchedContext.current.postId === postId &&
        lastFetchedContext.current.docProjectParam === docProjectParam &&
        lastFetchedContext.current.groupId === activeGroupId
      ) {
        return;
      }

      try {
        setNextCursor(null);
        setHasMore(false);

        // 1. Post context: filter files inside that specific post (only when tab is space or space-all)
        if (postId && spaceId && (tabQuery === 'space' || tabQuery === 'space-all')) {
          const res = await fetch(`${api}/api/spaces/${spaceId}/posts`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const postsList = data.posts || [];
            const activePost = postsList.find((p: any) => String(p.id) === String(postId));
            const postAssets = activePost?.assets || [];
            const docAssets = postAssets.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            lastFetchedContext.current = { tabQuery, spaceId, postId, docProjectParam, groupId: activeGroupId };
          }
        }
        // 2. Binder / Document Project context
        else if (docProjectParam !== null && docProjectParam !== '') {
          let url = `${api}/api/assets?limit=50&type=docs&docProject=${encodeURIComponent(docProjectParam)}`;
          if (activeGroupId) url += `&groupId=${activeGroupId}`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const itemsList = data.items || [];
            const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
            lastFetchedContext.current = { tabQuery, spaceId, postId, docProjectParam, groupId: activeGroupId };
          }
        }
        // 3. Space view context: filter files in that specific Space (only when tab is space or space-all)
        else if (spaceId && (tabQuery === 'space-all' || tabQuery === 'space')) {
          const res = await fetch(`${api}/api/spaces/${spaceId}/posts`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const postsList = data.posts || [];
            const list: Asset[] = [];
            for (const post of postsList) {
              if (post.assets) {
                list.push(...post.assets);
              }
            }
            const docAssets = list.filter((item: Asset) => !['image', 'video'].includes(item.type));
            const uniqueDocAssets = docAssets.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setSidebarFiles(uniqueDocAssets);
            lastFetchedContext.current = { tabQuery, spaceId, postId, docProjectParam, groupId: activeGroupId };
          }
        }
        // 4. Documents tab context
        else if (tabQuery === 'docs') {
          let url = `${api}/api/assets?limit=50&type=docs`;
          if (activeGroupId) url += `&groupId=${activeGroupId}`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const itemsList = data.items || [];
            const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
            lastFetchedContext.current = { tabQuery, spaceId, postId, docProjectParam, groupId: activeGroupId };
          }
        }
        // 5. Default / Dashboard / Personal space context
        else {
          let url = `${api}/api/assets?limit=50&type=docs`;
          if (activeGroupId) url += `&groupId=${activeGroupId}`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const itemsList = data.items || [];
            const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
            lastFetchedContext.current = { tabQuery, spaceId, postId, docProjectParam, groupId: activeGroupId };
          }
        }
      } catch (err) {
        console.error('Failed to fetch sidebar files:', err);
      }
    };
    fetchSidebarFiles();
  }, [tabQuery, spaceId, postId, docProjectParam, asset?.groupId, isLoading]);

  // Lazy load: fetch next page of sidebar files
  const loadMoreSidebarFiles = async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    try {
      setIsLoadingMore(true);
      let url = `${api}/api/assets?limit=50&cursor=${nextCursor}`;
      if (docProjectParam !== null && docProjectParam !== '') {
        url += `&docProject=${encodeURIComponent(docProjectParam)}`;
      } else {
        url += `&type=docs`;
      }
      const activeGroupId = asset?.groupId || '';
      if (activeGroupId) {
        url += `&groupId=${activeGroupId}`;
      }

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const itemsList = data.items || [];
        const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));

        setSidebarFiles(prev => [...prev, ...docAssets]);
        setNextCursor(data.nextCursor || null);
        setHasMore(!!data.nextCursor);
      }
    } catch (err) {
      console.error('Failed to load more sidebar files:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Scroll handler to trigger lazy loading
  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 40) {
      loadMoreSidebarFiles();
    }
  };

  // Scroll handler to progressively render more code lines
  const handleCodeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const now = Date.now();
    const currentScrollTop = target.scrollTop;
    const timeDelta = now - lastScrollTime.current;
    const scrollDelta = Math.abs(currentScrollTop - lastScrollTop.current);

    if (timeDelta > 0) {
      const velocity = scrollDelta / timeDelta; // px/ms
      if (velocity > 2.5) {
        if (!isScrollingFast) {
          setIsScrollingFast(true);
        }
      }
    }

    lastScrollTime.current = now;
    lastScrollTop.current = currentScrollTop;

    // Reset isScrollingFast after 150ms of no scrolling (debounce)
    if (scrollDebounceTimer.current) {
      clearTimeout(scrollDebounceTimer.current);
    }
    scrollDebounceTimer.current = setTimeout(() => {
      setIsScrollingFast(false);
    }, 150);

    // Only load more lines when NOT scrolling extremely fast to prevent frame drops
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 200) {
      if (visibleLinesCount < highlightedLines.length && !isScrollingFast) {
        setVisibleLinesCount(prev => Math.min(prev + 2000, highlightedLines.length));
      }
    }
  };

  // Context-aware URL click helper for sidebar switching
  const handleSidebarItemClick = async (fileId: string) => {
    if (isDirty) {
      if (!await confirm(t('viewer.confirmDiscard') || 'Bạn có các thay đổi chưa lưu. Bạn có chắc muốn chuyển tệp và bỏ qua chúng?', { isDanger: true })) {
        return;
      }
    }
    let url = `/doc-viewer?id=${fileId}`;
    if (tabQuery) url += `&tab=${tabQuery}`;
    // Only forward spaceId and postId when in space or space-all context to keep URL clean
    if (tabQuery === 'space' || tabQuery === 'space-all') {
      if (spaceId) url += `&spaceId=${spaceId}`;
      if (postId) url += `&postId=${postId}`;
    }
    if (docProjectParam !== null && docProjectParam !== '') url += `&docProject=${encodeURIComponent(docProjectParam)}`;
    router.push(url);
  };

  // Fetch asset details & content on mount
  useEffect(() => {
    if (!id) {
      setError(t('viewer.missingParam') || 'Missing document ID parameter');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        // Reset states to prevent state bleeding between documents
        setAsset(null);
        setMarkdownText('');
        setOriginalMarkdown('');
        setCodeText('');
        setOriginalCode('');
        setPreviewVersion(null);
        setError(null);

        // 1. Fetch metadata
        const metadataRes = await fetch(`${api}/api/assets/${id}?t=${Date.now()}`, { credentials: 'include' });
        if (!metadataRes.ok) {
          throw new Error(`${t('viewer.errorFetchDetails') || 'Failed to load asset details'} (HTTP ${metadataRes.status})`);
        }
        const assetData = await metadataRes.json();
        setAsset(assetData);

        // Sync browser tab title
        document.title = `${assetData.originalName} - AetherCloud DocViewer`;

        // 2. Fetch raw content if it is text/code/markdown
        const category = docCategoryOf(assetData);
        const isTextBased = ['markdown', 'code', 'config', 'text'].includes(category);

        if (isTextBased) {
          // Guard: Limit text previews to 10MB to avoid freezing browser thread
          if (assetData.size > 10 * 1024 * 1024) {
            throw new Error(t('viewer.fileTooLarge') || 'Tệp tin quá lớn (> 10MB), vui lòng tải về để xem trực tiếp.');
          }

          const contentRes = await fetch(`${api}/api/assets/_media/original/${id}?t=${Date.now()}`, { credentials: 'include' });
          if (!contentRes.ok) {
            throw new Error(`${t('viewer.errorFetchContent') || 'Failed to download raw file content'} (HTTP ${contentRes.status})`);
          }
          const text = await contentRes.text();

          if (category === 'markdown') {
            setMarkdownText(text);
            setOriginalMarkdown(text);
          } else {
            setCodeText(text);
            setOriginalCode(text);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error occurred while loading document');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Sync Markdown Live Preview with 150ms debounce to prevent editor lag
  useEffect(() => {
    if (!markdownText) return;

    const timer = setTimeout(() => {
      const html = marked.parse(markdownText);
      const cleanHtml = DOMPurify.sanitize(html as string);
      setPreviewHtml(cleanHtml);
    }, 150);

    return () => clearTimeout(timer);
  }, [markdownText]);

  // Run mermaid render whenever HTML preview changes, validating syntax to prevent crashes
  useEffect(() => {
    if (!previewHtml) return;

    const renderMermaid = async () => {
      const elements = document.querySelectorAll('.mermaid');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        const encodedCode = el.getAttribute('data-code');
        if (!encodedCode) continue;

        // Skip rendering if it is already processed with the exact same code
        if (el.getAttribute('data-rendered-code') === encodedCode) {
          continue;
        }

        try {
          const code = decodeURIComponent(encodedCode);
          // Clear any style overrides from previous errors
          el.style.border = 'none';
          el.style.background = 'transparent';

          // Validate syntax using mermaid.parse
          await mermaid.parse(code);

          // Render graph SVG
          const id = `mermaid-svg-${i}-${Math.random().toString(36).substring(2, 9)}`;
          const { svg } = await mermaid.render(id, code);
          el.innerHTML = svg;
          el.setAttribute('data-rendered-code', encodedCode);
        } catch (err: any) {
          console.error('Mermaid parsing failed:', err);
          // Render a beautiful, premium inline warning card instead of crashing
          el.innerHTML = `
            <div style="
              border: 1px solid #f87171;
              background-color: rgba(239, 68, 68, 0.08);
              color: #f87171;
              padding: 12px 16px;
              border-radius: 8px;
              font-family: 'Fira Code', monospace;
              font-size: 12.5px;
              margin: 12px 0;
              text-align: left;
              white-space: pre-wrap;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            ">
              <strong style="display: flex; align-items: center; gap: 6px;">
                ⚠️ Mermaid Diagram Syntax Error
              </strong>
              <div style="margin-top: 6px; font-size: 11.5px; color: #fca5a5; opacity: 0.95; line-height: 1.5;">
                ${err.message || err}
              </div>
            </div>
          `;
        }
      }
    };

    renderMermaid();
  }, [previewHtml, historyPreviewHtml, mdCompareMode]);

  // Prompt user on unsaved changes before tab close / reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Standard trigger for modern browsers
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Copy helper
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Close tab helper
  const handleClose = async () => {
    if (isDirty) {
      if (!await confirm(t('viewer.confirmDiscard') || 'Bạn có các thay đổi chưa lưu. Bạn có chắc muốn đóng và bỏ qua chúng?', { isDanger: true })) {
        return;
      }
    }
    window.close();
  };

  // Reset editor text helper
  const handleReset = async () => {
    if (isDirty) {
      if (await confirm(t('viewer.confirmReset') || 'Are you sure you want to revert all changes?', { isDanger: true })) {
        if (category === 'markdown') {
          setMarkdownText(originalMarkdown);
        } else {
          setCodeText(originalCode);
        }
      }
    }
  };

  const handlePrint = () => {
    const originalUrl = window.location.href;

    // Grab native, un-monkeypatched replaceState from a temporary iframe to prevent Next.js Router from reacting
    let nativeReplaceState = window.history.replaceState;
    let iframe: HTMLIFrameElement | null = null;
    try {
      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      if (iframe.contentWindow) {
        nativeReplaceState = iframe.contentWindow.history.replaceState;
      }
    } catch (e) {
      console.warn('Failed to get native replaceState, falling back', e);
    }

    // Set URL to root domain path natively
    nativeReplaceState.call(window.history, null, '', '/');

    window.print();

    // Restore original URL natively
    setTimeout(() => {
      nativeReplaceState.call(window.history, null, '', originalUrl);
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 200);
  };

  // Save changes handler (with conflict check)
  const handleSave = async (customContent?: string, customVersion?: number) => {
    if (!asset || isSaving) return;

    const contentToSave = customContent !== undefined
      ? customContent
      : (category === 'markdown' ? markdownText : codeText);

    const versionToSave = customVersion !== undefined
      ? customVersion
      : (asset.version || 1);

    try {
      setIsSaving(true);
      const res = await fetch(`${api}/api/assets/${id}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToSave,
          version: versionToSave,
        }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        addToast(t('viewer.saveSuccess') || 'Đã lưu tệp tin thành công!', 'info');

        // Update asset metadata
        setAsset(prev => prev ? {
          ...prev,
          version: data.version,
          size: data.size,
          uploadedAt: data.uploadedAt,
          lastModifiedById: user ? user.sub : prev.lastModifiedById
        } : null);

        // Update original and active values
        if (category === 'markdown') {
          setOriginalMarkdown(contentToSave);
          setMarkdownText(contentToSave);
        } else {
          setOriginalCode(contentToSave);
          setCodeText(contentToSave);
        }
        setShowMerge(false);
      } else if (res.status === 409) {
        const conflictData = await res.json();
        // Server version returned from conflict
        setServerVersion(conflictData.serverVersion);
        setConflictServerContent(conflictData.serverContent);
        setConflictLocalContent(contentToSave);
        setShowMerge(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to save file');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut listener for saving (Ctrl + S / Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (isWritable && isDirty && previewVersion === null && !isSaving && !asset?.isDeleted) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWritable, isDirty, previewVersion, isSaving, asset, handleSave]);

  // Preview version content
  const handlePreviewVersion = async (version: any | null) => {
    if (!asset) return;
    if (version) {
      try {
        setIsLoading(true);
        const res = await fetch(`${api}/api/assets/${id}/versions/${version.versionNumber}/content`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error(t('viewer.errorFetchContent') || 'Failed to download raw file content');
        }
        const data = await res.json();
        setPreviewVersion(version);
        setHistoryContent(data.content || '');
      } catch (err: any) {
        alert(err.message || 'Failed to load version content');
      } finally {
        setIsLoading(false);
      }
    } else {
      setPreviewVersion(null);
      setHistoryContent('');
    }
  };

  // Restore historic version
  const handleRestoreVersion = async (versionNumber: number) => {
    if (!asset) return;
    if (!await confirm(t('viewer.restoreConfirm') || 'Are you sure you want to restore the file to this version?', { isDanger: true })) {
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch(`${api}/api/assets/${id}/versions/${versionNumber}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        addToast(t('viewer.restoreSuccess') || 'File restored successfully!', 'info');

        // Update asset metadata
        setAsset(prev => prev ? {
          ...prev,
          version: data.version,
          size: data.size,
          uploadedAt: data.uploadedAt,
          lastModifiedById: user ? user.sub : prev.lastModifiedById
        } : null);

        // Fetch restored content
        const contentRes = await fetch(`${api}/api/assets/_media/original/${id}`, { credentials: 'include' });
        if (contentRes.ok) {
          const text = await contentRes.text();
          if (category === 'markdown') {
            setMarkdownText(text);
            setOriginalMarkdown(text);
          } else {
            setCodeText(text);
            setOriginalCode(text);
          }
        }
        setPreviewVersion(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to restore version');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred while restoring version');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute highlighted lines for history comparison view
  const currentCompareHighlightedLines = useMemo(() => {
    const textToHighlight = category === 'markdown' ? markdownText : codeText;
    if (!textToHighlight) return [];
    try {
      const extStr = category === 'markdown' ? 'markdown' : (asset ? (asset.ext || '').toLowerCase().replace(/^\./, '') : '');
      const lang = extStr && hljs.getLanguage(extStr) ? extStr : null;
      const html = lang
        ? hljs.highlight(textToHighlight, { language: lang }).value
        : hljs.highlightAuto(textToHighlight).value;
      return splitHtmlIntoLines(html);
    } catch {
      return textToHighlight.split('\n');
    }
  }, [codeText, markdownText, category, asset]);

  const historyCompareHighlightedLines = useMemo(() => {
    if (!historyContent) return [];
    try {
      const extStr = category === 'markdown' ? 'markdown' : (asset ? (asset.ext || '').toLowerCase().replace(/^\./, '') : '');
      const lang = extStr && hljs.getLanguage(extStr) ? extStr : null;
      const html = lang
        ? hljs.highlight(historyContent, { language: lang }).value
        : hljs.highlightAuto(historyContent).value;
      return splitHtmlIntoLines(html);
    } catch {
      return historyContent.split('\n');
    }
  }, [historyContent, category, asset]);

  if (error) {
    return (
      <div className="docViewerContainer">
        <div className="centerOverlay">
          <div className="errorTitle">{t('viewer.errorLoadFile') || 'Failed to load file'}</div>
          <div className="errorDesc">{error || 'Unknown error occurred'}</div>
          <button className="btn" onClick={() => router.push('/dashboard')}>
            {t('spaces.backToSpace') || 'Back to Spaces'}
          </button>
        </div>
      </div>
    );
  }

  if (!asset && !isLoading) {
    return (
      <div className="docViewerContainer">
        <div className="centerOverlay">
          <div className="errorTitle">{t('viewer.errorLoadFile') || 'Failed to load file'}</div>
          <div className="errorDesc">No document loaded</div>
          <button className="btn" onClick={() => router.push('/dashboard')}>
            {t('spaces.backToSpace') || 'Back to Spaces'}
          </button>
        </div>
      </div>
    );
  }




  // Compute highlighted code lines for formatting with line numbers
  const ext = asset ? (asset.ext || '').toLowerCase().replace(/^\./, '') : '';
  const validLang = ext && hljs.getLanguage(ext) ? ext : null;
  const highlightedHtml = codeText
    ? (validLang ? hljs.highlight(codeText, { language: validLang }).value : hljs.highlightAuto(codeText).value)
    : '';
  const highlightedLines = splitHtmlIntoLines(highlightedHtml);



  // Helper to determine the mode and styles for the sandbox/edit button
  const getSandboxModeConfig = () => {
    if (sandboxMode) {
      return {
        label: t('viewer.sandboxMode') || 'Sandbox Mode',
        tooltip: t('viewer.sandboxModeTooltip') || 'Read-only protection mode. Click to toggle to prevent accidental edits.',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.1)',
        bgHover: 'rgba(245, 158, 11, 0.2)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)',
        icon: (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        )
      };
    } else if (isWritable) {
      return {
        label: t('viewer.editMode') || 'Edit Mode',
        tooltip: t('viewer.editModeTooltip') || 'Edit Mode. You have permission to modify and save changes to this file.',
        color: '#34d399',
        bg: 'rgba(52, 211, 153, 0.1)',
        bgHover: 'rgba(52, 211, 153, 0.2)',
        border: '1px solid rgba(52, 211, 153, 0.4)',
        boxShadow: '0 0 12px rgba(52, 211, 153, 0.2)',
        icon: (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
          </svg>
        )
      };
    } else {
      return {
        label: t('viewer.previewEditMode') || 'Preview Edit Mode',
        tooltip: t('viewer.previewEditModeTooltip') || 'You do not have write permission. This mode only allows temporary editing for local preview, changes cannot be saved.',
        color: '#60a5fa',
        bg: 'rgba(96, 165, 250, 0.1)',
        bgHover: 'rgba(96, 165, 250, 0.2)',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        boxShadow: '0 0 12px rgba(96, 165, 250, 0.2)',
        icon: (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            <circle cx="12" cy="7" r="1" fill="currentColor"></circle>
          </svg>
        )
      };
    }
  };

  const modeConfig = getSandboxModeConfig();

  // Shared content sheet title/header renderer
  const renderContentHeader = () => {
    if (!asset) return null;
    return (
      <div className="docContentHeader no-print" style={{ borderBottom: previewVersion ? '1px solid rgba(255, 255, 255, 0.05)' : undefined }}>
        <h1 className="docContentTitle">{asset.originalName}</h1>
        {!previewVersion && (
          <div className="docContentMeta">
            <span>{category.toUpperCase()}</span>
            <span>•</span>
            <span>{fmtBytes(asset.size)}</span>
            {asset.uploadedAt && (
              <>
                <span>•</span>
                <span>{new Date(asset.uploadedAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`docViewerContainer cat-${category} ${sandboxMode ? 'mode-sandbox' : 'mode-edit'} ${mdCompareMode === 'diff' ? 'md-diff' : 'md-preview'} ${previewVersion !== null ? 'is-compare' : 'is-normal'}`}>
      <header className="viewerHeader no-print">
        <div className="headerLeft">
          <button
            className="btnToggleSidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Toggle Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <span className="logoText">AetherCloud</span>
        </div>

        <div className="headerCenter">
          {['markdown', 'code', 'config', 'text'].includes(category) && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={() => setIsModeHovered(true)}
              onMouseLeave={() => setIsModeHovered(false)}
            >
              <button
                className="sandboxToggleBtn"
                onClick={() => setSandboxMode(!sandboxMode)}
                title={modeConfig.tooltip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  outline: 'none',
                  boxShadow: modeConfig.boxShadow,
                  border: modeConfig.border,
                  background: modeConfig.bg,
                  color: modeConfig.color
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = modeConfig.bgHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = modeConfig.bg;
                }}
              >
                {modeConfig.icon}
                <span>{modeConfig.label}</span>
              </button>

              <span
                className="sandboxChangeIcon"
                title={modeConfig.tooltip}
                style={{
                  color: 'var(--text-muted, #71717a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  pointerEvents: 'none',
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isModeHovered ? 'rotate(180deg)' : 'none'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4M7 4L3 8M7 4L11 8" />
                  <path d="M17 8v12M17 20l-4-4M17 20l4-4" />
                </svg>
              </span>
            </div>
          )}
        </div>

        <div className="headerRight">
          {asset && ['markdown', 'code', 'config', 'text'].includes(category) && (
            <div className="versionWidgetWrapper">
              <VersionWidget
                assetId={asset.id}
                currentVersion={asset.version || 1}
                hasWritePermission={isWritable && !asset.isDeleted}
                onPreviewVersion={handlePreviewVersion}
                onRestoreVersion={handleRestoreVersion}
                previewVersion={previewVersion}
              />
            </div>
          )}

          {['markdown', 'code', 'config', 'text'].includes(category) && (
            <div className="saveActionGroup">
              {!isWritable && (
                <span className="readOnlyReasonLabel" title={t('viewer.readOnlyReason')}>
                  {t('viewer.readOnlyReason')}
                </span>
              )}
              {asset?.isDeleted && (
                <span className="readOnlyReasonLabel">
                  {t('viewer.fileInTrash')}
                </span>
              )}
              <button
                className="btn primary btnSave"
                onClick={() => handleSave()}
                disabled={!isWritable || !isDirty || previewVersion !== null || isSaving || asset?.isDeleted}
                title={isSaving ? t('viewer.saving') : t('viewer.save')}
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  flexShrink: 0
                }}
              >
                {isSaving ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <style>{`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}</style>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="30 15"></circle>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={!isDirty}
                title={t('viewer.reset') || 'Reset'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDirty ? 'var(--text-color, #ffffff)' : 'var(--text-muted, #71717a)',
                  cursor: isDirty ? 'pointer' : 'not-allowed',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  opacity: isDirty ? 1 : 0.4
                }}
                onMouseEnter={(e) => {
                  if (isDirty) {
                    e.currentTarget.style.background = docTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = docTheme === 'light' ? '#000000' : '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDirty ? 'var(--text-color, #ffffff)' : 'var(--text-muted, #71717a)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <polyline points="3 3 3 8 8 8"></polyline>
                </svg>
              </button>
            </div>
          )}

          {category === 'markdown' && (
            <>
              <button
                onClick={() => handleCopy(markdownText)}
                title={isCopied ? t('viewer.copiedSuccess') || 'Copied' : t('viewer.copyRaw') || 'Copy'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isCopied ? '#10b981' : 'var(--text-muted, #71717a)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = docTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
                  if (!isCopied) {
                    e.currentTarget.style.color = docTheme === 'light' ? '#000000' : '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  if (!isCopied) {
                    e.currentTarget.style.color = 'var(--text-muted, #71717a)';
                  }
                }}
              >
                {isCopied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
              <a
                href={`${api}/api/assets/_media/original/${asset.id}?download=true`}
                download={asset.originalName}
                title={t('details.download') || 'Download'}
                className="no-print"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #71717a)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = docTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = docTheme === 'light' ? '#000000' : '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted, #71717a)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </a>
              <button className="btn primary" onClick={handlePrint}>
                {t('viewer.exportPdf') || 'Export PDF'}
              </button>
              {justifySupportedCategories.includes(category) && (
                <button
                  onClick={handleToggleJustify}
                  title={enableJustify ? "Disable Justify Text" : "Enable Justify Text"}
                  className="no-print"
                  style={{
                    background: enableJustify ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: '1px solid ' + (enableJustify ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)'),
                    color: enableJustify ? '#818cf8' : 'var(--text-muted, #71717a)',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    marginLeft: '8px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="10" x2="3" y2="10"></line>
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="14" x2="3" y2="14"></line>
                    <line x1="21" y1="18" x2="3" y2="18"></line>
                  </svg>
                  <span>Justify</span>
                </button>
              )}
            </>
          )}

          {['code', 'config', 'text'].includes(category) && (
            <>
              <button
                onClick={() => handleCopy(codeText)}
                title={isCopied ? t('viewer.copiedSuccess') || 'Copied' : t('viewer.copyRaw') || 'Copy'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isCopied ? '#10b981' : 'var(--text-muted, #71717a)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = docTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
                  if (!isCopied) {
                    e.currentTarget.style.color = docTheme === 'light' ? '#000000' : '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  if (!isCopied) {
                    e.currentTarget.style.color = 'var(--text-muted, #71717a)';
                  }
                }}
              >
                {isCopied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
              <a
                href={`${api}/api/assets/_media/original/${asset.id}?download=true`}
                download={asset.originalName}
                title={t('details.download') || 'Download'}
                className="no-print"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #71717a)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = docTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = docTheme === 'light' ? '#000000' : '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted, #71717a)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </a>
              <button className="btn primary" onClick={handlePrint}>
                {t('viewer.exportPdf') || 'Export PDF'}
              </button>
              {justifySupportedCategories.includes(category) && (
                <button
                  onClick={handleToggleJustify}
                  title={enableJustify ? "Disable Justify Text" : "Enable Justify Text"}
                  className="no-print"
                  style={{
                    background: enableJustify ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: '1px solid ' + (enableJustify ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)'),
                    color: enableJustify ? '#818cf8' : 'var(--text-muted, #71717a)',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    marginLeft: '8px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="10" x2="3" y2="10"></line>
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="14" x2="3" y2="14"></line>
                    <line x1="21" y1="18" x2="3" y2="18"></line>
                  </svg>
                  <span>Justify</span>
                </button>
              )}
            </>
          )}

          <button
            className="btnToggleTheme"
            onClick={toggleDocTheme}
            title={docTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #71717a)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              marginRight: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = docTheme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = docTheme === 'light' ? '#000000' : '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted, #71717a)';
            }}
          >
            {docTheme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="M4.93 4.93l1.41 1.41"></path>
                <path d="M17.66 17.66l1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="M6.34 17.66l-1.41 1.41"></path>
                <path d="M19.07 4.93l-1.41 1.41"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
              </svg>
            )}
          </button>

          <div className="userInfo">
            <div className="userAvatar">{user?.name ? user.name[0].toUpperCase() : 'U'}</div>
            <span>{user?.name || asset?.owner || 'User'}</span>
          </div>

          <button className="btnClose" onClick={handleClose} title="Close tab">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <div className="viewerBody">
        {/* Collapsible Left Sidebar */}
        <aside className={`fileSidebar no-print ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebarHeader">{t('sidebar.documents') || 'Documents'}</div>
          <div className="fileList" onScroll={handleSidebarScroll}>
            {sidebarFiles.map((file) => {
              const fileCat = docCategoryOf(file);
              return (
                <div
                  key={file.id}
                  className={`fileItem ${file.id === asset?.id ? 'active' : ''}`}
                  onClick={() => handleSidebarItemClick(file.id)}
                  title={file.originalName}
                >
                  <span className="fileItemIcon">
                    <Icons.DocIcon item={file} size={18} />
                  </span>
                  <span className="fileItemName">{file.originalName}</span>
                </div>
              );
            })}
            {isLoadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <QuantumLoader size="small" />
              </div>
            )}
            {sidebarFiles.length === 0 && (
              <div style={{ padding: '16px', color: '#71717a', fontSize: '13px', textAlign: 'center' }}>
                {t('viewer.noFilesFound') || 'No files found'}
              </div>
            )}
          </div>

          {/* Bottom spacer for overlay tips widget */}
          {!isSidebarCollapsed && <div className="sidebarBottomSpacer" />}
        </aside>

        {/* Floating Tips Overlay */}
        <MascotTipsWidget tips={docViewerTips} theme={docTheme} language={currentLang} />

        <main className="viewerContent">
          {isLoading ? (
            <div className="centerOverlay" style={{ position: 'relative', height: '100%', minHeight: '300px' }}>
              <QuantumLoader size="large" text={t('viewer.loadingFile') || 'Loading file...'} />
            </div>
          ) : asset ? (
            <>
              {/* Print-only Header */}
              <div className="printHeaderOnly">
                <div className="printHeaderLogo">AetherCloud</div>
                <div className="printHeaderFileName">{asset.originalName}</div>
                <div className="printHeaderMeta">
                  <span>Version: v{asset.version || 1}</span>
                  <span> · </span>
                  <span>Size: {fmtBytes(asset.size)}</span>
                  {asset.uploadedAt && (
                    <>
                      <span> · </span>
                      <span>Date: {new Date(asset.uploadedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>

              {category === 'pdf' && (
                <div className="pdfContentWrapper">
                  {renderContentHeader()}
                  <div className="pdfContainer">
                    <iframe
                      src={`${api}/api/assets/_media/original/${asset.id}`}
                      className="pdfFrame"
                      title={asset.originalName}
                    />
                  </div>
                </div>
              )}

              {category === 'markdown' && (
                <div className="markdownContentWrapper">
                  {renderContentHeader()}
                  {previewVersion && (
                    <div className="previewVersionBanner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span>
                          {t('viewer.previewBanner', { ver: previewVersion.versionNumber })}
                        </span>
                        <button
                          className="btnText"
                          onClick={() => setMdCompareMode(prev => prev === 'diff' ? 'preview' : 'diff')}
                          style={{ textDecoration: 'underline', fontSize: '12.5px', fontWeight: 600 }}
                        >
                          {mdCompareMode === 'diff' ? t('viewer.viewPreview') || 'Xem Preview' : t('viewer.viewDiff') || 'Xem Bản Gốc (Diff)'}
                        </button>
                      </div>
                      <button className="btnText" onClick={() => handlePreviewVersion(null)}>
                        {t('viewer.exitPreview')}
                      </button>
                    </div>
                  )}
                  {previewVersion !== null ? (
                    <div className="splitLayout">
                      {mdCompareMode === 'diff' ? (
                        <>
                          {/* Left: Active Source Code Diff */}
                          <div className="leftPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                              <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t('viewer.compareCurrent') || 'Current Version'}
                              </h3>
                              <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                <span>v{asset.version || 1}</span>
                                <span>•</span>
                                <span>{fmtBytes(asset.size)}</span>
                                {asset.uploadedAt && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {!sandboxMode ? (
                              <div
                                ref={leftCodeContainerRef}
                                className={getCodeContainerClass('hljs')}
                                onScroll={handleLeftCodeScroll}
                                style={{ flex: 1, overflow: 'auto' }}
                              >
                                <div className="codeWrapper">
                                  <div className="lineNumbers">
                                    {markdownText.split('\n').map((_, i) => {
                                      const lineNum = i + 1;
                                      const diffType = leftLineDiffTypes[lineNum] || 'normal';
                                      return (
                                        <div key={i} className={`lineNo diff-line ${diffType}`}>
                                          {lineNum}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible', position: 'relative' }}>
                                    <code className="hljs markdown" style={{ display: 'block', position: 'relative' }}>
                                      <div style={{ pointerEvents: 'none' }}>
                                        {mdHighlightedLines.map((line, i) => {
                                          const lineNum = i + 1;
                                          const diffType = leftLineDiffTypes[lineNum] || 'normal';
                                          return (
                                            <div
                                              key={i}
                                              className={`codeLine diff-line ${diffType}`}
                                              dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                                            />
                                          );
                                        })}
                                      </div>
                                      <textarea
                                        ref={textareaRef}
                                        className="editorInput codeEditorInput hljs"
                                        value={markdownText}
                                        onChange={(e) => setMarkdownText(e.target.value)}
                                        spellCheck={false}
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          width: '100%',
                                          height: '100%',
                                          border: 'none',
                                          resize: 'none',
                                          outline: 'none',
                                          background: 'transparent',
                                          color: 'transparent',
                                          caretColor: docTheme === 'light' ? '#18181b' : '#ffffff',
                                          overflow: 'hidden',
                                          whiteSpace: 'pre',
                                          wordWrap: 'normal',
                                          padding: 0,
                                          margin: 0,
                                          fontFamily: 'inherit',
                                          fontSize: 'inherit',
                                          lineHeight: 'inherit',
                                          zIndex: 2
                                        }}
                                      />
                                    </code>
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <div
                                ref={leftCodeContainerRef}
                                className={getCodeContainerClass('hljs')}
                                onScroll={handleLeftCodeScroll}
                                style={{ flex: 1, overflow: 'auto' }}
                              >
                                <div className="codeWrapper">
                                  <div className="lineNumbers">
                                    {mdDiffRows.map((row, i) => (
                                      <div key={i} className={`lineNo diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}>
                                        {row.leftLineNo || ' '}
                                      </div>
                                    ))}
                                  </div>
                                  <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                                    <code className="hljs markdown">
                                      {mdDiffRows.map((row, i) => (
                                        <div
                                          key={i}
                                          className={`codeLine diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}
                                          style={{ height: '21.6px', lineHeight: '21.6px' }}
                                          dangerouslySetInnerHTML={{
                                            __html: row.type === 'added' ? '' : (row.leftLineNo ? (currentCompareHighlightedLines[Number(row.leftLineNo) - 1] || ' ') : ' ')
                                          }}
                                        />
                                      ))}
                                    </code>
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: History Source Code Diff */}
                          <div className="rightPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                              <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t('viewer.compareHistory', { ver: previewVersion.versionNumber }) || `History Version v${previewVersion.versionNumber}`}
                              </h3>
                              <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                <span>v{previewVersion.versionNumber}</span>
                                <span>•</span>
                                <span>{previewVersion.size ? fmtBytes(previewVersion.size) : ''}</span>
                                {previewVersion.createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(previewVersion.createdAt).toLocaleString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div
                              ref={rightCodeContainerRef}
                              className={getCodeContainerClass('hljs')}
                              onScroll={handleRightCodeScroll}
                              style={{ flex: 1, overflow: 'auto' }}
                            >
                              <div className="codeWrapper">
                                {sandboxMode ? (
                                  <>
                                    <div className="lineNumbers">
                                      {mdDiffRows.map((row, i) => (
                                        <div key={i} className={`lineNo diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}>
                                          {row.rightLineNo || ' '}
                                        </div>
                                      ))}
                                    </div>
                                    <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                                      <code className="hljs markdown">
                                        {mdDiffRows.map((row, i) => (
                                          <div
                                            key={i}
                                            className={`codeLine diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}
                                            style={{ height: '21.6px', lineHeight: '21.6px' }}
                                            dangerouslySetInnerHTML={{
                                              __html: row.type === 'deleted' ? '' : (row.rightLineNo ? (historyCompareHighlightedLines[Number(row.rightLineNo) - 1] || ' ') : ' ')
                                            }}
                                          />
                                        ))}
                                      </code>
                                    </pre>
                                  </>
                                ) : (
                                  <>
                                    <div className="lineNumbers">
                                      {historyContent.split('\n').map((_, i) => {
                                        const lineNum = i + 1;
                                        const diffType = rightLineDiffTypes[lineNum] || 'normal';
                                        return (
                                          <div key={i} className={`lineNo diff-line ${diffType}`}>
                                            {lineNum}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                                      <code className="hljs markdown">
                                        {historyContent.split('\n').map((_, i) => {
                                          const lineNum = i + 1;
                                          const diffType = rightLineDiffTypes[lineNum] || 'normal';
                                          return (
                                            <div
                                              key={i}
                                              className={`codeLine diff-line ${diffType}`}
                                              style={{ height: '21.6px', lineHeight: '21.6px' }}
                                              dangerouslySetInnerHTML={{
                                                __html: historyCompareHighlightedLines[i] || '&nbsp;'
                                              }}
                                            />
                                          );
                                        })}
                                      </code>
                                    </pre>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Left: Active HTML Preview */}
                          <div className="leftPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                              <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t('viewer.compareCurrent') || 'Current Version'}
                              </h3>
                              <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                <span>v{asset.version || 1}</span>
                                <span>•</span>
                                <span>{fmtBytes(asset.size)}</span>
                                {asset.uploadedAt && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div
                              ref={leftCodeContainerRef}
                              onScroll={handleLeftCodeScroll}
                              style={{ flex: 1, overflow: 'auto', padding: '24px' }}
                            >
                              <div
                                className={`previewContainer markdown-body ${justifyClass}`}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                              />
                            </div>
                          </div>

                          {/* Right: History HTML Preview */}
                          <div className="rightPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                              <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t('viewer.compareHistory', { ver: previewVersion.versionNumber }) || `History Version v${previewVersion.versionNumber}`}
                              </h3>
                              <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                <span>v{previewVersion.versionNumber}</span>
                                <span>•</span>
                                <span>{previewVersion.size ? fmtBytes(previewVersion.size) : ''}</span>
                                {previewVersion.createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(previewVersion.createdAt).toLocaleString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div
                              ref={rightCodeContainerRef}
                              onScroll={handleRightCodeScroll}
                              style={{ flex: 1, overflow: 'auto', padding: '24px' }}
                            >
                              <div
                                className={`previewContainer markdown-body ${justifyClass}`}
                                dangerouslySetInnerHTML={{ __html: historyPreviewHtml }}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="splitLayout">
                      <div className="leftPane no-print" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {!sandboxMode ? (
                          <div
                            ref={leftPaneRef}
                            className={getCodeContainerClass('hljs')}
                            onScroll={handleLeftScroll}
                            style={{ flex: 1, overflow: 'auto' }}
                          >
                            <div className="codeWrapper">
                              <div className="lineNumbers">
                                {markdownText.split('\n').map((_, i) => (
                                  <div key={i} className="lineNo">{i + 1}</div>
                                ))}
                              </div>
                              <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible', position: 'relative' }}>
                                <code className="hljs markdown" style={{ display: 'block', position: 'relative' }}>
                                  <div style={{ pointerEvents: 'none' }}>
                                    {mdHighlightedLines.map((line, i) => (
                                      <div
                                        key={i}
                                        className="codeLine"
                                        dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                                      />
                                    ))}
                                  </div>
                                  <textarea
                                    ref={textareaRef}
                                    className="editorInput codeEditorInput hljs"
                                    value={markdownText}
                                    onChange={(e) => setMarkdownText(e.target.value)}
                                    spellCheck={false}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                      resize: 'none',
                                      outline: 'none',
                                      background: 'transparent',
                                      color: 'transparent',
                                      caretColor: docTheme === 'light' ? '#18181b' : '#ffffff',
                                      overflow: 'hidden',
                                      whiteSpace: 'pre',
                                      wordWrap: 'normal',
                                      padding: 0,
                                      margin: 0,
                                      fontFamily: 'inherit',
                                      fontSize: 'inherit',
                                      lineHeight: 'inherit',
                                      zIndex: 2
                                    }}
                                  />
                                </code>
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div
                            ref={leftPaneRef}
                            className={getCodeContainerClass('hljs')}
                            onScroll={handleLeftScroll}
                            style={{ flex: 1, overflow: 'auto' }}
                          >
                            <div className="codeWrapper">
                              <div className="lineNumbers">
                                {mdHighlightedLines.map((_, i) => (
                                  <div key={i} className="lineNo">{i + 1}</div>
                                ))}
                              </div>
                              <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                                <code className="hljs markdown">
                                  {mdHighlightedLines.map((line, i) => (
                                    <div
                                      key={i}
                                      className="codeLine"
                                      dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                                    />
                                  ))}
                                </code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Print-only Markdown Source view (clean pre/code instead of textarea) */}
                      <div className={`print-only-markdown-source ${justifyClass}`} style={{ display: 'none' }}>
                        <pre className="codePre" style={{ padding: '24px', margin: 0 }}>
                          <code className="hljs markdown" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {markdownText}
                          </code>
                        </pre>
                      </div>

                      <div
                        ref={rightPaneRef}
                        className="rightPane"
                        onScroll={handleRightScroll}
                      >
                        <div
                          className={`previewContainer markdown-body ${justifyClass}`}
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {['code', 'config', 'text'].includes(category) && (
                <div className="docContentWrapper">
                  {renderContentHeader()}
                  {previewVersion && (
                    <div className="previewVersionBanner">
                      <span>
                        {t('viewer.previewBanner', { ver: previewVersion.versionNumber })}
                      </span>
                      <button className="btnText" onClick={() => handlePreviewVersion(null)}>
                        {t('viewer.exitPreview')}
                      </button>
                    </div>
                  )}
                  <div className="codeViewContainer" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {previewVersion !== null ? (
                      <div className="splitLayout">
                        {/* Left Pane: Active Version */}
                        <div className="leftPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                            <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t('viewer.compareCurrent') || 'Current Version'}
                            </h3>
                            <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                              <span>v{asset.version || 1}</span>
                              <span>•</span>
                              <span>{fmtBytes(asset.size)}</span>
                              {asset.uploadedAt && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {!sandboxMode ? (
                            <div
                              ref={leftCodeContainerRef}
                              className={getCodeContainerClass('hljs')}
                              onScroll={handleLeftCodeScroll}
                              style={{ flex: 1, overflow: 'auto' }}
                            >
                              <div className="codeWrapper">
                                <div className="lineNumbers">
                                  {codeText.split('\n').map((_, i) => {
                                    const lineNum = i + 1;
                                    const diffType = leftLineDiffTypes[lineNum] || 'normal';
                                    return (
                                      <div key={i} className={`lineNo diff-line ${diffType}`}>
                                        {lineNum}
                                      </div>
                                    );
                                  })}
                                </div>
                                <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible', position: 'relative' }}>
                                  <code className="hljs" style={{ display: 'block', position: 'relative' }}>
                                    <div style={{ pointerEvents: 'none' }}>
                                      {highlightedLines.map((line, i) => {
                                        const lineNum = i + 1;
                                        const diffType = leftLineDiffTypes[lineNum] || 'normal';
                                        return (
                                          <div
                                            key={i}
                                            className={`codeLine diff-line ${diffType}`}
                                            dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                                          />
                                        );
                                      })}
                                    </div>
                                    <textarea
                                      ref={textareaRef}
                                      className="editorInput codeEditorInput hljs"
                                      value={codeText}
                                      onChange={(e) => setCodeText(e.target.value)}
                                      spellCheck={false}
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        resize: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        color: 'transparent',
                                        caretColor: docTheme === 'light' ? '#18181b' : '#ffffff',
                                        overflow: 'hidden',
                                        whiteSpace: 'pre',
                                        wordWrap: 'normal',
                                        padding: 0,
                                        margin: 0,
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        lineHeight: 'inherit',
                                        zIndex: 2
                                      }}
                                    />
                                  </code>
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <div
                              ref={leftCodeContainerRef}
                              className={getCodeContainerClass('hljs')}
                              onScroll={handleLeftCodeScroll}
                              style={{ flex: 1, overflow: 'auto' }}
                            >
                              <div className="codeWrapper">
                                <div className="lineNumbers">
                                  {codeDiffRows.map((row, i) => (
                                    <div key={i} className={`lineNo diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}>
                                      {row.leftLineNo || ' '}
                                    </div>
                                  ))}
                                </div>
                                <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible' }}>
                                  <code className="hljs">
                                    {codeDiffRows.map((row, i) => (
                                      <div
                                        key={i}
                                        className={`codeLine diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}
                                        style={{ height: '21.6px', lineHeight: '21.6px' }}
                                        dangerouslySetInnerHTML={{
                                          __html: row.type === 'added' ? '' : (row.leftLineNo ? (currentCompareHighlightedLines[Number(row.leftLineNo) - 1] || ' ') : ' ')
                                        }}
                                      />
                                    ))}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Pane: History Version */}
                        <div className="rightPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                            <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t('viewer.compareHistory', { ver: previewVersion.versionNumber }) || `History Version v${previewVersion.versionNumber}`}
                            </h3>
                            <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                              <span>v{previewVersion.versionNumber}</span>
                              <span>•</span>
                              <span>{previewVersion.size ? fmtBytes(previewVersion.size) : ''}</span>
                              {previewVersion.createdAt && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(previewVersion.createdAt).toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div
                            ref={rightCodeContainerRef}
                            className={getCodeContainerClass('hljs')}
                            onScroll={handleRightCodeScroll}
                            style={{ flex: 1, overflow: 'auto' }}
                          >
                            <div className="codeWrapper">
                              {sandboxMode ? (
                                <>
                                  <div className="lineNumbers">
                                    {codeDiffRows.map((row, i) => (
                                      <div key={i} className={`lineNo diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}>
                                        {row.rightLineNo || ' '}
                                      </div>
                                    ))}
                                  </div>
                                  <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible' }}>
                                    <code className="hljs">
                                      {codeDiffRows.map((row, i) => (
                                        <div
                                          key={i}
                                          className={`codeLine diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}
                                          style={{ height: '21.6px', lineHeight: '21.6px' }}
                                          dangerouslySetInnerHTML={{
                                            __html: row.type === 'deleted' ? '' : (row.rightLineNo ? (historyCompareHighlightedLines[Number(row.rightLineNo) - 1] || ' ') : ' ')
                                          }}
                                        />
                                      ))}
                                    </code>
                                  </pre>
                                </>
                              ) : (
                                <>
                                  <div className="lineNumbers">
                                    {historyContent.split('\n').map((_, i) => {
                                      const lineNum = i + 1;
                                      const diffType = rightLineDiffTypes[lineNum] || 'normal';
                                      return (
                                        <div key={i} className={`lineNo diff-line ${diffType}`}>
                                          {lineNum}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible' }}>
                                    <code className="hljs">
                                      {historyContent.split('\n').map((_, i) => {
                                        const lineNum = i + 1;
                                        const diffType = rightLineDiffTypes[lineNum] || 'normal';
                                        return (
                                          <div
                                            key={i}
                                            className={`codeLine diff-line ${diffType}`}
                                            style={{ height: '21.6px', lineHeight: '21.6px' }}
                                            dangerouslySetInnerHTML={{
                                              __html: historyCompareHighlightedLines[i] || '&nbsp;'
                                            }}
                                          />
                                        );
                                      })}
                                    </code>
                                  </pre>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : !sandboxMode ? (
                      <div className={getCodeContainerClass('hljs')}>
                        <div className="codeWrapper" style={{ display: 'flex', width: '100%' }}>
                          <div className="lineNumbers">
                            {codeText.split('\n').map((_, i) => (
                              <div key={i} className="lineNo">{i + 1}</div>
                            ))}
                          </div>
                          <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible', position: 'relative' }}>
                            <code className="hljs" style={{ display: 'block', position: 'relative' }}>
                              <div style={{ pointerEvents: 'none' }}>
                                {highlightedLines.map((line, i) => (
                                  <div
                                    key={i}
                                    className="codeLine"
                                    dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                                  />
                                ))}
                              </div>
                              <textarea
                                ref={textareaRef}
                                className="editorInput codeEditorInput hljs"
                                value={codeText}
                                onChange={(e) => setCodeText(e.target.value)}
                                spellCheck={false}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  resize: 'none',
                                  outline: 'none',
                                  background: 'transparent',
                                  color: 'transparent',
                                  caretColor: docTheme === 'light' ? '#18181b' : '#ffffff',
                                  overflow: 'hidden',
                                  whiteSpace: 'pre',
                                  wordWrap: 'normal',
                                  padding: 0,
                                  margin: 0,
                                  fontFamily: 'inherit',
                                  fontSize: 'inherit',
                                  lineHeight: 'inherit',
                                  zIndex: 2
                                }}
                              />
                            </code>
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className={getCodeContainerClass()}>
                        <div className="codeWrapper" style={{ display: 'flex', width: '100%' }}>
                          <div className="lineNumbers">
                            {highlightedLines.map((_, i) => (
                              <div key={i} className="lineNo">{i + 1}</div>
                            ))}
                          </div>
                          <pre className="codePre">
                            <code className="hljs">
                              {highlightedLines.map((line, i) => (
                                <div
                                  key={i}
                                  className="codeLine"
                                  dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                                />
                              ))}
                            </code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!['pdf', 'markdown', 'code', 'config', 'text'].includes(category) && (
                <div className="docContentWrapper">
                  {renderContentHeader()}
                  <div className="fallbackContainer">
                    <div className="fallbackCard">
                      <div className="fallbackIcon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Icons.DocIcon item={asset} size={64} />
                      </div>
                      <div className="fallbackName">{asset.originalName}</div>
                      <div className="fallbackMeta">
                        {category.toUpperCase()} · {fmtBytes(asset.size)}
                      </div>
                      <a
                        href={`${api}/api/assets/_media/original/${asset.id}?download=true`}
                        download={asset.originalName}
                        className="btn primary"
                      >
                        {t('details.download') || 'Download'}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>

      {showMerge && (
        <MergeEditor
          serverContent={conflictServerContent}
          localContent={conflictLocalContent}
          onApply={(mergedContent) => handleSave(mergedContent, serverVersion)}
          onCancel={() => setShowMerge(false)}
        />
      )}
    </div>
  );
}

export default function DocViewerPage() {
  return (
    <CloudProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <DocViewerContent />
      </Suspense>
    </CloudProvider>
  );
}
