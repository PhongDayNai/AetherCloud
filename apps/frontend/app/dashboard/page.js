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

function monthLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(d);
}

function yearLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  return String(d.getFullYear());
}

const LONG_PRESS_MS = 420;

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
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [collectionView, setCollectionView] = useState('all'); // all | recent | images | videos | trash
  const [albumsExpanded, setAlbumsExpanded] = useState(false);
  const [groupByTimeEnabled, setGroupByTimeEnabled] = useState(false);
  const [groupMode, setGroupMode] = useState('month'); // month | year
  const [expandedGroups, setExpandedGroups] = useState({});

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

  const docTypes = useMemo(() => Array.from(new Set(docs.map(docTypeOf))).sort(), [docs]);

  const docsFiltered = useMemo(() => {
    if (docTypeFilter === 'all') return docs;
    return docs.filter((d) => docTypeOf(d) === docTypeFilter);
  }, [docs, docTypeFilter]);

  const docsGrouped = useMemo(() => {
    const m = new Map();
    for (const d of docsFiltered) {
      const t = docTypeOf(d);
      if (!m.has(t)) m.set(t, []);
      m.get(t).push(d);
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
      const [u, a] = await Promise.all([
        fetch(`${api}/api/storage/usage`, { credentials: 'include' }),
        fetch(`${api}/api/assets?limit=1500&includeTrash=true`, { credentials: 'include' }),
      ]);
      if (!u.ok || !a.ok) throw new Error('Chưa đăng nhập hoặc API lỗi');
      const usageData = await u.json();
      const assetsData = await a.json();
      setUsage(usageData);
      setAssets(assetsData.items || []);
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
      body: JSON.stringify({ fileName: file.name, mime: file.type || 'application/octet-stream', totalSize: file.size }),
    });
    if (!init.ok) throw new Error('Không tạo được phiên upload chunk');
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
      if (!r.ok) throw new Error(`Chunk ${i + 1}/${totalChunks} lỗi`);

      setMsg(`Đang upload ${file.name}: ${i + 1}/${totalChunks}`);
    }

    const done = await fetch(`${api}/api/assets/upload-chunk/${uploadId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!done.ok) throw new Error('Hoàn tất upload chunk thất bại');
    return done.json();
  }

  async function onUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      setMsg(`Đang upload ${files.length} file...`);

      for (const file of files) {
        const big = file.size > 90 * 1024 * 1024; // >90MB dùng chunk tránh Cloudflare limit
        if (big) {
          await uploadLargeFileByChunks(file);
        } else {
          const form = new FormData();
          form.append('files', file);
          const r = await fetch(`${api}/api/assets/upload`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          });
          if (!r.ok) throw new Error(`Upload thất bại: ${file.name}`);
          await r.json();
        }
      }

      setMsg(`Upload xong ${files.length} file`);
      await loadData();
      e.target.value = '';
    } catch (ex) {
      setMsg(`Lỗi upload: ${ex.message || 'unknown'}`);
    }
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

        <button className={`navItem ${tab === 'docs' ? 'active' : ''}`} onClick={() => { setTab('docs'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">📁</span><span>Tài liệu</span><span className="count">{docs.length}</span>
        </button>

        <div className="sectionTitle">Bộ sưu tập</div>

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
                {collectionView !== 'trash' ? (
                  <>
                    <button className="ghost" onClick={addSelectedToAlbum}>Thêm vào album</button>
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
          <section>
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
                      <span>{isOpen ? '▾' : '▸'}</span>
                      <span>{group}</span>
                      <span className="groupCount">{items.length}</span>
                    </button>
                  )}

                  {isOpen && (
                    <div className="grid">
                      {items.map((a) => {
                        const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                        const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                        const picked = selectedIds.includes(a.id);
                        return (
                          <div key={a.id} className={`tile ${picked ? 'picked' : ''}`} {...cardHandlers(a, () => openPhoto(a.id))}>
                            {a.type === 'image' ? (
                              <img src={srcOriginal} alt={a.originalName} className="thumb" />
                            ) : (
                              <video src={srcPlay} className="thumb" muted />
                            )}
                            <div className="caption">{a.originalName}</div>
                            {picked && <div className="badge">✓</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {tab === 'docs' && (
          <section>
            <div className="docFilters">
              <span>Loại file:</span>
              <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {docsGrouped.map(([group, items]) => (
              <div key={group} className="docGroup">
                <div className="monthTitle">{group} · {items.length}</div>
                <div className="docGrid">
                  {items.map((d) => {
                    const src = `${api}/api/assets/_media/original/${d.id}`;
                    const picked = selectedIds.includes(d.id);
                    return (
                      <div key={d.id} className={`docCard ${picked ? 'picked' : ''}`} {...cardHandlers(d, () => window.open(src, '_blank'))}>
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
              <img src={`${api}/api/assets/_media/original/${active.id}`} alt={active.originalName} className="full" />
            ) : (
              <video src={`${api}/api/assets/_media/play/${active.id}`} controls autoPlay className="full" />
            )}
          </div>
          <button className="nav right" onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i >= albumFilteredPhotos.length - 1 ? 0 : i + 1)); }}>›</button>
          <button className="close" onClick={(e) => { e.stopPropagation(); setActiveIndex(-1); }}>✕</button>
        </div>
      )}

      <style jsx>{`
        .shell { display: grid; grid-template-columns: 250px 1fr; min-height: 100vh; background: radial-gradient(circle at 20% 0%, #1b2230 0%, #121212 45%); color: #e7e7e7; }
        .sidebar { border-right: 1px solid #2a2a2a; padding: 20px 14px; position: sticky; top: 0; height: 100vh; backdrop-filter: blur(6px); background: rgba(16,16,16,0.78); }
        .logo { font-size: 20px; font-weight: 700; margin-bottom: 14px; }
        .navItem { width: 100%; display: flex; align-items: center; gap: 8px; text-align: left; border: 0; padding: 11px 12px; border-radius: 12px; margin-bottom: 6px; background: transparent; color: #dcdcdc; cursor: pointer; transition: all .18s ease; }
        .navItem:hover { background: #1f1f1f; transform: translateX(1px); }
        .navItem.active { background: linear-gradient(180deg,#2b3548,#25314a); color: #9fc4ff; box-shadow: inset 0 0 0 1px #3a4b6f; }
        .ico { width: 18px; display: inline-flex; justify-content: center; }
        .count { margin-left: auto; font-size: 12px; opacity: .8; }
        .chev { margin-left: auto; opacity: .85; }
        .sectionTitle { margin-top: 14px; margin-bottom: 6px; font-size: 12px; letter-spacing: 0.6px; opacity: 0.72; text-transform: uppercase; }
        .subList { margin: 0 0 6px 8px; border-left: 1px solid #2f2f2f; padding-left: 8px; animation: fadeIn .2s ease; }
        .subItem { width: 100%; text-align: left; border: 0; background: transparent; color: #cfcfcf; padding: 7px 8px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all .16s ease; }
        .subItem:hover { background: #1f1f1f; transform: translateX(1px); }
        .subItem.active { background: #25314a; color: #aecdff; }
        .subHint { font-size: 12px; opacity: .68; padding: 6px 8px; }
        .storageCard { margin-top: 10px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 12px; }
        .label { font-size: 12px; opacity: 0.75; margin-bottom: 8px; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .bar { height: 10px; border-radius: 99px; overflow: hidden; background: #2d2d2d; margin: 6px 0; }
        .barFill { height: 100%; background: linear-gradient(90deg, #7daeff, #4d7cff); }

        .main { padding: 18px 24px 28px; animation: fadeIn .26s ease; }
        .topbar { display: flex; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 14px; position: sticky; top: 8px; z-index: 4; background: rgba(18,18,18,.72); backdrop-filter: blur(8px); border: 1px solid #2d2d2d; border-radius: 14px; padding: 10px; }
        .search { flex: 1; max-width: 650px; background: #232323; border: 1px solid #343434; color: #f2f2f2; border-radius: 24px; padding: 12px 16px; outline: none; transition: border-color .18s ease, box-shadow .18s ease; }
        .search:focus { border-color: #4d6ca1; box-shadow: 0 0 0 3px rgba(77,108,161,.22); }
        .actions { display: flex; gap: 8px; }
        .uploadBtn { background: linear-gradient(180deg,#5f8dff,#4872e4); color: white; border-radius: 10px; padding: 10px 14px; cursor: pointer; font-weight: 600; transition: transform .16s ease, filter .16s ease; }
        .uploadBtn:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .ghost { background: transparent; border: 1px solid #4a4a4a; color: #ddd; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all .16s ease; }
        .ghost:hover { border-color: #6684b9; color: #dfe9ff; transform: translateY(-1px); }
        .danger { background: #4a1f27; border: 1px solid #6a2a38; color: #ffc7cf; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all .16s ease; }
        .danger:hover { background: #5a2631; transform: translateY(-1px); }
        .info { color: #9dc8ff; margin-bottom: 8px; }
        .error { color: #ff9b9b; margin-bottom: 8px; }
        .hint { margin: 8px 0 14px; padding: 10px 12px; border: 1px solid #343434; border-radius: 10px; background: #1a1a1a; color: #cfcfcf; font-size: 13px; }

        .groupToggleWrap { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .groupLabel { font-size: 13px; opacity: .8; }
        .chip { border: 1px solid #3a3a3a; background: #1b1b1b; color: #ddd; border-radius: 999px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
        .chip.active { background: #2b3548; border-color: #4a5f8c; color: #aed0ff; }

        .monthBlock { margin-bottom: 18px; }
        .monthTitle { font-size: 14px; font-weight: 700; margin-bottom: 10px; opacity: 0.92; }
        .groupHeader { width: 100%; display: flex; align-items: center; gap: 8px; border: 1px solid #2f2f2f; background: #1a1a1a; color: #ddd; border-radius: 10px; padding: 9px 10px; margin-bottom: 10px; cursor: pointer; }
        .groupHeader:hover { background: #1f1f1f; }
        .groupCount { margin-left: auto; opacity: .8; font-size: 12px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
        .tile { background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 12px; overflow: hidden; cursor: pointer; position: relative; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        .tile:hover { border-color: #5a6f98; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.28); }
        .tile.picked { border-color: #7daeff; }
        .thumb { width: 100%; height: 150px; object-fit: cover; display: block; background: #000; }
        .caption { padding: 8px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .badge { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 999px; background: #7daeff; color: #0b1b35; display: grid; place-items: center; font-weight: 700; }

        .docFilters { margin-bottom: 10px; display: flex; gap: 8px; align-items: center; }
        .docFilters select { background: #232323; color: #eee; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px 10px; }
        .docGroup { margin-bottom: 18px; }
        .docGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
        .docCard { background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 12px; padding: 10px; cursor: pointer; position: relative; transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
        .docCard:hover { transform: translateY(-1px); border-color: #5a6f98; box-shadow: 0 6px 18px rgba(0,0,0,.24); }
        .docCard.picked { border-color: #7daeff; }
        .docName { font-weight: 700; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .docMeta { font-size: 12px; opacity: 0.8; }

        .viewer { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 9999; display: flex; align-items: center; justify-content: center; animation: fadeIn .18s ease; }
        .stage { width: 92vw; max-width: 1300px; max-height: 90vh; text-align: center; }
        .stageTitle { margin-bottom: 8px; font-weight: 700; }
        .full { max-width: 100%; max-height: 82vh; object-fit: contain; background: #000; }
        .nav { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; border-radius: 999px; border: 0; font-size: 34px; color: white; background: rgba(255,255,255,0.14); cursor: pointer; }
        .left { left: 16px; }
        .right { right: 16px; }
        .close { position: absolute; right: 16px; top: 16px; width: 44px; height: 44px; border-radius: 999px; border: 0; background: rgba(255,255,255,0.14); color: white; font-size: 18px; cursor: pointer; }

        @keyframes fadeIn { from { opacity: .4; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
          .sidebar { position: relative; height: auto; border-right: 0; border-bottom: 1px solid #2a2a2a; }
        }
      `}</style>
    </div>
  );
}
