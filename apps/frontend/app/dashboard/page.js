'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function getApiOrigin() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'hc.example.com') return 'https://api.example.com';
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:45174';
  }
  return process.env.NEXT_PUBLIC_API_ORIGIN || process.env.API_ORIGIN || 'http://localhost:45174';
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
    } catch {}
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
      if (fallbackToMp4 || !hlsSrc) {
        el.src = mp4Src;
        return;
      }

      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = hlsSrc;
        return;
      }

      try {
        const mod = await import('hls.js');
        const Hls = mod.default;
        if (!Hls.isSupported()) {
          el.src = mp4Src;
          return;
        }

        if (cancelled) return;
        hls = new Hls({
          maxBufferLength: 120,
          maxMaxBufferLength: 300,
          backBufferLength: 90,
          enableWorker: true,
          startLevel: -1,
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) {
            try { hls.destroy(); } catch {}
            setFallbackToMp4(true);
          }
        });
        hls.loadSource(hlsSrc);
        hls.attachMedia(el);
      } catch {
        el.src = mp4Src;
      }
    }

    setup();

    return () => {
      cancelled = true;
      try { if (hls) hls.destroy(); } catch {}
    };
  }, [hlsSrc, mp4Src, fallbackToMp4]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active && autoPlay) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      el.pause();
    }
  }, [active, autoPlay]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof onMeta !== 'function') return;
    const onLoadedMeta = () => onMeta({ w: el.videoWidth || 0, h: el.videoHeight || 0 });
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
      style={{ width: 'auto', height: 'calc(100% - 36px)', maxWidth: '100%', maxHeight: 'calc(100% - 36px)', objectFit: 'contain' }}
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
  const [mediaCacheIds, setMediaCacheIds] = useState([]);
  const [activeMediaFit, setActiveMediaFit] = useState('contain');

  const longPressRef = useRef(null);
  const suppressClickRef = useRef(null);
  const usageCardRef = useRef(null);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => (a.originalName || '').toLowerCase().includes(q));
  }, [assets, search]);

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

  const active = activeIndex >= 0 ? albumFilteredPhotos[activeIndex] : null;

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

  useEffect(() => {
    if (!active || active.type !== 'video') return;
    const ids = [active.id];
    if (albumFilteredPhotos[activeIndex - 1]?.type === 'video') ids.push(albumFilteredPhotos[activeIndex - 1].id);
    if (albumFilteredPhotos[activeIndex + 1]?.type === 'video') ids.push(albumFilteredPhotos[activeIndex + 1].id);

    setMediaCacheIds((prev) => {
      const merged = [...new Set([...prev, ...ids])];
      return merged.slice(-12);
    });
  }, [active?.id, active?.type, activeIndex, albumFilteredPhotos]);

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

      const [u, a, p] = await Promise.all([
        fetch(`${api}/api/storage/usage`, { credentials: 'include' }),
        fetch(`${api}/api/assets?limit=1500&includeTrash=true`, { credentials: 'include' }),
        fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' }),
      ]);
      if (!u.ok || !a.ok || !p.ok) throw new Error('API lỗi hoặc phiên đăng nhập hết hạn');
      const usageData = await u.json();
      const assetsData = await a.json();
      const projectsData = await p.json();
      setUsage(usageData);
      setAssets(assetsData.items || []);
      setDocProjects(projectsData.items || []);
    } catch (e) {
      setErr(e.message || 'Không tải được dữ liệu');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (activeIndex < 0) return;
      if (e.key === 'Escape') setActiveIndex(-1);
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i <= 0 ? albumFilteredPhotos.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i >= albumFilteredPhotos.length - 1 ? 0 : i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, albumFilteredPhotos.length]);


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

  async function addActiveToAlbum(name) {
    if (!active?.id) return;
    const albumName = (name || '').trim();
    if (!albumName) return;

    const r = await fetch(`${api}/api/assets/bulk/album`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [active.id], albumName }),
    });
    if (!r.ok) throw new Error('Thêm album thất bại');
    await loadData();
    await loadAlbums();
    setShowAlbumPicker(false);
  }

  function openPhoto(id) {
    const idx = albumFilteredPhotos.findIndex((x) => x.id === id);
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
        <div className="logo">HC Photos</div>

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

        <div className="storageCard" ref={usageCardRef}>
          <div className="label">Dung lượng</div>
          {usage ? (
            <>
              {(() => {
                const appUsed = (usage.breakdown?.originalsBytes || 0) + (usage.breakdown?.derivedBytes || 0) + (usage.breakdown?.trashBytes || 0);
                const appPercent = usage.totalBytes > 0 ? Number(((appUsed / usage.totalBytes) * 100).toFixed(4)) : 0;
                return (
                  <>
                    <div className="row"><span>HC Photos dùng</span><b>{fmtBytes(appUsed)}</b></div>
                    <div className="row"><span>Tổng ổ</span><b>{fmtBytes(usage.totalBytes)}</b></div>
                    <div className="bar"><div className="barFill" style={{ width: `${Math.min(100, appPercent)}%` }} /></div>
                    <small>HC Photos: {appPercent}% · Filesystem: {usage.usedPercent}%</small>
                    {Number(usage.processingCount || 0) > 0 && <small>Đang xử lý media: {usage.processingCount} file · tạm giữ nguyên số usage</small>}
                  </>
                );
              })()}
            </>
          ) : <small>Đang tải...</small>}
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
                            <div key={a.id} className={`tile ${picked ? 'picked' : ''}`} {...cardHandlers(a, () => openPhoto(a.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
                              {a.type === 'image' ? (
                                <img src={srcOriginal} alt={a.originalName} className="thumb" />
                              ) : (
                                <video src={srcPlay} className="thumb" muted preload="metadata" />
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
                      <div key={d.id} className={`docCard ${picked ? 'picked' : ''}`} {...cardHandlers(d, () => window.open(src, '_blank'))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
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
        <div className="viewer" onClick={() => setActiveIndex(-1)}>
          <button className="nav left" onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i <= 0 ? albumFilteredPhotos.length - 1 : i - 1)); }}>‹</button>
          <div className="stage" onClick={(e) => e.stopPropagation()}>
            <div className="stageTitle">{active.originalName}</div>
            {active.type === 'image' ? (
              <img key={active.id} src={`${api}/api/assets/_media/original/${active.id}`} alt={active.originalName} className={`full mediaEnter ${activeMediaFit}`} />
            ) : (
              <SmartVideo
                key={active.id}
                hlsSrc={`${api}/api/assets/_media/hls/${active.id}/master.m3u8?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
                mp4Src={`${api}/api/assets/_media/play/${active.id}`}
                controls
                autoPlay
                className={`full mediaEnter ${activeMediaFit}`}
                preload="auto"
                active
                onMeta={({ w, h }) => setActiveMediaFit(h > w ? 'contain-tall' : 'contain-wide')}
              />
            )}
          </div>
          <button className="nav right" onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i >= albumFilteredPhotos.length - 1 ? 0 : i + 1)); }}>›</button>
          <button className="topBtn infoBtn" onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}>i</button>
          <button className="topBtn albumBtn" onClick={async (e) => { e.stopPropagation(); try { await loadAlbums(); setShowAlbumPicker((v) => !v); } catch (er) { setMsg('Không tải được album'); } }}>＋</button>
          <button className="close" onClick={(e) => { e.stopPropagation(); setActiveIndex(-1); setShowInfo(false); setShowAlbumPicker(false); }}>✕</button>

          {showInfo && active && (
            <div className="infoPanel" onClick={(e) => e.stopPropagation()}>
              <div><b>{active.originalName}</b></div>
              <div>Loại: {active.mime}</div>
              <div>Dung lượng: {fmtBytes(active.size)}</div>
              <div>Taken: {active.takenAt || '-'}</div>
              <div>Upload: {active.uploadedAt || '-'}</div>
              <div>Album: {(active.albumNames || []).join(', ') || '-'}</div>
            </div>
          )}

          {showAlbumPicker && (
            <div className="albumPanel" onClick={(e) => e.stopPropagation()}>
              <input className="albumSearch" placeholder="Tìm album..." value={albumQuery} onChange={(e) => setAlbumQuery(e.target.value)} />
              <button className="albumCreate" onClick={() => addActiveToAlbum(albumQuery || window.prompt('Tên album mới:') || '')}>+ Tạo album mới</button>
              <div className="albumList">
                {albums.filter((a) => a.name.toLowerCase().includes(albumQuery.toLowerCase())).map((a) => (
                  <button key={a.name} className="albumItem" onClick={() => addActiveToAlbum(a.name)}>{a.name} ({a.count})</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mediaCache" aria-hidden>
        {mediaCacheIds.map((id) => (
          <video key={id} src={`${api}/api/assets/_media/play/${id}`} preload="auto" muted playsInline />
        ))}
      </div>

      <style jsx>{`
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
        .storageCard {
          margin-top: auto;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 14px;
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

        .viewer {
          position: fixed;
          inset: 0;
          background: rgba(4, 4, 6, 0.94);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(20px);
          animation: viewerFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
        .albumItem:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .mediaCache {
          position: fixed;
          width: 0;
          height: 0;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
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
          from { background: rgba(4, 4, 6, 0); backdrop-filter: blur(0px); }
          to { background: rgba(4, 4, 6, 0.94); backdrop-filter: blur(20px); }
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
