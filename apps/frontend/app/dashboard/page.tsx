'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import SettingsModal from '../../components/SettingsModal';

// Interfaces & Types
interface Asset {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  owner: string;
  uploadedAt: string | null;
  takenAt: string | null;
  relPath: string;
  playRelPath: string | null;
  hlsRelPath: string | null;
  processingStatus: 'ready' | 'processing' | 'failed' | string;
  processingStartedAt: string | null;
  processingFinishedAt: string | null;
  ext: string;
  albumName: string | null;
  albumNames: string[];
  docProjectName: string | null;
  docProjectNames: string[];
  tags: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  type: 'image' | 'video' | 'file' | string;
}

interface User {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
  mustChangePassword: boolean;
  avatarUrl?: string;
}

interface Invitation {
  id: string;
  token: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Album {
  name: string;
  count: number;
}

interface Tag {
  name: string;
  count: number;
}

interface DocProject {
  name: string;
  count: number;
}

// Icons SVG đồng bộ (Phase 1)
const Icons = {
  Lock: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  LogOut: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Key: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  User: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
};

function getApiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function docTypeOf(item: Asset): string {
  if (item.ext?.trim()) return item.ext.toLowerCase();
  if (item.mime?.trim()) return `mime:${item.mime.toLowerCase()}`;
  return 'no-extension';
}

function docCategoryOf(item: Asset): 'pdf' | 'word' | 'excel' | 'powerpoint' | 'markdown' | 'text' | 'archive' | 'code' | 'other' {
  const ext = (item.ext || '').toLowerCase().replace(/^\./, '');
  const mime = (item.mime || '').toLowerCase();

  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('word') || mime.includes('officedocument.wordprocessingml')) return 'word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet')) return 'excel';
  if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) return 'powerpoint';
  if (['md', 'markdown'].includes(ext) || mime.includes('markdown')) return 'markdown';
  if (['txt', 'log'].includes(ext) || mime.startsWith('text/')) return 'text';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) return 'archive';
  if (['json', 'js', 'ts', 'py', 'java', 'kt', 'sql', 'yml', 'yaml', 'xml', 'html', 'css', 'sh'].includes(ext)) return 'code';
  return 'other';
}

const DOC_CATEGORY_LABELS: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel/CSV',
  powerpoint: 'PowerPoint',
  markdown: 'Markdown',
  text: 'Text',
  archive: 'Nén',
  code: 'Code',
  other: 'Khác',
};

function monthLabel(iso: string | null, lang: string): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' }).format(d);
}

function yearLabel(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return String(d.getFullYear());
}

function inferUploadKind(file: File): string {
  const t = (file?.type || '').toLowerCase();
  const name = (file?.name || '').toLowerCase();
  if (t.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|avif)$/.test(name)) return 'image';
  if (t.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/.test(name)) return 'video';
  return 'doc';
}

async function readErrorMessage(res: Response, translateFn: (key: string, replacements?: Record<string, string | number>) => string): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data?.message) return String(data.message);
    return JSON.stringify(data);
  } catch {
    try {
      const txt = await res.text();
      if (txt) return txt.slice(0, 300);
    } catch { }
  }
  return translateFn('messages.noDetailFromServer');
}

const LONG_PRESS_MS = 420;

interface SmartVideoProps {
  hlsSrc: string;
  mp4Src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  preload?: string;
  active?: boolean;
  onMeta?: (meta: { w: number; h: number }) => void;
}

function SmartVideo({ 
  hlsSrc, 
  mp4Src, 
  className, 
  controls = false, 
  autoPlay = false, 
  muted = false, 
  preload = 'metadata', 
  active = true, 
  onMeta 
}: SmartVideoProps): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);
  const [fallbackToMp4, setFallbackToMp4] = useState<boolean>(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let hls: any;
    let cancelled = false;

    async function setup() {
      console.log('[SmartVideo] Khởi tạo trình phát. hlsSrc:', hlsSrc, 'mp4Src:', mp4Src, 'fallbackToMp4:', fallbackToMp4);
      if (fallbackToMp4 || !hlsSrc) {
        console.log('[SmartVideo] Sử dụng nguồn MP4 trực tiếp:', mp4Src);
        el.src = mp4Src;
        return;
      }

      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[SmartVideo] Trình duyệt hỗ trợ HLS mặc định (Safari).');
        el.src = hlsSrc;
        return;
      }

      try {
        console.log('[SmartVideo] Đang tải hls.js...');
        const mod = await import('hls.js');
        const Hls = mod.default;
        if (!Hls.isSupported()) {
          console.warn('[SmartVideo] Trình duyệt không hỗ trợ hls.js. Fallback sang MP4.');
          el.src = mp4Src;
          return;
        }

        if (cancelled) return;
        console.log('[SmartVideo] hls.js được hỗ trợ. Khởi tạo instance Hls...');
        hls = new Hls({
          maxBufferLength: 120,
          maxMaxBufferLength: 300,
          backBufferLength: 90,
          enableWorker: true,
          startLevel: -1,
          xhrSetup: (xhr: XMLHttpRequest) => {
            xhr.withCredentials = true;
          }
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[SmartVideo] Hls: Đã kết nối media element.');
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
          console.log('[SmartVideo] Hls: Manifest đã được parse thành công. Các stream khả dụng:', data.levels);
        });

        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          console.error('[SmartVideo] Hls Lỗi:', data);
          if (data?.fatal) {
            console.warn('[SmartVideo] Hls gặp lỗi nghiêm trọng (fatal). Chuyển hướng sang MP4...');
            try { hls.destroy(); } catch { }
            setFallbackToMp4(true);
          }
        });

        hls.loadSource(hlsSrc);
        hls.attachMedia(el);
      } catch (err) {
        console.error('[SmartVideo] Lỗi nạp hls.js:', err);
        el.src = mp4Src;
      }
    }

    setup();

    return () => {
      cancelled = true;
      try { if (hls) hls.destroy(); } catch { }
    };
  }, [hlsSrc, mp4Src, fallbackToMp4]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active && autoPlay) {
      console.log('[SmartVideo] Kích hoạt autoPlay...');
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          console.warn('[SmartVideo] Trình duyệt chặn tự động phát (autoPlay blocked):', err.message);
        });
      }
    } else {
      el.pause();
    }
  }, [active, autoPlay]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof onMeta !== 'function') return;
    const onLoadedMeta = () => {
      console.log('[SmartVideo] Sự kiện loadedmetadata. Kích thước gốc:', el.videoWidth, 'x', el.videoHeight, 'Thời lượng:', el.duration);
      onMeta({ w: el.videoWidth || 0, h: el.videoHeight || 0 });
    };
    el.addEventListener('loadedmetadata', onLoadedMeta);
    return () => el.removeEventListener('loadedmetadata', onLoadedMeta);
  }, [onMeta]);

  return (
    <video
      ref={ref}
      className={className}
      controls={controls}
      muted={muted}
      preload={preload}
      playsInline
      crossOrigin="use-credentials"
      style={{ width: 'auto', height: 'calc(100% - 36px)', maxWidth: '100%', maxHeight: 'calc(100% - 36px)', objectFit: 'contain' }}
      onPlay={() => console.log('[SmartVideo] Native Event: play')}
      onPause={() => console.log('[SmartVideo] Native Event: pause')}
      onWaiting={() => console.log('[SmartVideo] Native Event: waiting')}
      onPlaying={() => console.log('[SmartVideo] Native Event: playing')}
      onCanPlay={() => console.log('[SmartVideo] Native Event: canplay')}
      onError={(e: any) => {
        const err = e.target.error;
        console.error('[SmartVideo] Native Event Lỗi:', err ? { code: err.code, message: err.message } : e);
        if (!fallbackToMp4) {
          console.warn('[SmartVideo] Trình phát gặp lỗi hệ thống. Đang tự động chuyển sang luồng MP4 tương thích...');
          setFallbackToMp4(true);
        }
      }}
    />
  );
}

