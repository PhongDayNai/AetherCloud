'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { CloudProvider, useCloud } from '../../context/CloudContext';
import { docCategoryOf, fmtBytes } from '../../lib/utils';
import { Asset } from '../../types';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import * as Icons from '../../components/Icons';

import './docViewer.css';
import 'highlight.js/styles/github-dark.css';

const api = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';

function DocViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { resolvedTheme: globalTheme } = useTheme();
  const [docTheme, setDocTheme] = useState<'light' | 'dark'>('dark');
  const tabId = useRef('');
  const { user } = useCloud();

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

  // Initialize theme from storage or globalTheme
  useEffect(() => {
    const tempTheme = localStorage.getItem('docviewer_theme') as 'light' | 'dark';
    if (tempTheme === 'light' || tempTheme === 'dark') {
      setDocTheme(tempTheme);
    } else {
      setDocTheme(globalTheme);
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar query parameters & pagination states
  const tabQuery = searchParams.get('tab') || '';
  const spaceId = searchParams.get('spaceId') || '';
  const postId = searchParams.get('postId') || '';
  const docProject = searchParams.get('docProject') || '';

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

  const leftPaneRef = useRef<HTMLTextAreaElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = useRef<'left' | 'right' | null>(null);

  // Initialize marked parser with custom code renderer
  const markedRenderer = new marked.Renderer();
  markedRenderer.code = (code: string, language?: string) => {
    if (language === 'mermaid') {
      return `<div class="mermaid">${code}</div>`;
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
  const handleLeftScroll = () => {
    if (activeScrollRef.current !== 'left') return;
    const left = leftPaneRef.current;
    const right = rightPaneRef.current;
    if (left && right) {
      const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight);
      right.scrollTop = percentage * (right.scrollHeight - right.clientHeight);
    }
  };

  // Sync right scroll
  const handleRightScroll = () => {
    if (activeScrollRef.current !== 'right') return;
    const left = leftPaneRef.current;
    const right = rightPaneRef.current;
    if (left && right) {
      const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight);
      left.scrollTop = percentage * (left.scrollHeight - left.clientHeight);
    }
  };

  // Fetch sidebar files list (with context filter)
  useEffect(() => {
    const fetchSidebarFiles = async () => {
      try {
        setNextCursor(null);
        setHasMore(false);
        
        // 1. Post context: filter files inside that specific post
        if (postId && spaceId) {
          const res = await fetch(`${api}/api/spaces/${spaceId}/posts`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const postsList = data.posts || [];
            const activePost = postsList.find((p: any) => String(p.id) === String(postId));
            const postAssets = activePost?.assets || [];
            const docAssets = postAssets.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
          }
        } 
        // 2. Space view context: filter files in that specific Space
        else if (spaceId) {
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
            setSidebarFiles(docAssets);
          }
        } 
        // 3. Binder / Document Project context
        else if (docProject) {
          const res = await fetch(`${api}/api/assets?limit=50&docProject=${encodeURIComponent(docProject)}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const itemsList = data.items || [];
            const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
          }
        } 
        // 4. Documents tab context
        else if (tabQuery === 'docs') {
          const res = await fetch(`${api}/api/assets?limit=50&type=doc`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const itemsList = data.items || [];
            const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
          }
        } 
        // 5. Default / Dashboard / Personal space context
        else {
          const res = await fetch(`${api}/api/assets?limit=50`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const itemsList = data.items || [];
            const docAssets = itemsList.filter((item: Asset) => !['image', 'video'].includes(item.type));
            setSidebarFiles(docAssets);
            setNextCursor(data.nextCursor || null);
            setHasMore(!!data.nextCursor);
          }
        }
      } catch (err) {
        console.error('Failed to fetch sidebar files:', err);
      }
    };
    fetchSidebarFiles();
  }, [tabQuery, spaceId, postId, docProject]);

  // Lazy load: fetch next page of sidebar files
  const loadMoreSidebarFiles = async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    try {
      setIsLoadingMore(true);
      let url = `${api}/api/assets?limit=50&cursor=${nextCursor}`;
      if (docProject) {
        url += `&docProject=${encodeURIComponent(docProject)}`;
      } else if (tabQuery === 'docs') {
        url += `&type=doc`;
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
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 200) {
      if (visibleLinesCount < highlightedLines.length) {
        setVisibleLinesCount(prev => Math.min(prev + 2000, highlightedLines.length));
      }
    }
  };

  // Context-aware URL click helper for sidebar switching
  const handleSidebarItemClick = (fileId: string) => {
    let url = `/doc-viewer?id=${fileId}`;
    if (tabQuery) url += `&tab=${tabQuery}`;
    if (spaceId) url += `&spaceId=${spaceId}`;
    if (postId) url += `&postId=${postId}`;
    if (docProject) url += `&docProject=${encodeURIComponent(docProject)}`;
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
        // 1. Fetch metadata
        const metadataRes = await fetch(`${api}/api/assets/${id}`, { credentials: 'include' });
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

          const contentRes = await fetch(`${api}/api/assets/_media/original/${id}`, { credentials: 'include' });
          if (!contentRes.ok) {
            throw new Error(`${t('viewer.errorFetchContent') || 'Failed to download raw file content'} (HTTP ${contentRes.status})`);
          }
          const text = await contentRes.text();

          if (category === 'markdown') {
            setMarkdownText(text);
            setOriginalMarkdown(text);
            const html = marked.parse(text);
            setPreviewHtml(html as string);
          } else {
            setCodeText(text);
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

  // Sync Markdown Live Preview
  useEffect(() => {
    if (markdownText) {
      const html = marked.parse(markdownText);
      setPreviewHtml(html as string);
    }
  }, [markdownText]);

  // Run mermaid render whenever HTML preview changes
  useEffect(() => {
    if (previewHtml) {
      try {
        mermaid.run({ querySelector: '.mermaid' });
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }
  }, [previewHtml]);

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
  const handleClose = () => {
    window.close();
  };

  // Reset editor text helper
  const handleReset = () => {
    if (markdownText !== originalMarkdown) {
      if (window.confirm(t('viewer.confirmReset') || 'Are you sure you want to revert all changes?')) {
        setMarkdownText(originalMarkdown);
      }
    }
  };

  // Export PDF helper
  const handlePrint = () => {
    window.print();
  };

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

  const category = asset ? docCategoryOf(asset) : 'other';

  // Compute highlighted code lines for formatting with line numbers
  const ext = asset ? (asset.ext || '').toLowerCase().replace(/^\./, '') : '';
  const validLang = ext && hljs.getLanguage(ext) ? ext : null;
  const highlightedHtml = codeText 
    ? (validLang ? hljs.highlight(codeText, { language: validLang }).value : hljs.highlightAuto(codeText).value)
    : '';
  const highlightedLines = highlightedHtml.split('\n');

  // Shared content sheet title/header renderer
  const renderContentHeader = () => {
    if (!asset) return null;
    return (
      <div className="docContentHeader no-print">
        <h1 className="docContentTitle">{asset.originalName}</h1>
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
      </div>
    );
  };

  return (
    <div className="docViewerContainer">
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
          {category === 'markdown' && (
            <span className="playgroundBadge">
              {t('viewer.sandboxMode') || 'Sandbox Mode'}
            </span>
          )}
        </div>

        <div className="headerRight">
          {category === 'markdown' && (
            <>
              <button className="btn" onClick={handleReset} disabled={markdownText === originalMarkdown}>
                {t('viewer.reset') || 'Reset'}
              </button>
              <button className="btn" onClick={() => handleCopy(markdownText)}>
                {isCopied ? (t('viewer.copiedSuccess') || '✓ Copied') : (t('viewer.copyRaw') || 'Copy')}
              </button>
              <button className="btn primary" onClick={handlePrint}>
                {t('viewer.exportPdf') || 'Export PDF'}
              </button>
            </>
          )}

          {['code', 'config', 'text'].includes(category) && (
            <button className="btn" onClick={() => handleCopy(codeText)}>
              {isCopied ? (t('viewer.copiedSuccess') || '✓ Copied') : (t('viewer.copyRaw') || 'Copy')}
            </button>
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
                  className={`fileItem ${file.id === asset.id ? 'active' : ''}`}
                  onClick={() => handleSidebarItemClick(file.id)}
                  title={file.originalName}
                >
                  <span className="fileItemIcon">
                    {fileCat === 'pdf' && '📕'}
                    {fileCat === 'markdown' && '📝'}
                    {['code', 'config', 'text'].includes(fileCat) && '💻'}
                    {fileCat === 'word' && '📄'}
                    {fileCat === 'excel' && '📊'}
                    {fileCat === 'powerpoint' && '📉'}
                    {fileCat === 'archive' && '📦'}
                    {!['pdf', 'markdown', 'code', 'config', 'text', 'word', 'excel', 'powerpoint', 'archive'].includes(fileCat) && '📎'}
                  </span>
                  <span className="fileItemName">{file.originalName}</span>
                </div>
              );
            })}
            {isLoadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              </div>
            )}
            {sidebarFiles.length === 0 && (
              <div style={{ padding: '16px', color: '#71717a', fontSize: '13px', textAlign: 'center' }}>
                {t('viewer.noFilesFound') || 'No files found'}
              </div>
            )}
          </div>
        </aside>

        <main className="viewerContent">
          {isLoading ? (
            <div className="centerOverlay" style={{ position: 'relative', height: '100%', minHeight: '300px' }}>
              <div className="spinner" />
              <div className="errorDesc">{t('viewer.loadingFile') || 'Loading file...'}</div>
            </div>
          ) : asset ? (
            <>
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
                  <div className="splitLayout">
                    <div className="leftPane no-print">
                      <textarea
                        ref={leftPaneRef}
                        className="editorInput"
                        value={markdownText}
                        onChange={(e) => setMarkdownText(e.target.value)}
                        onScroll={handleLeftScroll}
                        onMouseEnter={() => { activeScrollRef.current = 'left'; }}
                        onMouseLeave={() => { activeScrollRef.current = null; }}
                      />
                    </div>
                    <div 
                      ref={rightPaneRef}
                      className="rightPane"
                      onScroll={handleRightScroll}
                      onMouseEnter={() => { activeScrollRef.current = 'right'; }}
                      onMouseLeave={() => { activeScrollRef.current = null; }}
                    >
                      <div 
                        className="previewContainer markdown-body" 
                        dangerouslySetInnerHTML={{ __html: previewHtml }} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {['code', 'config', 'text'].includes(category) && (
                <div className="docContentWrapper">
                  {renderContentHeader()}
                  <div className="codeViewContainer">
                    <div className="codeContainer" style={{ display: 'flex', flexDirection: 'column' }} onScroll={handleCodeScroll}>
                      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                        <div className="lineNumbers">
                          {highlightedLines.slice(0, visibleLinesCount).map((_, i) => (
                            <div key={i} className="lineNo">{i + 1}</div>
                          ))}
                        </div>
                        <pre className="codePre">
                          <code>
                            {highlightedLines.slice(0, visibleLinesCount).map((line, i) => (
                              <div 
                                key={i} 
                                className="codeLine" 
                                dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} 
                              />
                            ))}
                          </code>
                        </pre>
                      </div>
                      {highlightedLines.length > visibleLinesCount && (
                        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', color: '#71717a', fontSize: '12px' }} className="no-print">
                          {t('viewer.loadingMoreLines') || 'Đang tải thêm...'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!['pdf', 'markdown', 'code', 'config', 'text'].includes(category) && (
                <div className="docContentWrapper">
                  {renderContentHeader()}
                  <div className="fallbackContainer">
                    <div className="fallbackCard">
                      <div className="fallbackIcon">
                        {category === 'word' && '📄'}
                        {category === 'excel' && '📊'}
                        {category === 'powerpoint' && '📉'}
                        {category === 'archive' && '📦'}
                        {category === 'ebook' && '📚'}
                        {category === 'database' && '🗄️'}
                        {category === 'installer' && '🤖'}
                        {category === 'disk-image' && '💿'}
                        {category === 'font' && '🔤'}
                        {category === 'design' && '🎨'}
                        {category === 'cad' && '📐'}
                        {category === 'executable' && '⚙️'}
                        {!['word', 'excel', 'powerpoint', 'archive', 'ebook', 'database', 'installer', 'disk-image', 'font', 'design', 'cad', 'executable'].includes(category) && '📎'}
                      </div>
                      <div className="fallbackName">{asset.originalName}</div>
                      <div className="fallbackMeta">
                        {category.toUpperCase()} · {fmtBytes(asset.size)}
                      </div>
                      <a 
                        href={`${api}/api/assets/_media/original/${asset.id}`} 
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
