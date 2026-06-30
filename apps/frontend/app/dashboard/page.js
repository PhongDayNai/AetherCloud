'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CustomDatePicker from '../../components/CustomDatePicker';

// Icons SVG đồng bộ (Phase 1)
const Icons = {
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  LogOut: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Key: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  User: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
};

function getApiOrigin() {
  return process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:45174';
}

function fmtBytes(bytes) {
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

function docTypeOf(item) {
  if (item.ext?.trim()) return item.ext.toLowerCase();
  if (item.mime?.trim()) return `mime:${item.mime.toLowerCase()}`;
  return 'no-extension';
}

function docCategoryOf(item) {
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

const DOC_CATEGORY_LABELS = {
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

function monthLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(d);
}

function yearLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  return String(d.getFullYear());
}

function inferUploadKind(file) {
  const t = (file?.type || '').toLowerCase();
  const name = (file?.name || '').toLowerCase();
  if (t.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|avif)$/.test(name)) return 'ảnh';
  if (t.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/.test(name)) return 'video';
  return 'tài liệu/file khác';
}

async function readErrorMessage(res) {
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
  return 'không có chi tiết từ server';
}

const LONG_PRESS_MS = 420;

function SmartVideo({ hlsSrc, mp4Src, className, controls = false, autoPlay = false, muted = false, preload = 'metadata', active = true, onMeta }) {
  const ref = useRef(null);
  const [fallbackToMp4, setFallbackToMp4] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let hls;
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
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          }
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[SmartVideo] Hls: Đã kết nối media element.');
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('[SmartVideo] Hls: Manifest đã được parse thành công. Các stream khả dụng:', data.levels);
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
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
      onError={(e) => {
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

export default function DashboardPage() {
  const api = useMemo(() => getApiOrigin(), []);

  const [usage, setUsage] = useState(null);
  const [assets, setAssets] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [tab, setTab] = useState('photos'); // photos | docs
  const [search, setSearch] = useState('');

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [showInfo, setShowInfo] = useState(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [albumQuery, setAlbumQuery] = useState('');
  const [selectedAlbumsForActive, setSelectedAlbumsForActive] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);
  const [selectedTagsForActive, setSelectedTagsForActive] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [docCategoryFilter, setDocCategoryFilter] = useState('all');
  const [docCollectionView, setDocCollectionView] = useState('all'); // all | trash
  const [docKindsExpanded, setDocKindsExpanded] = useState(false);
  const [collectionView, setCollectionView] = useState('all'); // all | recent | images | videos | trash
  const [albumsExpanded, setAlbumsExpanded] = useState(false);
  const [docProjects, setDocProjects] = useState([]);
  const [docProjectsExpanded, setDocProjectsExpanded] = useState(false);
  const [selectedDocProject, setSelectedDocProject] = useState('all');
  const [groupByTimeEnabled, setGroupByTimeEnabled] = useState(false);
  const [groupMode, setGroupMode] = useState('month'); // month | year
  const [expandedGroups, setExpandedGroups] = useState({});
  const [activeMediaFit, setActiveMediaFit] = useState('contain');

  // State và Handler cho đổi mật khẩu & logout phiên khác (Phase 1)
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile'); // profile | password | invites
  const [profileNameInput, setProfileNameInput] = useState('');
  const [updateProfileMsg, setUpdateProfileMsg] = useState('');

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setUpdateProfileMsg('');
    try {
      const res = await fetch(`${api}/api/auth/update-profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileNameInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUpdateProfileMsg('Cập nhật tên hiển thị thành công!');
      } else {
        const data = await res.json().catch(() => ({}));
        setUpdateProfileMsg(`Lỗi: ${data.message || 'Không cập nhật được hồ sơ'}`);
      }
    } catch (err) {
      setUpdateProfileMsg(`Lỗi: ${err.message}`);
    }
  }

  // State cho quản lý mã mời (Admin)
  const [invitations, setInvitations] = useState([]);
  const [maxUsesInput, setMaxUsesInput] = useState(1);
  const [expiresType, setExpiresType] = useState('hours'); // 'hours' | 'date'
  const [expiresInHoursInput, setExpiresInHoursInput] = useState('');
  const [expiresDateInput, setExpiresDateInput] = useState('');
  const [createInviteMsg, setCreateInviteMsg] = useState('');

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  async function loadInvitations() {
    try {
      const res = await fetch(`${api}/api/admin/invitations`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Không tải được danh sách mã mời:', err);
    }
  }

  async function handleCreateInvitation(e) {
    e.preventDefault();
    setCreateInviteMsg('');
    try {
      const body = {
        max_uses: maxUsesInput ? parseInt(maxUsesInput, 10) : 1
      };
      if (expiresType === 'hours') {
        if (expiresInHoursInput) {
          body.expires_in_hours = parseInt(expiresInHoursInput, 10);
        }
      } else if (expiresType === 'date') {
        if (expiresDateInput) {
          // Tạo Date local cho 23:59:59 của ngày được chọn
          const dateObj = new Date(`${expiresDateInput}T23:59:59`);
          body.expires_at = dateObj.toISOString();
        }
      }
      const res = await fetch(`${api}/api/admin/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setCreateInviteMsg('Tạo mã mời thành công!');
        setMaxUsesInput(1);
        setExpiresInHoursInput('');
        setExpiresDateInput('');
        loadInvitations();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateInviteMsg(`Lỗi: ${data.message || 'Không tạo được mã mời'}`);
      }
    } catch (err) {
      setCreateInviteMsg(`Lỗi: ${err.message}`);
    }
  }

  async function handleDeactivateInvitation(id) {
    if (!window.confirm('Bạn có chắc chắn muốn vô hiệu hóa mã mời này không?')) return;
    try {
      const res = await fetch(`${api}/api/admin/invitations/${id}/deactivate`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (res.ok) {
        loadInvitations();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Lỗi: ${data.message}`);
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  }


  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordMsg, setChangePasswordMsg] = useState('');
  const [showLogoutOthersConfirm, setShowLogoutOthersConfirm] = useState(false);

  async function handleLogout() {
    try {
      await fetch(`${api}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.href = '/login';
    } catch (e) {
      setErr('Không thể đăng xuất');
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setChangePasswordMsg('');
    if (newPassword !== confirmPassword) {
      setChangePasswordMsg('Lỗi: Mật khẩu mới không trùng khớp');
      return;
    }

    try {
      const res = await fetch(`${api}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      if (res.ok) {
        setShowSettingsModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordMsg('');
        
        if (mustChangePassword) {
          setMustChangePassword(false);
        }
        
        // Hiện popup hỏi đăng xuất thiết bị khác
        setShowLogoutOthersConfirm(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setChangePasswordMsg(`Lỗi: ${data.message || 'Không đổi được mật khẩu'}`);
      }
    } catch (err) {
      setChangePasswordMsg(`Lỗi: ${err.message || 'Lỗi kết nối'}`);
    }
  }

  async function handleLogoutOthers(confirm) {
    if (confirm) {
      try {
        const res = await fetch(`${api}/api/auth/logout-others`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          setMsg('Đã đăng xuất khỏi tất cả các thiết bị khác thành công');
        } else {
          const data = await res.json().catch(() => ({}));
          setErr(`Lỗi đăng xuất thiết bị khác: ${data.message}`);
        }
      } catch (err) {
        setErr(`Lỗi kết nối: ${err.message}`);
      }
    }
    setShowLogoutOthersConfirm(false);
  }

  const longPressRef = useRef(null);
  const suppressClickRef = useRef(null);
  const usageCardRef = useRef(null);

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
    const m = new Map();
    for (const d of docsBase) {
      const c = docCategoryOf(d);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [docsBase]);

  const docsGrouped = useMemo(() => {
    const m = new Map();
    for (const d of docsFiltered) {
      const key = DOC_CATEGORY_LABELS[docCategoryOf(d)] || 'Khác';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(d);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docsFiltered]);

  const [selectedAlbum, setSelectedAlbum] = useState('all');

  const availableAlbums = useMemo(() => {
    const m = new Map();
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

  const photoGroups = useMemo(() => {
    if (!groupByTimeEnabled) return [['all', albumFilteredPhotos]];
    const m = new Map();
    for (const p of albumFilteredPhotos) {
      const key = groupMode === 'year' ? yearLabel(p.takenAt || p.uploadedAt) : monthLabel(p.takenAt || p.uploadedAt);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(p);
    }
    return Array.from(m.entries());
  }, [albumFilteredPhotos, groupMode, groupByTimeEnabled]);

  const active = activeIndex >= 0
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

  function togglePick(id) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  }

  function beginLongPress(id) {
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
        setSettingsTab('password');
      }

      const [u, a, p, t] = await Promise.all([
        fetch(`${api}/api/storage/usage`, { credentials: 'include' }),
        fetch(`${api}/api/assets?limit=1500&includeTrash=true`, { credentials: 'include' }),
        fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' }),
        fetch(`${api}/api/assets/tags`, { credentials: 'include' }),
      ]);
      if (!u.ok || !a.ok || !p.ok || !t.ok) throw new Error('API lỗi hoặc phiên đăng nhập hết hạn');
      const usageData = await u.json();
      const assetsData = await a.json();
      const projectsData = await p.json();
      const tagsData = await t.json();
      setUsage(usageData);
      setAssets(assetsData.items || []);
      setDocProjects(projectsData.items || []);
      setTags(tagsData.items || []);
    } catch (e) {
      setErr(e.message || 'Không tải được dữ liệu');
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
    if (showSettingsModal && settingsTab === 'invites' && user?.role === 'admin') {
      loadInvitations();
    }
  }, [showSettingsModal, settingsTab, user]);

  useEffect(() => {
    function onKey(e) {
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


  async function uploadLargeFileByChunks(file) {
    const init = await fetch(`${api}/api/assets/upload-chunk/init`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, mime: file.type || 'application/octet-stream', totalSize: file.size, lastModified: file.lastModified }),
    });
    if (!init.ok) {
      const detail = await readErrorMessage(init);
      throw new Error(`Khởi tạo upload chunk thất bại (HTTP ${init.status}): ${detail}`);
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
        const detail = await readErrorMessage(r);
        throw new Error(`Chunk ${i + 1}/${totalChunks} thất bại (HTTP ${r.status}): ${detail}`);
      }
    }

    const done = await fetch(`${api}/api/assets/upload-chunk/${uploadId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!done.ok) {
      const detail = await readErrorMessage(done);
      throw new Error(`Hoàn tất chunk thất bại (HTTP ${done.status}): ${detail}`);
    }
    return done.json();
  }

  async function onUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const failed = [];
    let done = 0;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const kind = inferUploadKind(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const big = file.size > 90 * 1024 * 1024; // >90MB dùng chunk tránh Cloudflare limit

      try {
        setMsg(`Đang upload ${done}/${files.length} · File ${idx + 1}: ${file.name} (${kind}, ${sizeMb}MB, ${big ? 'chunk' : 'thường'})`);

        if (big) {
          await uploadLargeFileByChunks(file);
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
            const detail = await readErrorMessage(r);
            throw new Error(`Upload thường thất bại (HTTP ${r.status}): ${detail}`);
          }
          await r.json();
        }

        done += 1;
        setMsg(`✅ ${file.name} (${kind}) upload thành công · ${done}/${files.length}`);
      } catch (ex) {
        const reason = ex?.message || 'unknown';
        failed.push({ index: idx + 1, name: file.name, kind, sizeMb, mode: big ? 'chunk' : 'thường', reason });
        setMsg(`❌ Lỗi file ${idx + 1}/${files.length}: ${file.name} (${kind}) · ${reason}`);
      }
    }

    await loadData();
    e.target.value = '';

    if (failed.length === 0) {
      setMsg(`Upload xong ${done}/${files.length} file`);
      return;
    }

    const lines = failed.map((f) => `- #${f.index} ${f.name} | ${f.kind} | ${f.sizeMb}MB | ${f.mode} | ${f.reason}`);
    setErr(`Upload có lỗi (${failed.length}/${files.length} file):\n${lines.join('\n')}`);
    setMsg(`Upload hoàn tất có lỗi: thành công ${done}/${files.length}, lỗi ${failed.length}.`);
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
      if (!r.ok) throw new Error('Xóa thất bại');
      const data = await r.json();
      setMsg(`Đã chuyển ${data.updated || 0} file vào thùng rác`);
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData();
    } catch (e) {
      setMsg(`Lỗi xóa: ${e.message || 'unknown'}`);
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
      if (!r.ok) throw new Error('Khôi phục thất bại');
      const data = await r.json();
      setMsg(`Đã khôi phục ${data.updated || 0} file`);
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData();
    } catch (e) {
      setMsg(`Lỗi khôi phục: ${e.message || 'unknown'}`);
    }
  }

  async function purgeSelectedForever() {
    if (!selectedIds.length) return;
    const ok = window.confirm('Xóa vĩnh viễn các file đã chọn? Không thể hoàn tác.');
    if (!ok) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/purge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error('Xóa vĩnh viễn thất bại');
      const data = await r.json();
      setMsg(`Đã xóa vĩnh viễn ${data.removed || 0} file`);
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData();
    } catch (e) {
      setMsg(`Lỗi purge: ${e.message || 'unknown'}`);
    }
  }

  async function addSelectedToAlbum() {
    if (!selectedIds.length) return;
    const name = window.prompt('Tên album cần thêm vào:');
    if (!name || !name.trim()) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/album`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, albumName: name.trim() }),
      });
      if (!r.ok) throw new Error('Thêm vào album thất bại');
      const data = await r.json();
      setMsg(`Đã thêm ${data.updated || 0} file vào album "${name.trim()}"`);
      await loadData();
    } catch (e) {
      setMsg(`Lỗi album: ${e.message || 'unknown'}`);
    }
  }

  async function addSelectedToDocProject() {
    if (!selectedIds.length) return;
    const name = window.prompt('Tên project tài liệu cần thêm vào:');
    if (!name || !name.trim()) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/doc-project`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, projectName: name.trim() }),
      });
      if (!r.ok) throw new Error('Thêm vào project tài liệu thất bại');
      const data = await r.json();
      setMsg(`Đã thêm ${data.updated || 0} tài liệu vào project "${name.trim()}"`);
      await loadData();
      await loadDocProjects();
    } catch (e) {
      setMsg(`Lỗi project tài liệu: ${e.message || 'unknown'}`);
    }
  }

  async function loadAlbums() {
    const r = await fetch(`${api}/api/assets/albums`, { credentials: 'include' });
    if (!r.ok) throw new Error('Không tải được album');
    const data = await r.json();
    setAlbums(data.items || []);
  }

  async function loadDocProjects() {
    const r = await fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' });
    if (!r.ok) throw new Error('Không tải được nhóm dự án tài liệu');
    const data = await r.json();
    setDocProjects(data.items || []);
  }

  function toggleAlbumSelection(name) {
    setSelectedAlbumsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewAlbumInSelection(name) {
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
      if (!r.ok) throw new Error('Cập nhật album thất bại');
      await loadData();
      await loadAlbums();
      setShowAlbumPicker(false);
      setMsg('Đã cập nhật danh sách album thành công');
    } catch (e) {
      setMsg(`Lỗi lưu album: ${e.message}`);
    }
  }

  async function loadTags() {
    try {
      const r = await fetch(`${api}/api/assets/tags`, { credentials: 'include' });
      if (!r.ok) throw new Error('Không tải được danh mục nhãn');
      const data = await r.json();
      setTags(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  function toggleTagSelection(name) {
    setSelectedTagsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewTagInSelection(name) {
    const trimmed = (name || '').trim().toLowerCase();
    if (!trimmed) return;
    setSelectedTagsForActive((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setTags((prev) => {
      if (prev.some((t) => t.name.toLowerCase() === trimmed)) return prev;
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
      if (!r.ok) throw new Error('Cập nhật nhãn thất bại');
      await loadData();
      await loadTags();
      setShowTagPicker(false);
      setMsg('Đã cập nhật danh sách nhãn thành công');
    } catch (e) {
      setMsg(`Lỗi lưu nhãn: ${e.message}`);
    }
  }

  function toggleFilterTag(name) {
    setSelectedFilterTags((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function docIconOf(item) {
    const ext = (item.originalName || '').split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📕';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
    if (['txt', 'md', 'json'].includes(ext)) return '📝';
    return '📄';
  }

  function openPhoto(id) {
    const idx = albumFilteredPhotos.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function openDoc(id) {
    const idx = docsFiltered.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function cardHandlers(item, onNormalClick) {
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

  function toggleGroup(key) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebarMenu">
          <div className="logo">AetherCloud</div>

        <button className={`navItem ${tab === 'photos' && collectionView === 'all' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum('all'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">🖼</span><span>Tất cả ảnh/video</span><span className="count">{basePhotoAssets.filter((x) => !x.isDeleted).length}</span>
        </button>

        <button className={`navItem ${tab === 'docs' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('all'); setDocCategoryFilter('all'); setSelectedDocProject('all'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">📁</span><span>Tài liệu</span><span className="count">{docs.length}</span>
        </button>



        <div className="sectionWrap">
          <div className="sectionTitle">{tab === 'photos' ? 'Bộ sưu tập' : 'Khu vực tài liệu'}</div>

          {tab === 'photos' ? (
            <div className="sectionBody sectionIn">
              <button
                className={`navItem ${albumsExpanded ? 'active' : ''}`}
                onClick={() => setAlbumsExpanded((v) => !v)}
              >
                <span className="ico">🗂</span>
                <span>Album</span>
                <span className="chev">{albumsExpanded ? '▾' : '▸'}</span>
              </button>

              {albumsExpanded && (
                <div className="subList">
                  <button className={`subItem ${selectedAlbum === 'all' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum('all'); }}>
                    Tất cả
                  </button>
                  {availableAlbums.length === 0 && <div className="subHint">Chưa có album thủ công</div>}
                  {availableAlbums.map(([name, count]) => (
                    <button key={name} className={`subItem ${selectedAlbum === name ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum(name); }}>
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}

              <button className={`navItem ${tab === 'photos' && collectionView === 'recent' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('recent'); setSelectedAlbum('all'); }}>
                <span className="ico">🕒</span><span>Mới thêm gần đây</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'images' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('images'); setSelectedAlbum('all'); }}>
                <span className="ico">🖼</span><span>Ảnh</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'videos' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('videos'); setSelectedAlbum('all'); }}>
                <span className="ico">🎬</span><span>Video</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'trash' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('trash'); setSelectedAlbum('all'); }}>
                <span className="ico">🗑</span><span>Thùng rác</span><span className="count">{basePhotoAssets.filter((x) => x.isDeleted).length}</span>
              </button>
            </div>
          ) : (
            <div className="sectionBody sectionIn">
              <button className={`navItem ${tab === 'docs' && docCollectionView === 'all' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('all'); setSelectionMode(false); setSelectedIds([]); }}>
                <span className="ico">📄</span><span>Tài liệu đang có</span><span className="count">{docs.length}</span>
              </button>
              <button className={`navItem ${tab === 'docs' && docCollectionView === 'trash' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('trash'); setSelectionMode(false); setSelectedIds([]); }}>
                <span className="ico">🗑</span><span>Tài liệu trong thùng rác</span><span className="count">{trashedDocs.length}</span>
              </button>

              <button className={`navItem ${docProjectsExpanded ? 'active' : ''}`} onClick={() => setDocProjectsExpanded((v) => !v)}>
                <span className="ico">📚</span><span>Project tài liệu</span><span className="chev">{docProjectsExpanded ? '▾' : '▸'}</span>
              </button>
              {docProjectsExpanded && (
                <div className="subList">
                  <button className={`subItem ${selectedDocProject === 'all' ? 'active' : ''}`} onClick={() => setSelectedDocProject('all')}>Tất cả project</button>
                  {docProjects.length === 0 && <div className="subHint">Chưa có project tài liệu</div>}
                  {docProjects.map((p) => (
                    <button key={p.name} className={`subItem ${selectedDocProject === p.name ? 'active' : ''}`} onClick={() => setSelectedDocProject(p.name)}>
                      {p.name} ({p.count})
                    </button>
                  ))}
                </div>
              )}

              <button className={`navItem ${docCategoryFilter === 'all' ? 'active' : ''}`} onClick={() => setDocCategoryFilter('all')}>
                <span className="ico">🧩</span><span>Tất cả loại</span><span className="count">{docsBase.length}</span>
              </button>

              {['pdf', 'excel', 'word', 'markdown', 'text'].map((k) => (
                <button key={k} className={`navItem ${docCategoryFilter === k ? 'active' : ''}`} onClick={() => setDocCategoryFilter(k)}>
                  <span className="ico">{k === 'pdf' ? '📕' : k === 'excel' ? '📊' : k === 'word' ? '📝' : k === 'markdown' ? '🔤' : '📄'}</span>
                  <span>{DOC_CATEGORY_LABELS[k]}</span>
                  <span className="count">{docCategoryCounts.get(k) || 0}</span>
                </button>
              ))}

              <button className={`navItem ${docKindsExpanded ? 'active' : ''}`} onClick={() => setDocKindsExpanded((v) => !v)}>
                <span className="ico">🗂</span><span>Hiện tất cả loại</span><span className="chev">{docKindsExpanded ? '▾' : '▸'}</span>
              </button>

              {docKindsExpanded && (
                <div className="subList">
                  {docTypes.map((t) => (
                    <button key={t} className={`subItem ${docTypeFilter === t ? 'active' : ''}`} onClick={() => setDocTypeFilter(t)}>
                      {t}
                    </button>
                  ))}
                  <button className={`subItem ${docTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setDocTypeFilter('all')}>
                    Bỏ lọc loại cụ thể
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tagsSection">
          <div className="tagsHeader">Tags / Nhãn</div>
          {tags.length === 0 ? (
            <div className="subHint">Chưa có nhãn nào.</div>
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
                <button className="tagChipClear" onClick={() => setSelectedFilterTags([])}>Bỏ lọc</button>
              )}
            </div>
          )}
        </div>
        </div>

        <div className="storageCard" ref={usageCardRef}>
          <div className="label">Dung lượng</div>
          {usage ? (
            <>
              {(() => {
                const appUsed = (usage.breakdown?.originalsBytes || 0) + (usage.breakdown?.derivedBytes || 0) + (usage.breakdown?.trashBytes || 0);
                const appPercent = usage.totalBytes > 0 ? Number(((appUsed / usage.totalBytes) * 100).toFixed(4)) : 0;
                return (
                  <>
                    <div className="row"><span>AetherCloud dùng</span><b>{fmtBytes(appUsed)}</b></div>
                    <div className="row"><span>Tổng ổ</span><b>{fmtBytes(usage.totalBytes)}</b></div>
                    <div className="bar"><div className="barFill" style={{ width: `${Math.min(100, appPercent)}%` }} /></div>
                    <small>AetherCloud: {appPercent}% · Filesystem: {usage.usedPercent}%</small>
                    {Number(usage.processingCount || 0) > 0 && <small>Đang xử lý media: {usage.processingCount} file · tạm giữ nguyên số usage</small>}
                  </>
                );
              })()}
            </>
          ) : <small>Đang tải...</small>}
        </div>

        <div className="profileSection" onClick={(e) => e.stopPropagation()}>
          <div className="profileBtn" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
            <div className="profileAvatar">
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profileMeta">
              <div className="profileName">{user ? (user.role === 'admin' ? user.name : `Chào ${user.name},`) : 'Đang tải...'}</div>
              <div className="profileRole">{user ? (user.role === 'admin' ? 'Quản trị viên' : 'Thành viên') : ''}</div>
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
                <div className="popoverUserName">{user.role === 'admin' ? user.name : `Chào ${user.name},`}</div>
                <div className="popoverUserBadge">
                  {user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </div>
              </div>
              <hr className="popoverDivider" />
              <button className="popoverItem" onClick={() => { setShowSettingsModal(true); setSettingsTab('profile'); setProfileNameInput(user?.name || ''); setUpdateProfileMsg(''); setShowProfileMenu(false); }}>
                <span className="popoverIcon"><Icons.Settings /></span>
                <span>Cài đặt</span>
              </button>
              <button className="popoverItem" onClick={() => { handleLogout(); setShowProfileMenu(false); }}>
                <span className="popoverIcon"><Icons.LogOut /></span>
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <input className="search" placeholder="Tìm theo tên file..." value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="actions">
            <label className="uploadBtn">
              Upload
              <input type="file" multiple onChange={onUpload} hidden />
            </label>

            <button className="ghost" onClick={() => { setSelectionMode((v) => !v); if (selectionMode) setSelectedIds([]); }}>
              {selectionMode ? `Thoát chọn (${selectedIds.length})` : 'Chọn nhiều'}
            </button>

            {selectionMode && selectedIds.length > 0 && (
              <>
                {(tab === 'photos' && collectionView !== 'trash') || (tab === 'docs' && docCollectionView !== 'trash') ? (
                  <>
                    {tab === 'photos' && <button className="ghost" onClick={addSelectedToAlbum}>Thêm vào album</button>}
                    {tab === 'docs' && <button className="ghost" onClick={addSelectedToDocProject}>Thêm vào project tài liệu</button>}
                    <button className="danger" onClick={moveSelectedToTrash}>Xóa</button>
                  </>
                ) : (
                  <>
                    <button className="ghost" onClick={restoreSelectedFromTrash}>Khôi phục</button>
                    <button className="danger" onClick={purgeSelectedForever}>Xóa vĩnh viễn</button>
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
                {groupByTimeEnabled ? 'Tắt gom nhóm theo thời gian' : 'Bật gom nhóm theo thời gian'}
              </button>
              {groupByTimeEnabled && (
                <>
                  <span className="groupLabel">Theo:</span>
                  <button className={`chip ${groupMode === 'month' ? 'active' : ''}`} onClick={() => setGroupMode('month')}>Tháng</button>
                  <button className={`chip ${groupMode === 'year' ? 'active' : ''}`} onClick={() => setGroupMode('year')}>Năm</button>
                </>
              )}
            </div>

            {collectionView === 'recent' && <div className="hint">Đang hiển thị ảnh/video mới thêm trong 2 tuần gần đây.</div>}
            {collectionView === 'trash' && <div className="hint">Thùng rác: chọn nhiều để khôi phục hoặc xóa vĩnh viễn.</div>}

            {photoGroups.length === 0 && <div className="hint">Không có dữ liệu phù hợp.</div>}

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
                              {a.type === 'video' && a.processingStatus === 'processing' && <div className="processingBadge">Đang xử lý…</div>}
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
              <span>Loại cụ thể:</span>
              <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {selectedDocProject !== 'all' && <span className="chip active">Project: {selectedDocProject}</span>}
            </div>

            {docCollectionView === 'trash' && <div className="hint">Thùng rác tài liệu: chọn nhiều để khôi phục hoặc xóa vĩnh viễn.</div>}
            {docsGrouped.length === 0 && <div className="hint">Không có tài liệu phù hợp.</div>}

            {docsGrouped.map(([group, items]) => (
              <div key={group} className="docGroup">
                <div className="monthTitle">{group} · {items.length}</div>
                <div className="docGrid">
                  {items.map((d, idx) => {
                    const src = `${api}/api/assets/_media/original/${d.id}`;
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
                  <div className="overlayTitle">Đang tối ưu hóa Video</div>
                  <div className="overlayDesc">Hệ thống đang tiến hành nén định dạng và tạo phân đoạn phát trực tuyến (HLS) tự động ở chế độ nền. Bạn vẫn có thể tải video gốc về máy để xem trước.</div>
                  <a href={`${api}/api/assets/_media/original/${active.id}`} download={active.originalName} className="downloadOriginalBtn" onClick={(e) => e.stopPropagation()}>
                    <span>Tải video gốc về máy</span>
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
                  <span>Mở tài liệu</span>
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
                setMsg('Không tải được album');
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
              setMsg('Không tải được nhãn');
            }
          }}>🏷</button>
          <button className="close" onClick={(e) => { e.stopPropagation(); setActiveIndex(-1); setShowInfo(false); setShowAlbumPicker(false); setShowTagPicker(false); }}>✕</button>

          {showInfo && active && (
            <div className="infoPanel" onClick={(e) => e.stopPropagation()}>
              <div><b>{active.originalName}</b></div>
              <div>Loại: {active.mime}</div>
              <div>Dung lượng: {fmtBytes(active.size)}</div>
              <div>Taken: {active.takenAt || '-'}</div>
              <div>Upload: {active.uploadedAt || '-'}</div>
              {active.type !== 'file' && <div>Album: {(active.albumNames || []).join(', ') || '-'}</div>}
              <div>Tags: {(active.tags || []).map(t => `#${t}`).join(', ') || '-'}</div>
            </div>
          )}

          {showAlbumPicker && (
            <div className="albumPanel" onClick={(e) => e.stopPropagation()}>
              <input className="albumSearch" placeholder="Tìm album..." value={albumQuery} onChange={(e) => setAlbumQuery(e.target.value)} />
              <button className="albumCreate" onClick={() => createNewAlbumInSelection(albumQuery || window.prompt('Tên album mới:') || '')}>+ Tạo album mới</button>
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
                <button className="albumBtnSave" onClick={saveActiveAlbums}>Lưu</button>
                <button className="albumBtnCancel" onClick={() => setShowAlbumPicker(false)}>Hủy</button>
              </div>
            </div>
          )}

          {showTagPicker && (
            <div className="tagPanel" onClick={(e) => e.stopPropagation()}>
              <input className="tagSearch" placeholder="Tìm hoặc tạo nhãn..." value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
              <button className="tagCreate" onClick={() => createNewTagInSelection(tagQuery || window.prompt('Tên nhãn mới:') || '')}>+ Tạo nhãn mới</button>
              <div className="tagList">
                {tags.filter((t) => t.name.toLowerCase().includes(tagQuery.toLowerCase())).map((t) => {
                  const isSelected = selectedTagsForActive.includes(t.name);
                  return (
                    <button key={t.name} className={`tagItem ${isSelected ? 'selected' : ''}`} onClick={() => toggleTagSelection(t.name)}>
                      <span className="chk">{isSelected ? '✓' : ''}</span>
                      <span>#{t.name}</span>
                      <span className="cnt">({t.count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="tagActions">
                <button className="tagBtnSave" onClick={saveActiveTags}>Lưu</button>
                <button className="tagBtnCancel" onClick={() => setShowTagPicker(false)}>Hủy</button>
              </div>
            </div>
          )}
        </div>
      )}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 5, 5, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }} onClick={() => { if (!mustChangePassword) setShowSettingsModal(false); }}>
          <div style={{
            display: 'flex',
            gap: '20px',
            width: '90%',
            maxWidth: '820px',
            height: '430px',
            alignItems: 'stretch',
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Cột các tab Option bên trái */}
            <div style={{
              width: '180px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flexShrink: 0
            }}>
              <button 
                onClick={() => setSettingsTab('profile')}
                style={{
                  background: settingsTab === 'profile' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: settingsTab === 'profile' ? '#ffffff' : '#a1a1aa',
                  padding: '11px 12px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => { if (settingsTab !== 'profile') e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { if (settingsTab !== 'profile') e.currentTarget.style.color = '#a1a1aa'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', opacity: settingsTab === 'profile' ? 1 : 0.7 }}><Icons.User /></span>
                <span>Hồ sơ cá nhân</span>
              </button>

              <button 
                onClick={() => setSettingsTab('password')}
                style={{
                  background: settingsTab === 'password' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: settingsTab === 'password' ? '#ffffff' : '#a1a1aa',
                  padding: '11px 12px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => { if (settingsTab !== 'password') e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { if (settingsTab !== 'password') e.currentTarget.style.color = '#a1a1aa'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', opacity: settingsTab === 'password' ? 1 : 0.7 }}><Icons.Lock /></span>
                <span>Đổi mật khẩu</span>
              </button>

              {user?.role === 'admin' && (
                <button 
                  onClick={() => setSettingsTab('invites')}
                  style={{
                    background: settingsTab === 'invites' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: settingsTab === 'invites' ? '#ffffff' : '#a1a1aa',
                    padding: '11px 12px',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => { if (settingsTab !== 'invites') e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { if (settingsTab !== 'invites') e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', opacity: settingsTab === 'invites' ? 1 : 0.7 }}><Icons.Key /></span>
                  <span>Quản lý mã mời</span>
                </button>
              )}
            </div>

            {/* Khung chứa nội dung tab bên phải (Premium Glassmorphism) */}
            <div style={{
              flex: 1,
              background: 'rgba(20, 20, 25, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              color: '#f4f4f5',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              position: 'relative',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}>
              {/* Nút đóng */}
              {!mustChangePassword && (
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '24px',
                    background: 'transparent',
                    border: 0,
                    color: '#71717a',
                    fontSize: '20px',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    padding: '4px',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#71717a'; }}
                >
                  ✕
                </button>
              )}

              {/* TABS CONTENT */}

              {/* 1. HỒ SƠ CÁ NHÂN (PROFILE) */}
              {settingsTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', color: '#ffffff', fontWeight: '600' }}>Hồ sơ cá nhân</h3>
                  
                  <div style={{ display: 'flex', gap: '28px', alignItems: 'stretch', flex: 1 }}>
                    {/* Cột trái: Profile Card tóm tắt */}
                    <div style={{
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      paddingRight: '28px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                      boxSizing: 'border-box',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '24px',
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                        marginBottom: '16px'
                      }}>
                        {user ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '600', color: '#ffffff' }}>{user?.name}</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#71717a', wordBreak: 'break-all' }}>{user?.email}</p>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#a1a1aa',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                      </span>
                    </div>

                    {/* Cột phải: Form cập nhật */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên hiển thị</label>
                          <input 
                            type="text" 
                            value={profileNameInput} 
                            onChange={(e) => setProfileNameInput(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email tài khoản (Bảo mật)</label>
                          <div style={{
                            width: '100%',
                            padding: '9px 12px',
                            boxSizing: 'border-box',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            color: '#52525b',
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'not-allowed'
                          }}>
                            <span>{user?.email}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#52525b' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </span>
                          </div>
                        </div>

                        {updateProfileMsg && (
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: updateProfileMsg.startsWith('Lỗi') ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: updateProfileMsg.startsWith('Lỗi') ? '#fca5a5' : '#a7f3d0',
                            fontSize: '13px',
                            border: `1px solid ${updateProfileMsg.startsWith('Lỗi') ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`
                          }}>
                            {updateProfileMsg}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2px' }}>
                          <button 
                            type="submit"
                            style={{
                              padding: '9px 18px',
                              borderRadius: '6px',
                              border: 0,
                              backgroundColor: '#ffffff',
                              color: '#000000',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.target.style.opacity = '0.9'; }}
                            onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                          >
                            Lưu thay đổi
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ĐỔI MẬT KHẨU */}
              {settingsTab === 'password' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', color: '#ffffff', fontWeight: '600' }}>Bảo mật tài khoản</h3>
                  
                  <div style={{ display: 'flex', gap: '28px', alignItems: 'stretch', flex: 1 }}>
                    {/* Cột trái: Hướng dẫn bảo mật */}
                    <div style={{
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      paddingRight: '28px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                      boxSizing: 'border-box',
                      justifyContent: 'center'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13.5px', fontWeight: '600', color: '#ffffff' }}>Mật khẩu mạnh</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#71717a', lineHeight: '1.5' }}>
                        {mustChangePassword ? 'Yêu cầu đổi mật khẩu mặc định/tạm thời để kích hoạt tài khoản của bạn.' : 'Nên định kỳ cập nhật mật khẩu mới để bảo vệ dữ liệu đám mây luôn an toàn.'}
                      </p>
                      <div style={{ fontSize: '11.5px', color: '#52525b', lineHeight: '1.4' }}>
                        * Tối thiểu 8 ký tự<br />
                        * Gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                      </div>
                    </div>

                    {/* Cột phải: Form đổi mật khẩu */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mật khẩu hiện tại</label>
                          <input 
                            type="password" 
                            value={oldPassword} 
                            onChange={(e) => setOldPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mật khẩu mới</label>
                          <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Xác nhận mật khẩu mới</label>
                          <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '13.5px', outline: 'none', transition: 'all 0.15s ease' }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>
                        
                        {changePasswordMsg && (
                          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#fca5a5', fontSize: '13px', border: '1px solid rgba(244, 63, 94, 0.12)' }}>
                            {changePasswordMsg}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
                          <button 
                            type="submit"
                            style={{
                              padding: '9px 18px',
                              borderRadius: '6px',
                              border: 0,
                              backgroundColor: '#ffffff',
                              color: '#000000',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.target.style.opacity = '0.9'; }}
                            onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                          >
                            Cập nhật mật khẩu
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. QUẢN LÝ MÃ MỜI (ADMIN ONLY) */}
              {settingsTab === 'invites' && user?.role === 'admin' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'visible' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#ffffff', fontWeight: '600' }}>Quản lý mã mời đăng ký</h3>
                  
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flex: 1, overflow: 'visible' }}>
                    {/* Cột trái: Form tạo mã mời (Xếp dọc gọn gàng) */}
                    <div style={{
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      paddingRight: '24px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                      boxSizing: 'border-box',
                      justifyContent: 'center'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Tạo mã mời mới</h4>
                      <form onSubmit={handleCreateInvitation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số lượt dùng</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={maxUsesInput} 
                            onChange={(e) => setMaxUsesInput(e.target.value)} 
                            required 
                            style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '7px 10px', color: '#ffffff', fontSize: '13px', outline: 'none', transition: 'all 0.15s ease', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: '#71717a', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hạn dùng</label>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <button 
                              type="button" 
                              onClick={() => { setExpiresType('hours'); setExpiresDateInput(''); }}
                              style={{
                                flex: 1,
                                background: expiresType === 'hours' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '4px',
                                color: expiresType === 'hours' ? '#ffffff' : '#a1a1aa',
                                padding: '5px 0',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              Theo giờ
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setExpiresType('date'); setExpiresInHoursInput(''); }}
                              style={{
                                flex: 1,
                                background: expiresType === 'date' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '4px',
                                color: expiresType === 'date' ? '#ffffff' : '#a1a1aa',
                                padding: '5px 0',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              Theo ngày
                            </button>
                          </div>
                          
                          {expiresType === 'hours' ? (
                            <input 
                              type="number" 
                              min="1" 
                              placeholder="Không hết hạn"
                              value={expiresInHoursInput} 
                              onChange={(e) => setExpiresInHoursInput(e.target.value)} 
                              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '7px 10px', color: '#ffffff', fontSize: '13px', outline: 'none', transition: 'all 0.15s ease', boxSizing: 'border-box' }}
                              onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                            />
                          ) : (
                            <div>
                              <CustomDatePicker 
                                value={expiresDateInput} 
                                onChange={setExpiresDateInput} 
                                minDate={todayStr}
                              />
                              <span style={{ display: 'block', fontSize: '9px', color: '#71717a', marginTop: '5px', lineHeight: '1.4' }}>
                                * Hết hạn vào lúc 23:59:59 của ngày được chọn.
                              </span>
                            </div>
                          )}
                        </div>

                        <button 
                          type="submit" 
                          style={{
                            background: '#ffffff',
                            color: '#000000',
                            border: 0,
                            borderRadius: '6px',
                            padding: '8px 14px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease',
                            marginTop: '4px'
                          }}
                          onMouseEnter={(e) => { e.target.style.opacity = '0.9'; }}
                          onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                        >
                          Tạo mã mời
                        </button>

                        {createInviteMsg && (
                          <div style={{
                            fontSize: '11.5px',
                            color: createInviteMsg.startsWith('Lỗi') ? '#fca5a5' : '#a7f3d0',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: createInviteMsg.startsWith('Lỗi') ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            border: `1px solid ${createInviteMsg.startsWith('Lỗi') ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`,
                            wordBreak: 'break-word'
                          }}>
                            {createInviteMsg}
                          </div>
                        )}
                      </form>
                    </div>

                    {/* Cột phải: Danh sách mã mời */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Danh sách mã mời đã tạo</h4>
                      <div style={{
                        flex: 1,
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px',
                        overflowY: 'auto',
                        background: 'rgba(0, 0, 0, 0.15)'
                      }}>
                        {invitations.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '12.5px' }}>
                            Chưa có mã mời nào được tạo.
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px', color: '#e4e4e7' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: '#71717a' }}>Mã</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: '#71717a' }}>Dùng</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: '#71717a' }}>Hạn dùng</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: '#71717a' }}>Trạng thái</th>
                                <th style={{ padding: '8px 10px', fontWeight: '600', color: '#71717a', textAlign: 'right' }}>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invitations.map((inv) => {
                                const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                                const isActive = inv.is_active && !isExpired && (inv.max_uses === null || inv.uses_count < inv.max_uses);
                                return (
                                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} className="tableRowHover">
                                    <td style={{ padding: '8px 10px', fontWeight: '700', color: '#3b82f6', fontFamily: 'monospace', fontSize: '13px' }}>{inv.token}</td>
                                    <td style={{ padding: '8px 10px' }}>{inv.uses_count}/{inv.max_uses || '∞'}</td>
                                    <td style={{ padding: '8px 10px', color: '#71717a' }}>
                                      {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('vi-VN') : 'Vô hạn'}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                      {isActive ? (
                                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>Chạy</span>
                                      ) : (
                                        <span style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.1)', padding: '1px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>Khóa</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                      {inv.is_active && (
                                        <button 
                                          onClick={() => handleDeactivateInvitation(inv.id)}
                                          style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(244, 63, 94, 0.25)',
                                            color: '#f43f5e',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '10.5px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={(e) => { e.target.style.background = 'rgba(244, 63, 94, 0.06)'; e.target.style.borderColor = '#f43f5e'; }}
                                          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(244, 63, 94, 0.25)'; }}
                                        >
                                          Khóa
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {showLogoutOthersConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            padding: '24px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            color: '#f4f4f5',
            fontFamily: 'sans-serif',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 18, color: '#fff' }}>Đăng xuất thiết bị khác?</h3>
            <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: '1.5', marginBottom: 20 }}>
              Mật khẩu của bạn đã được thay đổi. Bạn có muốn đăng xuất khỏi tất cả các thiết bị khác để bảo mật tối đa tài khoản không?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => handleLogoutOthers(false)}
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #3f3f46', backgroundColor: 'transparent', color: '#fff', cursor: 'pointer' }}
              >
                Không, giữ nguyên
              </button>
              <button 
                onClick={() => handleLogoutOthers(true)}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 0, backgroundColor: '#dc2626', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Có, đăng xuất hết
              </button>
            </div>
          </div>
        </div>
      )}

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