export default function DashboardPage(): React.JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  const api = useMemo(() => getApiOrigin(), []);

  const [usage, setUsage] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const [tab, setTab] = useState<'photos' | 'docs'>('photos');
  const [search, setSearch] = useState<string>('');

  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState<boolean>(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumQuery, setAlbumQuery] = useState<string>('');
  const [selectedAlbumsForActive, setSelectedAlbumsForActive] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [selectedTagsForActive, setSelectedTagsForActive] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState<boolean>(false);
  const [tagQuery, setTagQuery] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');
  const [docCollectionView, setDocCollectionView] = useState<'all' | 'trash'>('all');
  const [docKindsExpanded, setDocKindsExpanded] = useState<boolean>(false);
  const [collectionView, setCollectionView] = useState<'all' | 'recent' | 'images' | 'videos' | 'trash'>('all');
  const [albumsExpanded, setAlbumsExpanded] = useState<boolean>(false);
  const [docProjects, setDocProjects] = useState<DocProject[]>([]);
  const [docProjectsExpanded, setDocProjectsExpanded] = useState<boolean>(false);
  const [selectedDocProject, setSelectedDocProject] = useState<string>('all');
  const [groupByTimeEnabled, setGroupByTimeEnabled] = useState<boolean>(false);
  const [groupMode, setGroupMode] = useState<'month' | 'year'>('month');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeMediaFit, setActiveMediaFit] = useState<string>('contain');

  // State và Handler cho đổi mật khẩu & logout phiên khác (Phase 1)
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);

  async function handleLogout() {
    try {
      await fetch(`${api}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.href = '/login';
    } catch (e) {
      setErr(t('messages.logoutFailed'));
    }
  }

  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const usageCardRef = useRef<HTMLDivElement>(null);

  const filteredAssets = useMemo(() => {
    let list = assets;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => (a.originalName || '').toLowerCase().includes(q) || (a.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    if (selectedFilterTags.length > 0) {
      list = list.filter((a) => selectedFilterTags.every((t) => (a.tags || []).includes(t)));
    }
    return list;
  }, [assets, search, selectedFilterTags]);

  const basePhotoAssets = useMemo(
    () => filteredAssets.filter((a) => a.type === 'image' || a.type === 'video'),
    [filteredAssets]
  );

  const recentCutoff = useMemo(() => Date.now() - 14 * 24 * 60 * 60 * 1000, []);

  const photoAssets = useMemo(() => {
    const activePhotos = basePhotoAssets.filter((a) => !a.isDeleted);
    const trashedPhotos = basePhotoAssets.filter((a) => a.isDeleted);

    if (collectionView === 'recent') {
      return activePhotos.filter((a) => new Date(a.uploadedAt || 0).getTime() >= recentCutoff);
    }
    if (collectionView === 'images') return activePhotos.filter((a) => a.type === 'image');
    if (collectionView === 'videos') return activePhotos.filter((a) => a.type === 'video');
    if (collectionView === 'trash') return trashedPhotos;
    return activePhotos;
  }, [basePhotoAssets, collectionView, recentCutoff]);

  const docs = useMemo(
    () => filteredAssets.filter((a) => a.type !== 'image' && a.type !== 'video' && !a.isDeleted),
    [filteredAssets]
  );

  const trashedDocs = useMemo(
    () => filteredAssets.filter((a) => a.type !== 'image' && a.type !== 'video' && a.isDeleted),
    [filteredAssets]
  );

  const docsBase = useMemo(() => (docCollectionView === 'trash' ? trashedDocs : docs), [docCollectionView, docs, trashedDocs]);

  const docTypes = useMemo(() => Array.from(new Set(docsBase.map(docTypeOf))).sort(), [docsBase]);

  const docsFiltered = useMemo(() => {
    let list = docsBase;
    if (selectedDocProject !== 'all') {
      list = list.filter((d) => (d.docProjectNames || []).includes(selectedDocProject) || d.docProjectName === selectedDocProject);
    }
    if (docCategoryFilter !== 'all') list = list.filter((d) => docCategoryOf(d) === docCategoryFilter);
    if (docTypeFilter !== 'all') list = list.filter((d) => docTypeOf(d) === docTypeFilter);
    return list;
  }, [docsBase, selectedDocProject, docCategoryFilter, docTypeFilter]);

  const docCategoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docsBase) {
      const c = docCategoryOf(d);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [docsBase]);

  const docsGrouped = useMemo(() => {
    const m = new Map<string, Asset[]>();
    for (const d of docsFiltered) {
      const key = DOC_CATEGORY_LABELS[docCategoryOf(d)] || 'Khác';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docsFiltered]);

  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');

  const availableAlbums = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of photoAssets) {
      if (!p.albumName) continue;
      m.set(p.albumName, (m.get(p.albumName) || 0) + 1);
    }
    return Array.from(m.entries());
  }, [photoAssets]);

  const albumFilteredPhotos = useMemo(() => {
    if (selectedAlbum === 'all') return photoAssets;
    return photoAssets.filter((p) => p.albumName === selectedAlbum);
  }, [photoAssets, selectedAlbum]);

  const photoGroups = useMemo<[string, Asset[]][]>(() => {
    if (!groupByTimeEnabled) return [['all', albumFilteredPhotos]];
    const m = new Map<string, Asset[]>();
    for (const p of albumFilteredPhotos) {
      const key = groupMode === 'year' ? yearLabel(p.takenAt || p.uploadedAt) : monthLabel(p.takenAt || p.uploadedAt, language);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return Array.from(m.entries());
  }, [albumFilteredPhotos, groupMode, groupByTimeEnabled, language]);

  const activeIndexInScope = activeIndex >= 0;
  const active = activeIndexInScope
    ? (tab === 'photos' ? albumFilteredPhotos[activeIndex] : docsFiltered[activeIndex])
    : null;

  useEffect(() => {
    if (!active) return;
    if (active.type === 'image') {
      const src = `${api}/api/assets/_media/original/${active.id}`;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 0;
        setActiveMediaFit(h > w ? 'contain-tall' : 'contain-wide');
      };
      img.src = src;
    } else {
      setActiveMediaFit('contain');
    }
  }, [active?.id, active?.type, api]);

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function togglePick(id: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  }

  function beginLongPress(id: string) {
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      suppressClickRef.current = id;
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, LONG_PRESS_MS);
  }

  function endLongPress() {
    clearLongPress();
  }

  async function loadData() {
    try {
      setErr('');

      const me = await fetch(`${api}/api/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        window.location.href = '/login';
        return;
      }
      const meData = await me.json();
      setUser(meData?.user);
      if (meData?.user?.mustChangePassword) {
        setMustChangePassword(true);
        setShowSettingsModal(true);
      }

      const [usageRes, assetsRes, projectsRes, tagsRes] = await Promise.all([
        fetch(`${api}/api/storage/usage`, { credentials: 'include' }),
        fetch(`${api}/api/assets?limit=1500&includeTrash=true`, { credentials: 'include' }),
        fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' }),
        fetch(`${api}/api/assets/tags`, { credentials: 'include' }),
      ]);
      if (!usageRes.ok || !assetsRes.ok || !projectsRes.ok || !tagsRes.ok) throw new Error(t('messages.apiErrorOrSessionExpired'));
      const usageData = await usageRes.json();
      const assetsData = await assetsRes.json();
      const projectsData = await projectsRes.json();
      const tagsData = await tagsRes.json();
      setUsage(usageData);
      setAssets(assetsData.items || []);
      setDocProjects(projectsData.items || []);
      setTags(tagsData.items || []);
    } catch (e: any) {
      setErr(e.message || t('messages.loadDataFailed'));
    }
  }

  useEffect(() => {
    loadData();
    loadAlbums();
  }, []);

  useEffect(() => {
    const hasProcessing = assets.some((a) => a.type === 'video' && a.processingStatus === 'processing');
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(timer);
  }, [assets, api]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleGlobalClick = () => setShowProfileMenu(false);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [showProfileMenu]);



  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (activeIndex < 0) return;
      if (e.key === 'Escape') {
        setActiveIndex(-1);
        setShowInfo(false);
        setShowAlbumPicker(false);
        setShowTagPicker(false);
      }
      const list = tab === 'photos' ? albumFilteredPhotos : docsFiltered;
      if (list.length === 0) return;
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i <= 0 ? list.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i >= list.length - 1 ? 0 : i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, albumFilteredPhotos.length, docsFiltered.length, tab]);

  async function uploadLargeFileByChunks(file: File, translateFn: (key: string, replacements?: Record<string, string | number>) => string) {
    const init = await fetch(`${api}/api/assets/upload-chunk/init`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, mime: file.type || 'application/octet-stream', totalSize: file.size, lastModified: file.lastModified }),
    });
    if (!init.ok) {
      const detail = await readErrorMessage(init, translateFn);
      throw new Error(translateFn('messages.chunkUploadInitFailed', { status: init.status, detail }));
    }
    const initData = await init.json();
    const uploadId = initData.uploadId;

    const CHUNK = 8 * 1024 * 1024; // 8MB/chunk
    const totalChunks = Math.ceil(file.size / CHUNK);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK;
      const end = Math.min(file.size, start + CHUNK);
      const blob = file.slice(start, end);
      const fd = new FormData();
      fd.append('chunk', blob, `${file.name}.part`);
      fd.append('index', String(i));

      const r = await fetch(`${api}/api/assets/upload-chunk/${uploadId}`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!r.ok) {
        const detail = await readErrorMessage(r, translateFn);
        throw new Error(translateFn('messages.chunkUploadPartFailed', { index: i + 1, total: totalChunks, status: r.status, detail }));
      }
    }

    const done = await fetch(`${api}/api/assets/upload-chunk/${uploadId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!done.ok) {
      const detail = await readErrorMessage(done, translateFn);
      throw new Error(translateFn('messages.chunkUploadCompleteFailed', { status: done.status, detail }));
    }
    return done.json();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const failed = [];
    let done = 0;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const kindCode = inferUploadKind(file);
      const kind = kindCode === 'image' ? t('messages.kindImage') : kindCode === 'video' ? t('messages.kindVideo') : t('messages.kindDoc');
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const big = file.size > 90 * 1024 * 1024; // >90MB dùng chunk tránh Cloudflare limit

      try {
        setMsg(t('messages.uploadingDetail', {
          done,
          total: files.length,
          index: idx + 1,
          name: file.name,
          kind,
          size: sizeMb,
          mode: big ? t('messages.uploadModeChunk') : t('messages.uploadModeNormal')
        }));

        if (big) {
          await uploadLargeFileByChunks(file, t);
        } else {
          const form = new FormData();
          form.append('files', file);
          form.append('lastModified', String(file.lastModified));
          const r = await fetch(`${api}/api/assets/upload`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          });
          if (!r.ok) {
            const detail = await readErrorMessage(r, t);
            throw new Error(`Upload failed (HTTP ${r.status}): ${detail}`);
          }
          await r.json();
        }

        done += 1;
        setMsg(t('messages.uploadSuccessDetail', { name: file.name, kind, done, total: files.length }));
      } catch (ex: any) {
        const reason = ex?.message || 'unknown';
        failed.push({ index: idx + 1, name: file.name, kind, sizeMb, mode: big ? t('messages.uploadModeChunk') : t('messages.uploadModeNormal'), reason });
        setMsg(t('messages.uploadErrorDetail', { index: idx + 1, total: files.length, name: file.name, kind, reason }));
      }
    }

    await loadData();
    e.target.value = '';

    if (failed.length === 0) {
      setMsg(t('messages.uploadDone', { done, total: files.length }));
      return;
    }

    const lines = failed.map((f) => `- #${f.index} ${f.name} | ${f.kind} | ${f.sizeMb}MB | ${f.mode} | ${f.reason}`);
    setErr(`${t('messages.uploadHasErrors', { failed: failed.length, total: files.length })}:\n${lines.join('\n')}`);
    setMsg(t('messages.uploadDoneWithErrors', { done, total: files.length, failed: failed.length }));
  }

  async function moveSelectedToTrash() {
    if (!selectedIds.length) return;
    try {
      const r = await fetch(`${api}/api/assets/bulk/trash`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error(t('messages.deleteFailed'));
      const data = await r.json();
      setMsg(t('messages.trashedCount', { count: data.updated || 0 }));
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData();
    } catch (e: any) {
      setMsg(t('messages.deleteError', { error: e.message || 'unknown' }));
    }
  }

  async function restoreSelectedFromTrash() {
    if (!selectedIds.length) return;
    try {
      const r = await fetch(`${api}/api/assets/bulk/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error(t('messages.restoreFailed'));
      const data = await r.json();
      setMsg(t('messages.restoredCount', { count: data.updated || 0 }));
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData();
    } catch (e: any) {
      setMsg(t('messages.restoreError', { error: e.message || 'unknown' }));
    }
  }

  async function purgeSelectedForever() {
    if (!selectedIds.length) return;
    const ok = window.confirm(t('dialogs.deleteForeverConfirm', { count: selectedIds.length }));
    if (!ok) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/purge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error(t('messages.purgeFailed'));
      const data = await r.json();
      setMsg(t('messages.purgedCount', { count: data.removed || 0 }));
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData();
    } catch (e: any) {
      setMsg(t('messages.purgeError', { error: e.message || 'unknown' }));
    }
  }

  async function addSelectedToAlbum() {
    if (!selectedIds.length) return;
    const name = window.prompt(t('viewer.newAlbumPrompt'));
    if (!name || !name.trim()) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/album`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, albumName: name.trim() }),
      });
      if (!r.ok) throw new Error(t('messages.albumAddFailed'));
      const data = await r.json();
      setMsg(t('messages.addedToAlbumCount', { count: data.updated || 0, name: name.trim() }));
      await loadData();
    } catch (e: any) {
      setMsg(t('messages.albumError', { error: e.message || 'unknown' }));
    }
  }

  async function addSelectedToDocProject() {
    if (!selectedIds.length) return;
    const name = window.prompt(t('messages.projectPrompt'));
    if (!name || !name.trim()) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/doc-project`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, projectName: name.trim() }),
      });
      if (!r.ok) throw new Error(t('messages.projectAddFailed'));
      const data = await r.json();
      setMsg(t('messages.addedToProjectCount', { count: data.updated || 0, name: name.trim() }));
      await loadData();
      await loadDocProjects();
    } catch (e: any) {
      setMsg(t('messages.projectError', { error: e.message || 'unknown' }));
    }
  }

  async function loadAlbums() {
    try {
      const r = await fetch(`${api}/api/assets/albums`, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.errorLoadAlbum'));
      const data = await r.json();
      setAlbums(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDocProjects() {
    try {
      const r = await fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.errorLoadDocProjects'));
      const data = await r.json();
      setDocProjects(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  function toggleAlbumSelection(name: string) {
    setSelectedAlbumsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewAlbumInSelection(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setSelectedAlbumsForActive((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setAlbums((prev) => {
      if (prev.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  }

  async function saveActiveAlbums() {
    if (!active?.id) return;
    try {
      const r = await fetch(`${api}/api/assets/${active.id}/albums`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumNames: selectedAlbumsForActive }),
      });
      if (!r.ok) throw new Error(t('viewer.albumUpdateFailed'));
      await loadData();
      await loadAlbums();
      setShowAlbumPicker(false);
      setMsg(t('viewer.albumUpdateSuccess'));
    } catch (e: any) {
      setMsg(t('viewer.albumSaveError', { error: e.message }));
    }
  }

  async function loadTags() {
    try {
      const r = await fetch(`${api}/api/assets/tags`, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.tagsLoadFailed'));
      const data = await r.json();
      setTags(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  function toggleTagSelection(name: string) {
    setSelectedTagsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewTagInSelection(name: string) {
    const trimmed = (name || '').trim().toLowerCase();
    if (!trimmed) return;
    setSelectedTagsForActive((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setTags((prev) => {
      if (prev.some((tVal) => tVal.name.toLowerCase() === trimmed)) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  }

  async function saveActiveTags() {
    if (!active?.id) return;
    try {
      const r = await fetch(`${api}/api/assets/${active.id}/tags`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: selectedTagsForActive }),
      });
      if (!r.ok) throw new Error(t('viewer.tagsUpdateFailed'));
      await loadData();
      await loadTags();
      setShowTagPicker(false);
      setMsg(t('viewer.tagsUpdateSuccess'));
    } catch (e: any) {
      setMsg(t('viewer.tagsSaveError', { error: e.message }));
    }
  }

  function toggleFilterTag(name: string) {
    setSelectedFilterTags((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function docIconOf(item: Asset): string {
    const ext = (item.originalName || '').split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return '📕';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
    if (['txt', 'md', 'json'].includes(ext)) return '📝';
    return '📄';
  }

  function openPhoto(id: string) {
    const idx = albumFilteredPhotos.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function openDoc(id: string) {
    const idx = docsFiltered.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function cardHandlers(item: Asset, onNormalClick?: () => void) {
    return {
      onMouseDown: () => beginLongPress(item.id),
      onMouseUp: endLongPress,
      onMouseLeave: endLongPress,
      onTouchStart: () => beginLongPress(item.id),
      onTouchEnd: endLongPress,
      onClick: () => {
        if (suppressClickRef.current === item.id) {
          suppressClickRef.current = null;
          return;
        }
        if (selectionMode) togglePick(item.id);
        else onNormalClick?.();
      },
    };
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebarMenu">
          <div className="logo">AetherCloud</div>

        <button className={`navItem ${tab === 'photos' && collectionView === 'all' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum('all'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">🖼</span><span>{t('sidebar.allPhotosVideos')}</span><span className="count">{basePhotoAssets.filter((x) => !x.isDeleted).length}</span>
        </button>

        <button className={`navItem ${tab === 'docs' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('all'); setDocCategoryFilter('all'); setSelectedDocProject('all'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">📁</span><span>{t('sidebar.documents')}</span><span className="count">{docs.length}</span>
        </button>

        <div className="sectionWrap">
          <div className="sectionTitle">{tab === 'photos' ? t('sidebar.collectionsTitle') : t('sidebar.docsAreaTitle')}</div>

          {tab === 'photos' ? (
            <div className="sectionBody sectionIn">
              <button
                className={`navItem ${albumsExpanded ? 'active' : ''}`}
                onClick={() => setAlbumsExpanded((v) => !v)}
              >
                <span className="ico">🗂</span>
                <span>{t('sidebar.albumsTitle')}</span>
                <span className="chev">{albumsExpanded ? '▾' : '▸'}</span>
              </button>

              {albumsExpanded && (
                <div className="subList">
                  <button className={`subItem ${selectedAlbum === 'all' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum('all'); }}>
                    {t('sidebar.all')}
                  </button>
                  {availableAlbums.length === 0 && <div className="subHint">{t('sidebar.noManualAlbums')}</div>}
                  {availableAlbums.map(([name, count]) => (
                    <button key={name} className={`subItem ${selectedAlbum === name ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum(name); }}>
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}

              <button className={`navItem ${tab === 'photos' && collectionView === 'recent' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('recent'); setSelectedAlbum('all'); }}>
                <span className="ico">🕒</span><span>{t('sidebar.recentlyAdded')}</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'images' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('images'); setSelectedAlbum('all'); }}>
                <span className="ico">🖼</span><span>{t('sidebar.imagesOnly')}</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'videos' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('videos'); setSelectedAlbum('all'); }}>
                <span className="ico">🎬</span><span>{t('sidebar.videosOnly')}</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'trash' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('trash'); setSelectedAlbum('all'); }}>
                <span className="ico">🗑</span><span>{t('sidebar.trashBin')}</span><span className="count">{basePhotoAssets.filter((x) => x.isDeleted).length}</span>
              </button>
            </div>
          ) : (
            <div className="sectionBody sectionIn">
              <button className={`navItem ${tab === 'docs' && docCollectionView === 'all' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('all'); setSelectionMode(false); setSelectedIds([]); }}>
                <span className="ico">📄</span><span>{t('sidebar.docsActive')}</span><span className="count">{docs.length}</span>
              </button>
              <button className={`navItem ${tab === 'docs' && docCollectionView === 'trash' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('trash'); setSelectionMode(false); setSelectedIds([]); }}>
                <span className="ico">🗑</span><span>{t('sidebar.docsTrash')}</span><span className="count">{trashedDocs.length}</span>
              </button>

              <button className={`navItem ${docProjectsExpanded ? 'active' : ''}`} onClick={() => setDocProjectsExpanded((v) => !v)}>
                <span className="ico">📚</span><span>{t('sidebar.docProjectsTitle')}</span><span className="chev">{docProjectsExpanded ? '▾' : '▸'}</span>
              </button>
              {docProjectsExpanded && (
                <div className="subList">
                  <button className={`subItem ${selectedDocProject === 'all' ? 'active' : ''}`} onClick={() => setSelectedDocProject('all')}>{t('sidebar.allProjects')}</button>
                  {docProjects.length === 0 && <div className="subHint">{t('sidebar.noDocProjects')}</div>}
                  {docProjects.map((p) => (
                    <button key={p.name} className={`subItem ${selectedDocProject === p.name ? 'active' : ''}`} onClick={() => setSelectedDocProject(p.name)}>
                      {p.name} ({p.count})
                    </button>
                  ))}
                </div>
              )}

              <button className={`navItem ${docCategoryFilter === 'all' ? 'active' : ''}`} onClick={() => setDocCategoryFilter('all')}>
                <span className="ico">🧩</span><span>{t('sidebar.allDocTypes')}</span><span className="count">{docsBase.length}</span>
              </button>

              {['pdf', 'excel', 'word', 'markdown', 'text'].map((k) => (
                <button key={k} className={`navItem ${docCategoryFilter === k ? 'active' : ''}`} onClick={() => setDocCategoryFilter(k)}>
                  <span className="ico">{k === 'pdf' ? '📕' : k === 'excel' ? '📊' : k === 'word' ? '📝' : k === 'markdown' ? '🔤' : '📄'}</span>
                  <span>{t('categories.' + k)}</span>
                  <span className="count">{docCategoryCounts.get(k) || 0}</span>
                </button>
              ))}

              <button className={`navItem ${docTypeFilter === 'all' && docKindsExpanded ? 'active' : ''}`} onClick={() => setDocKindsExpanded((v) => !v)}>
                <span className="ico">🗂</span><span>{t('sidebar.showAllDocTypes')}</span><span className="chev">{docKindsExpanded ? '▾' : '▸'}</span>
              </button>

              {docKindsExpanded && (
                <div className="subList">
                  {docTypes.map((t) => (
                    <button key={t} className={`subItem ${docTypeFilter === t ? 'active' : ''}`} onClick={() => setDocTypeFilter(t)}>
                      {t}
                    </button>
                  ))}
                  <button className={`subItem ${docTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setDocTypeFilter('all')}>
                    {t('sidebar.clearSpecificFilter')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tagsSection">
          <div className="tagsHeader">{t('sidebar.tagsTitle')}</div>
          {tags.length === 0 ? (
            <div className="subHint">{t('sidebar.noTags')}</div>
          ) : (
            <div className="tagCloud">
              {tags.map((t) => {
                const isActive = selectedFilterTags.includes(t.name);
                return (
                  <button key={t.name} className={`tagChip ${isActive ? 'active' : ''}`} onClick={() => toggleFilterTag(t.name)}>
                    <span className="name">#{t.name}</span>
                    <span className="count">{t.count}</span>
                  </button>
                );
              })}
              {selectedFilterTags.length > 0 && (
                <button className="tagChipClear" onClick={() => setSelectedFilterTags([])}>{t('sidebar.clearFilter')}</button>
              )}
            </div>
          )}
        </div>
        </div>

        <div className="storageCard" ref={usageCardRef}>
          <div className="label">{t('sidebar.storageTitle')}</div>
          {usage ? (
            <>
              {(() => {
                const appUsed = (usage.breakdown?.originalsBytes || 0) + (usage.breakdown?.derivedBytes || 0) + (usage.breakdown?.trashBytes || 0);
                const appPercent = usage.totalBytes > 0 ? Number(((appUsed / usage.totalBytes) * 100).toFixed(4)) : 0;
                return (
                  <>
                    <div className="row"><span>{t('sidebar.storageUsed')}</span><b>{fmtBytes(appUsed)}</b></div>
                    <div className="row"><span>{t('sidebar.totalDisk')}</span><b>{fmtBytes(usage.totalBytes)}</b></div>
                    <div className="bar"><div className="barFill" style={{ width: `${Math.min(100, appPercent)}%` }} /></div>
                    <small>AetherCloud: {appPercent}% · Filesystem: {usage.usedPercent}%</small>
                    {Number(usage.processingCount || 0) > 0 && <small>{t('sidebar.processingMedia', { count: usage.processingCount })}</small>}
                  </>
                );
              })()}
            </>
          ) : <small>{t('sidebar.loading')}</small>}
        </div>

        <div className="profileSection" onClick={(e) => e.stopPropagation()}>
          <div className="profileBtn" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
            <div className="profileAvatar">
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profileMeta">
              <div className="profileName">{user ? (user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })) : t('sidebar.loading')}</div>
              <div className="profileRole">{user ? (user.role === 'admin' ? t('profile.admin') : t('profile.member')) : ''}</div>
            </div>
            <div className="profileChevron">▾</div>
          </div>
          
          {showProfileMenu && user && (
            <div className="profilePopover" onClick={(e) => e.stopPropagation()}>
              <div className="popoverUserHeader">
                <div className="popoverUserEmail">{user.email}</div>
                <div className="popoverUserAvatar">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="avatarImg" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="popoverUserName">{user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })}</div>
                <div className="popoverUserBadge">
                  {user.role === 'admin' ? t('profile.admin') : t('profile.member')}
                </div>
              </div>
              <hr className="popoverDivider" />
              <button className="popoverItem" onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}>
                <span className="popoverIcon"><Icons.Settings /></span>
                <span>{t('profile.settings')}</span>
              </button>
              <button className="popoverItem" onClick={() => { handleLogout(); setShowProfileMenu(false); }}>
                <span className="popoverIcon"><Icons.LogOut /></span>
                <span>{t('profile.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <input className="search" placeholder={t('topbar.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="actions">
            <label className="uploadBtn">
              {t('actions.upload')}
              <input type="file" multiple onChange={onUpload} hidden />
            </label>

            <button className="ghost" onClick={() => { setSelectionMode((v) => !v); if (selectionMode) setSelectedIds([]); }}>
              {selectionMode ? t('actions.exitSelect', { count: selectedIds.length }) : t('actions.selectMultiple')}
            </button>

            {selectionMode && selectedIds.length > 0 && (
              <>
                {(tab === 'photos' && collectionView !== 'trash') || (tab === 'docs' && docCollectionView !== 'trash') ? (
                  <>
                    {tab === 'photos' && <button className="ghost" onClick={addSelectedToAlbum}>{t('actions.addToAlbum')}</button>}
                    {tab === 'docs' && <button className="ghost" onClick={addSelectedToDocProject}>{t('actions.addToProject')}</button>}
                    <button className="danger" onClick={moveSelectedToTrash}>{t('actions.delete')}</button>
                  </>
                ) : (
                  <>
                    <button className="ghost" onClick={restoreSelectedFromTrash}>{t('actions.restore')}</button>
                    <button className="danger" onClick={purgeSelectedForever}>{t('actions.deleteForever')}</button>
                  </>
                )}
              </>
            )}
          </div>
        </header>

        {msg && <div className="info">{msg}</div>}
        {err && <div className="error">{err}</div>}

        {tab === 'photos' && (
          <section className="contentPane">
            <div className="groupToggleWrap">
              <button className={`chip ${groupByTimeEnabled ? 'active' : ''}`} onClick={() => setGroupByTimeEnabled((v) => !v)}>
                {groupByTimeEnabled ? t('dashboard.toggleGroupOff') : t('dashboard.toggleGroupOn')}
              </button>
              {groupByTimeEnabled && (
                <>
                  <span className="groupLabel">{t('dashboard.groupBy')}:</span>
                  <button className={`chip ${groupMode === 'month' ? 'active' : ''}`} onClick={() => setGroupMode('month')}>{t('dashboard.groupMonth')}</button>
                  <button className={`chip ${groupMode === 'year' ? 'active' : ''}`} onClick={() => setGroupMode('year')}>{t('dashboard.groupYear')}</button>
                </>
              )}
            </div>

            {collectionView === 'recent' && <div className="hint">{t('dashboard.recentHint')}</div>}
            {collectionView === 'trash' && <div className="hint">{t('dashboard.trashHint')}</div>}

            {photoGroups.length === 0 && <div className="hint">{t('dashboard.noDataMatching')}</div>}

            {photoGroups.map(([group, items]) => {
              const isOpen = expandedGroups[group] ?? true;
              return (
                <div key={group} className="monthBlock">
                  {groupByTimeEnabled && (
                    <button className="groupHeader" onClick={() => toggleGroup(group)}>
                      <span className={`groupHeaderChevron ${isOpen ? 'open' : ''}`}>▸</span>
                      <span>{group}</span>
                      <span className="groupCount">{items.length}</span>
                    </button>
                  )}

                  <div className={`gridCollapseWrapper ${isOpen ? 'open' : ''}`}>
                    <div className="gridCollapseWrapperInner">
                      <div className="grid">
                        {items.map((a, idx) => {
                          const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                          const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                          const picked = selectedIds.includes(a.id);
                          return (
                            <div key={a.id} className={`tile ${picked ? 'picked' : ''} ${a.processingStatus === 'processing' ? 'tileProcessing' : ''}`} {...cardHandlers(a, () => openPhoto(a.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
                              {a.type === 'image' ? (
                                <img src={srcOriginal} alt={a.originalName} className="thumb" />
                              ) : (
                                a.processingStatus === 'processing' ? (
                                  <div className="processingPlaceholder">
                                    <div className="pulseLoader" />
                                    <span className="processingText">Đang xử lý...</span>
                                  </div>
                                ) : (
                                  <video src={srcPlay} className="thumb" muted preload="metadata" />
                                )
                              )}
                              <div className="caption">{a.originalName}</div>
                              {picked && <div className="badge">✓</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {tab === 'docs' && (
          <section className="contentPane">
            <div className="docFilters">
              <span>{t('dashboard.specificType')}:</span>
              <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}>
                <option value="all">{t('sidebar.all')}</option>
                {docTypes.map((tVal) => <option key={tVal} value={tVal}>{tVal}</option>)}
              </select>
              {selectedDocProject !== 'all' && <span className="chip active">Project: {selectedDocProject}</span>}
            </div>

            {docCollectionView === 'trash' && <div className="hint">{t('dashboard.docsTrashHint')}</div>}
            {docsGrouped.length === 0 && <div className="hint">{t('dashboard.noDocsMatching')}</div>}

            {docsGrouped.map(([group, items]) => (
              <div key={group} className="docGroup">
                <div className="monthTitle">{group} · {items.length}</div>
                <div className="docGrid">
                  {items.map((d, idx) => {
                    const picked = selectedIds.includes(d.id);
                    return (
                      <div key={d.id} className={`docCard ${picked ? 'picked' : ''}`} {...cardHandlers(d, () => openDoc(d.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
                        <div className="docName">{d.originalName}</div>
                        <div className="docMeta">{fmtBytes(d.size)} · {d.mime || 'unknown'}</div>
                        {picked && <div className="badge">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {active && (
        <div className="viewer" onClick={() => { setActiveIndex(-1); setShowInfo(false); setShowAlbumPicker(false); setShowTagPicker(false); }}>
          <button className="nav left" onClick={(e) => { e.stopPropagation(); const list = tab === 'photos' ? albumFilteredPhotos : docsFiltered; if (list.length > 0) setActiveIndex((i) => (i <= 0 ? list.length - 1 : i - 1)); }}>‹</button>
          <div className={`stage ${activeMediaFit === 'contain-tall' ? 'stageTall' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="stageTitle">{active.originalName}</div>
            {active.type === 'image' && (
              <img key={active.id} src={`${api}/api/assets/_media/original/${active.id}`} alt={active.originalName} className={`full mediaEnter ${activeMediaFit}`} />
            )}
            {active.type === 'video' && (
              active.processingStatus === 'processing' ? (
                <div className="videoProcessingOverlay mediaEnter">
                  <div className="loadingSpinner" />
                  <div className="overlayTitle">{t('viewer.videoOptimizing')}</div>
                  <div className="overlayDesc">{t('viewer.videoOptimizingDesc')}</div>
                  <a href={`${api}/api/assets/_media/original/${active.id}`} download={active.originalName} className="downloadOriginalBtn" onClick={(e) => e.stopPropagation()}>
                    <span>{t('viewer.downloadOriginal')}</span>
                    <span>↓</span>
                  </a>
                </div>
              ) : (
                <SmartVideo
                  key={active.id}
                  hlsSrc={`${api}/api/assets/_media/hls/${active.id}/master.m3u8?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
                  mp4Src={`${api}/api/assets/_media/play/${active.id}?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
                  controls
                  autoPlay
                  className={`full mediaEnter ${activeMediaFit}`}
                  preload="auto"
                  active
                  onMeta={({ w, h }) => setActiveMediaFit(h > w ? 'contain-tall' : 'contain-wide')}
                />
              )
            )}
            {active.type !== 'image' && active.type !== 'video' && (
              <div className="docPreviewBlock mediaEnter">
                <div className="docIcon">{docIconOf(active)}</div>
                <div className="docName">{active.originalName}</div>
                <a href={`${api}/api/assets/_media/original/${active.id}`} target="_blank" rel="noreferrer" className="ghost" style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span>{t('viewer.openDoc')}</span>
                  <span>↗</span>
                </a>
              </div>
            )}
          </div>
          <button className="nav right" onClick={(e) => { e.stopPropagation(); const list = tab === 'photos' ? albumFilteredPhotos : docsFiltered; if (list.length > 0) setActiveIndex((i) => (i >= list.length - 1 ? 0 : i + 1)); }}>›</button>
          <button className="topBtn infoBtn" onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}>i</button>
          {active.type !== 'file' && (
            <button className="topBtn albumBtn" onClick={async (e) => {
              e.stopPropagation();
              try {
                await loadAlbums();
                if (!showAlbumPicker && active) {
                  const current = active.albumNames || (active.albumName ? [active.albumName] : []);
                  setSelectedAlbumsForActive(current);
                }
                setShowAlbumPicker((v) => !v);
                setShowTagPicker(false);
              } catch (er) {
                setMsg(t('viewer.errorLoadAlbum'));
              }
            }}>＋</button>
          )}
          <button className="topBtn tagBtn" onClick={async (e) => {
            e.stopPropagation();
            try {
              await loadTags();
              if (!showTagPicker && active) {
                setSelectedTagsForActive(active.tags || []);
              }
              setShowTagPicker((v) => !v);
              setShowAlbumPicker(false);
            } catch (er) {
              setMsg(t('viewer.errorLoadTags'));
            }
          }}>🏷</button>
          <button className="close" onClick={(e) => { e.stopPropagation(); setActiveIndex(-1); setShowInfo(false); setShowAlbumPicker(false); setShowTagPicker(false); }}>✕</button>

          {showInfo && active && (
            <div className="infoPanel" onClick={(e) => e.stopPropagation()}>
              <div><b>{active.originalName}</b></div>
              <div>{t('details.format')}: {active.mime}</div>
              <div>{t('details.size')}: {fmtBytes(active.size)}</div>
              <div>{t('details.createdAt')}: {active.takenAt || '-'}</div>
              <div>Upload: {active.uploadedAt || '-'}</div>
              {active.type !== 'file' && <div>Album: {(active.albumNames || []).join(', ') || '-'}</div>}
              <div>Tags: {(active.tags || []).map(tVal => `#${tVal}`).join(', ') || '-'}</div>
            </div>
          )}

          {showAlbumPicker && (
            <div className="albumPanel" onClick={(e) => e.stopPropagation()}>
              <input className="albumSearch" placeholder={t('viewer.searchAlbumPlaceholder')} value={albumQuery} onChange={(e) => setAlbumQuery(e.target.value)} />
              <button className="albumCreate" onClick={() => createNewAlbumInSelection(albumQuery || window.prompt(t('viewer.newAlbumPrompt')) || '')}>+ {t('viewer.createNewAlbum')}</button>
              <div className="albumList">
                {albums.filter((a) => a.name.toLowerCase().includes(albumQuery.toLowerCase())).map((a) => {
                  const isSelected = selectedAlbumsForActive.includes(a.name);
                  return (
                    <button key={a.name} className={`albumItem ${isSelected ? 'selected' : ''}`} onClick={() => toggleAlbumSelection(a.name)}>
                      <span className="chk">{isSelected ? '✓' : ''}</span>
                      <span>{a.name}</span>
                      <span className="cnt">({a.count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="albumActions">
                <button className="albumBtnSave" onClick={saveActiveAlbums}>{t('actions.save')}</button>
                <button className="albumBtnCancel" onClick={() => setShowAlbumPicker(false)}>{t('actions.cancel')}</button>
              </div>
            </div>
          )}

          {showTagPicker && (
            <div className="tagPanel" onClick={(e) => e.stopPropagation()}>
              <input className="tagSearch" placeholder={t('viewer.searchOrCreateTagPlaceholder')} value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
              <button className="tagCreate" onClick={() => createNewTagInSelection(tagQuery || window.prompt(t('viewer.newTagPrompt')) || '')}>+ {t('viewer.createNewTag')}</button>
              <div className="tagList">
                {tags.filter((tVal) => tVal.name.toLowerCase().includes(tagQuery.toLowerCase())).map((tVal) => {
                  const isSelected = selectedTagsForActive.includes(tVal.name);
                  return (
                    <button key={tVal.name} className={`tagItem ${isSelected ? 'selected' : ''}`} onClick={() => toggleTagSelection(tVal.name)}>
                      <span className="chk">{isSelected ? '✓' : ''}</span>
                      <span>#{tVal.name}</span>
                      <span className="cnt">({tVal.count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="tagActions">
                <button className="tagBtnSave" onClick={saveActiveTags}>{t('actions.save')}</button>
                <button className="tagBtnCancel" onClick={() => setShowTagPicker(false)}>{t('actions.cancel')}</button>
              </div>
            </div>
          )}
        </div>
      )}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        setUser={setUser}
        mustChangePassword={mustChangePassword}
        setMustChangePassword={setMustChangePassword}
        setMsg={setMsg}
        setErr={setErr}
        api={api}
      />

      <style jsx>{`
        /* An spin-button (mui ten tang giam) cua input type="number" */
        :global(input::-webkit-outer-spin-button),
        :global(input::-webkit-inner-spin-button) {
          -webkit-appearance: none;
          margin: 0;
        }
        :global(input[type="number"]) {
          -moz-appearance: textfield;
        }

        .shell {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
          background: #09090b;
          color: #f4f4f5;
        }
        .sidebar {
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          background: rgba(15, 15, 18, 0.7);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .logo {
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          padding-left: 8px;
        }
        .navItem {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          border: 0;
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 4px;
          background: transparent;
          color: #a1a1aa;
          cursor: pointer;
          font-family: inherit;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .navItem:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #f4f4f5;
          transform: translateX(2px);
        }
        .navItem.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .ico {
          font-size: 16px;
          width: 20px;
          display: inline-flex;
          justify-content: center;
          opacity: 0.9;
        }
        .count {
          margin-left: auto;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .navItem.active .count {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .chev {
          margin-left: auto;
          opacity: .6;
          font-size: 10px;
          transition: transform 0.2s ease;
        }
        .sectionWrap {
          margin-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 16px;
        }
        .sectionTitle {
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #71717a;
          text-transform: uppercase;
          padding-left: 8px;
        }
        .sectionBody {
          animation: sectionSlideIn .25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .subList {
          margin: 4px 0 8px 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          padding-left: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: listSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
          transform-origin: top;
        }
        .subItem {
          width: 100%;
          text-align: left;
          border: 0;
          background: transparent;
          color: #71717a;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .subItem:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #e4e4e7;
        }
        .subItem.active {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .subHint {
          font-size: 11px;
          color: #71717a;
          padding: 6px 10px;
          font-style: italic;
        }
        .sidebarMenu {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          scrollbar-width: none;
        }
        .sidebarMenu::-webkit-scrollbar {
          display: none;
        }
        .storageCard {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 12px;
        }
        .profileSection {
          margin-top: auto;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          padding-top: 12px;
        }
        .profileBtn {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
        }
        .profileBtn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .profileAvatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
        }
        .profileMeta {
          flex: 1;
          min-width: 0;
        }
        .profileName {
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profileRole {
          font-size: 11px;
          color: #71717a;
          margin-top: 2px;
        }
        .profileChevron {
          color: #71717a;
          font-size: 12px;
        }
        .profilePopover {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          width: 250px;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 14px;
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.7);
          z-index: 100;
          padding: 20px 16px 12px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }
        .popoverUserHeader {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          text-align: center;
        }
        .popoverUserEmail {
          font-size: 11px;
          color: #71717a;
          margin-bottom: 14px;
          word-break: break-all;
          width: 100%;
        }
        .popoverUserAvatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 22px;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        .avatarImg {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .popoverUserName {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .popoverUserBadge {
          font-size: 10.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 99px;
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
          display: inline-block;
          margin-bottom: 14px;
        }
        .popoverDivider {
          border: 0;
          height: 1px;
          background: #27272a;
          margin: 10px 0;
          width: 100%;
        }
        .popoverItem {
          width: 100%;
          background: transparent;
          border: 0;
          padding: 10px 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #e4e4e7;
          font-size: 13.5px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
          box-sizing: border-box;
        }
        .popoverItem:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .popoverIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #71717a;
        }
        .popoverItem:hover .popoverIcon {
          color: #fff;
        }
        .popoverLangSelect {
          display: flex;
          gap: 6px;
          width: 100%;
          padding: 8px 12px 2px 12px;
          box-sizing: border-box;
          justify-content: center;
        }
        .popoverLangBtn {
          flex: 1;
          background: transparent;
          border: 1px solid #27272a;
          color: #a1a1aa;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .popoverLangBtn:hover {
          color: #ffffff;
          border-color: #52525b;
          background: rgba(255, 255, 255, 0.02);
        }
        .popoverLangBtn.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
        }
        .storageCard .label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #71717a;
          margin-bottom: 8px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 6px;
          color: #a1a1aa;
        }
        .row b {
          color: #e4e4e7;
        }
        .bar {
          height: 6px;
          border-radius: 99px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          margin: 8px 0;
        }
        .barFill {
          height: 100%;
          background: linear-gradient(90deg, #ffffff, #a1a1aa);
          border-radius: 99px;
        }
        .storageCard small {
          display: block;
          font-size: 10px;
          color: #71717a;
          margin-top: 4px;
          line-height: 1.4;
        }

        .tableRowHover:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .main {
          padding: 24px 32px 40px;
          box-sizing: border-box;
          overflow-y: auto;
        }
        .contentPane {
          animation: contentSwitch .35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .topbar {
          display: flex;
          gap: 16px;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          position: sticky;
          top: 16px;
          z-index: 10;
          background: rgba(9, 9, 11, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 10px 14px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .search {
          flex: 1;
          max-width: 600px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .search:focus {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .search::placeholder {
          color: #52525b;
        }
        .actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .uploadBtn {
          background: #ffffff;
          color: #09090b;
          border-radius: 12px;
          padding: 10px 18px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: 0;
          box-shadow: 0 4px 14px rgba(255, 255, 255, 0.1);
        }
        .uploadBtn:hover {
          transform: translateY(-1px);
          background: #f4f4f5;
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
        }
        .ghost {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #e4e4e7;
          border-radius: 12px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .ghost:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          transform: translateY(-1px);
        }
        .danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border-radius: 12px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.35);
          color: #ffffff;
          transform: translateY(-1px);
        }
        .info {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.05);
          border: 1px solid rgba(96, 165, 250, 0.1);
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .error {
          color: #f87171;
          background: rgba(248, 113, 113, 0.05);
          border: 1px solid rgba(248, 113, 113, 0.1);
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 13px;
          white-space: pre-line;
        }
        .hint {
          margin: 0px 0 18px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          color: #a1a1aa;
          font-size: 13px;
          line-height: 1.5;
        }

        .groupToggleWrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .groupLabel {
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .chip {
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #a1a1aa;
          border-radius: 99px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .chip:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #e4e4e7;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .chip.active {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
          box-shadow: 0 4px 10px rgba(255, 255, 255, 0.1);
        }

        .monthBlock {
          margin-bottom: 28px;
        }
        .monthTitle {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #e4e4e7;
          letter-spacing: -0.2px;
        }
        .groupHeader {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #f4f4f5;
          border-radius: 14px;
          padding: 10px 14px;
          margin-bottom: 14px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .groupHeader:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .groupHeaderChevron {
          display: inline-block;
          font-size: 10px;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          transform: rotate(0deg);
          color: #71717a;
        }
        .groupHeaderChevron.open {
          transform: rotate(90deg);
          color: #ffffff;
        }
        .groupCount {
          margin-left: auto;
          color: #71717a;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .gridCollapseWrapper {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, margin-top 0.35s ease;
          opacity: 0;
          visibility: hidden;
          margin-top: 0;
        }
        .gridCollapseWrapper.open {
          grid-template-rows: 1fr;
          opacity: 1;
          visibility: visible;
          margin-top: 10px;
        }
        .gridCollapseWrapperInner {
          overflow: hidden;
          min-height: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .tile {
          background: #111113;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .tile:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }
        .tile:hover .thumb {
          transform: scale(1.04);
        }
        .tile.picked {
          border-color: #ffffff;
          box-shadow: 0 0 0 1px #ffffff, 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .thumb {
          width: 100%;
          height: 160px;
          object-fit: cover;
          display: block;
          background: #000;
          transition: transform 0.25s ease;
        }
        .caption {
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
        }
        .tile:hover .caption {
          color: #f4f4f5;
        }
        .badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 99px;
          background: #ffffff;
          color: #09090b;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          z-index: 2;
        }
        .processingBadge {
          position: absolute;
          left: 10px;
          top: 10px;
          font-size: 10px;
          background: rgba(245, 158, 11, 0.95);
          color: #000;
          padding: 3px 8px;
          border-radius: 99px;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          z-index: 2;
        }

        .docFilters {
          margin-bottom: 16px;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
          color: #a1a1aa;
        }
        .docFilters select {
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 6px 12px;
          font-family: inherit;
          outline: none;
        }
        .docGroup {
          margin-bottom: 24px;
        }
        .docGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .docCard {
          background: #111113;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 14px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .docCard:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        .docCard.picked {
          border-color: #ffffff;
          box-shadow: 0 0 0 1px #ffffff;
        }
        .docName {
          font-weight: 600;
          color: #f4f4f5;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
        }
        .docMeta {
          font-size: 11px;
          color: #71717a;
          font-weight: 500;
        }

        .processingPlaceholder {
          width: 100%;
          height: 160px;
          background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          position: relative;
        }
        .pulseLoader {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          border: 2px solid #f59e0b;
          animation: pulse 1.8s ease-in-out infinite;
        }
        .processingText {
          font-size: 10px;
          color: #f59e0b;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          animation: textPulse 1.8s ease-in-out infinite;
        }
        .videoProcessingOverlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 32px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(16px);
          max-width: 420px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          z-index: 10;
        }
        .loadingSpinner {
          width: 44px;
          height: 44px;
          border: 3px solid rgba(245, 158, 11, 0.1);
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .overlayTitle {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
        }
        .overlayDesc {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
        }
        .downloadOriginalBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f59e0b;
          color: #000000;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 12px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .downloadOriginalBtn:hover {
          background: #fbbf24;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .viewer {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 12, 0.98);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: viewerFadeIn 0.2s ease-out forwards;
        }
        .stage {
          width: calc(100vw - 160px);
          height: calc(100vh - 120px);
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }
        .stageTall::before,
        .stageTall::after {
          content: '';
          position: absolute;
          top: 40px;
          bottom: 12px;
          width: clamp(40px, 10vw, 160px);
          pointer-events: none;
          z-index: 1;
          filter: blur(16px);
          opacity: 0.35;
          border-radius: 18px;
        }
        .stageTall::before {
          left: 0;
          background: linear-gradient(90deg, rgba(255,255,255,.10), rgba(255,255,255,0));
        }
        .stageTall::after {
          right: 0;
          background: linear-gradient(270deg, rgba(255,255,255,.10), rgba(255,255,255,0));
        }
        .stageTitle, .full {
          position: relative;
          z-index: 2;
        }
        .mediaEnter {
          animation: mediaFadeIn .3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stageTitle {
          margin-bottom: 6px;
          font-weight: 600;
          color: #ffffff;
          font-size: 15px;
        }
        .full {
          display: block;
          max-width: 100%;
          max-height: calc(100% - 36px);
          width: auto;
          height: auto;
          object-fit: contain;
          background: transparent;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }
        .full.contain-tall { height: calc(100% - 36px); width: auto; max-width: 100%; max-height: calc(100% - 36px); }
        .full.contain-wide { width: 100%; height: auto; max-width: 100%; max-height: calc(100% - 36px); }
        video.full,
        video.full.contain-tall,
        video.full.contain-wide {
          width: auto !important;
          height: calc(100% - 36px) !important;
          min-width: 0 !important;
          max-width: 100% !important;
          max-height: calc(100% - 36px) !important;
          object-fit: contain !important;
          aspect-ratio: auto !important;
          margin: 0 auto;
          display: block;
        }
        img.full { max-width: 100%; max-height: calc(100% - 36px); }
        .nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 24px;
          color: white;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
        }
        .nav:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%) scale(1.05);
        }
        .left { left: 24px; }
        .right { right: 24px; }
        .topBtn {
          position: absolute;
          top: 24px;
          width: 40px;
          height: 40px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
        }
        .topBtn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .infoBtn { right: 120px; }
        .albumBtn { right: 72px; }
        .close {
          position: absolute;
          right: 24px;
          top: 24px;
          width: 40px;
          height: 40px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
        }
        .close:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .infoPanel {
          position: absolute;
          right: 24px;
          top: 76px;
          width: 300px;
          background: rgba(15, 15, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 8px;
          font-size: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          color: #a1a1aa;
          animation: panelEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .infoPanel b {
          color: #ffffff;
          font-size: 13px;
          word-break: break-all;
        }
        .albumPanel {
          position: absolute;
          right: 24px;
          top: 76px;
          width: min(300px, calc(100vw - 48px));
          box-sizing: border-box;
          max-height: 60vh;
          overflow-y: auto;
          background: rgba(15, 15, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          animation: panelEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .albumPanel * {
          box-sizing: border-box;
        }
        .albumSearch {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .albumSearch:focus {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .albumCreate {
          width: 100%;
          background: #ffffff;
          border: 0;
          color: #09090b;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .albumCreate:hover {
          background: #f4f4f5;
        }
        .albumList {
          display: grid;
          gap: 4px;
        }
        .albumItem {
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        .albumItem span:nth-child(2) {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .albumItem:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .albumItem.selected {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
        .albumItem .chk {
          width: 14px;
          height: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          display: grid;
          place-items: center;
          font-size: 10px;
          color: #09090b;
          background: transparent;
          transition: all 0.2s ease;
        }
        .albumItem.selected .chk {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
        }
        .albumItem .cnt {
          margin-left: auto;
          font-size: 11px;
          color: #71717a;
        }
        .albumActions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .albumBtnSave {
          flex: 1;
          background: #ffffff;
          color: #09090b;
          border: 0;
          border-radius: 8px;
          padding: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .albumBtnSave:hover {
          background: #f4f4f5;
        }
        .albumBtnCancel {
          background: rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .albumBtnCancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .tagBtn { right: 168px; }
        .tagsSection {
          margin: 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }
        .tagsHeader {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #71717a;
          margin-bottom: 10px;
        }
        .tagCloud {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tagChip {
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #a1a1aa;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .tagChip:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #e4e4e7;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .tagChip.active {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
          box-shadow: 0 4px 10px rgba(255, 255, 255, 0.1);
        }
        .tagChip.active .count {
          color: rgba(9, 9, 11, 0.6);
          background: rgba(9, 9, 11, 0.1);
        }
        .tagChip .count {
          font-size: 9px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 4px;
          border-radius: 4px;
        }
        .tagChipClear {
          border: 1px solid rgba(239, 68, 68, 0.15);
          background: rgba(239, 68, 68, 0.05);
          color: #fca5a5;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .tagChipClear:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ffffff;
        }

        .tagPanel {
          position: absolute;
          right: 24px;
          top: 76px;
          width: 300px;
          max-height: 60vh;
          overflow-y: auto;
          background: rgba(15, 15, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          animation: panelEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .tagSearch {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .tagSearch:focus {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .tagCreate {
          width: 100%;
          background: #ffffff;
          border: 0;
          color: #09090b;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .tagCreate:hover {
          background: #f4f4f5;
        }
        .tagList {
          display: grid;
          gap: 4px;
        }
        .tagItem {
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tagItem:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .tagItem.selected {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
        .tagItem .chk {
          width: 14px;
          height: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          display: grid;
          place-items: center;
          font-size: 10px;
          color: #09090b;
          background: transparent;
          transition: all 0.2s ease;
        }
        .tagItem.selected .chk {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
        }
        .tagItem .cnt {
          margin-left: auto;
          font-size: 11px;
          color: #71717a;
        }
        .tagActions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .tagBtnSave {
          flex: 1;
          background: #ffffff;
          color: #09090b;
          border: 0;
          border-radius: 8px;
          padding: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .tagBtnSave:hover {
          background: #f4f4f5;
        }
        .tagBtnCancel {
          background: rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .tagBtnCancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .docPreviewBlock {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 40px;
          width: 320px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .docPreviewBlock .docIcon {
          font-size: 64px;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
        }
        .docPreviewBlock .docName {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.4;
          word-break: break-all;
        }

        @keyframes fadeIn { from { opacity: 0; transform: scale(.99); } to { opacity: 1; transform: scale(1); } }
        @keyframes mediaFadeIn { from { opacity: 0; transform: scale(.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes sectionSlideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes contentSwitch { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes listSlideDown {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 500px; }
        }
        @keyframes viewerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes panelEnter {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
          .sidebar { position: relative; height: auto; border-right: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        }
      `}</style>
    </div>
  );
}
