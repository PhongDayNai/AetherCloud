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

  const longPressRef = useRef(null);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => (a.originalName || '').toLowerCase().includes(q));
  }, [assets, search]);

  const photoAssets = useMemo(
    () => filteredAssets.filter((a) => a.type === 'image' || a.type === 'video'),
    [filteredAssets]
  );

  const docs = useMemo(
    () => filteredAssets.filter((a) => a.type !== 'image' && a.type !== 'video'),
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

  const photoGroups = useMemo(() => {
    const m = new Map();
    for (const p of photoAssets) {
      const key = monthLabel(p.uploadedAt);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(p);
    }
    return Array.from(m.entries());
  }, [photoAssets]);

  const active = activeIndex >= 0 ? photoAssets[activeIndex] : null;

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function togglePick(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function beginLongPress(id) {
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      setSelectionMode(true);
      togglePick(id);
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
        fetch(`${api}/api/assets?limit=1500`, { credentials: 'include' }),
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
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i <= 0 ? photoAssets.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i >= photoAssets.length - 1 ? 0 : i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, photoAssets.length]);

  async function onUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    setMsg(`Đang upload ${files.length} file...`);
    try {
      const r = await fetch(`${api}/api/assets/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!r.ok) throw new Error('Upload thất bại');
      const data = await r.json();
      setMsg(`Upload xong ${data.count} file`);
      await loadData();
      e.target.value = '';
    } catch (ex) {
      setMsg(`Lỗi upload: ${ex.message || 'unknown'}`);
    }
  }

  function openPhoto(id) {
    const idx = photoAssets.findIndex((x) => x.id === id);
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
        if (selectionMode) togglePick(item.id);
        else onNormalClick?.();
      },
    };
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">HC Photos</div>
        <button className={`navItem ${tab === 'photos' ? 'active' : ''}`} onClick={() => { setTab('photos'); setSelectionMode(false); setSelectedIds([]); }}>📷 Ảnh</button>
        <button className={`navItem ${tab === 'docs' ? 'active' : ''}`} onClick={() => { setTab('docs'); setSelectionMode(false); setSelectedIds([]); }}>📁 Tài liệu</button>

        <div className="storageCard">
          <div className="label">Dung lượng</div>
          {usage ? (
            <>
              <div className="row"><span>Đã dùng</span><b>{fmtBytes(usage.usedBytes)}</b></div>
              <div className="row"><span>Tổng</span><b>{fmtBytes(usage.totalBytes)}</b></div>
              <div className="bar"><div className="barFill" style={{ width: `${Math.min(100, usage.usedPercent || 0)}%` }} /></div>
              <small>{usage.usedPercent}%</small>
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
          </div>
        </header>

        {msg && <div className="info">{msg}</div>}
        {err && <div className="error">{err}</div>}

        {tab === 'photos' && (
          <section>
            {photoGroups.map(([month, items]) => (
              <div key={month} className="monthBlock">
                <div className="monthTitle">{month} · {items.length}</div>
                <div className="grid">
                  {items.map((a) => {
                    const src = `${api}/api/assets/_media/original/${a.id}`;
                    const picked = selectedIds.includes(a.id);
                    return (
                      <div key={a.id} className={`tile ${picked ? 'picked' : ''}`} {...cardHandlers(a, () => openPhoto(a.id))}>
                        {a.type === 'image' ? (
                          <img src={src} alt={a.originalName} className="thumb" />
                        ) : (
                          <video src={src} className="thumb" muted />
                        )}
                        <div className="caption">{a.originalName}</div>
                        {picked && <div className="badge">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
          <button className="nav left" onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i <= 0 ? photoAssets.length - 1 : i - 1)); }}>‹</button>
          <div className="stage" onClick={(e) => e.stopPropagation()}>
            <div className="stageTitle">{active.originalName}</div>
            {active.type === 'image' ? (
              <img src={`${api}/api/assets/_media/original/${active.id}`} alt={active.originalName} className="full" />
            ) : (
              <video src={`${api}/api/assets/_media/original/${active.id}`} controls autoPlay className="full" />
            )}
          </div>
          <button className="nav right" onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i >= photoAssets.length - 1 ? 0 : i + 1)); }}>›</button>
          <button className="close" onClick={(e) => { e.stopPropagation(); setActiveIndex(-1); }}>✕</button>
        </div>
      )}

      <style jsx>{`
        .shell { display: grid; grid-template-columns: 250px 1fr; min-height: 100vh; background: #121212; color: #e7e7e7; }
        .sidebar { border-right: 1px solid #2a2a2a; padding: 20px 14px; position: sticky; top: 0; height: 100vh; }
        .logo { font-size: 20px; font-weight: 700; margin-bottom: 14px; }
        .navItem { width: 100%; text-align: left; border: 0; padding: 11px 12px; border-radius: 12px; margin-bottom: 6px; background: transparent; color: #dcdcdc; cursor: pointer; }
        .navItem:hover { background: #1f1f1f; }
        .navItem.active { background: #2b3548; color: #9fc4ff; }
        .storageCard { margin-top: 18px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 12px; }
        .label { font-size: 12px; opacity: 0.75; margin-bottom: 8px; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .bar { height: 10px; border-radius: 99px; overflow: hidden; background: #2d2d2d; margin: 6px 0; }
        .barFill { height: 100%; background: linear-gradient(90deg, #7daeff, #4d7cff); }

        .main { padding: 18px 24px 28px; }
        .topbar { display: flex; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .search { flex: 1; max-width: 650px; background: #232323; border: 1px solid #343434; color: #f2f2f2; border-radius: 24px; padding: 12px 16px; outline: none; }
        .actions { display: flex; gap: 8px; }
        .uploadBtn { background: #4f7cff; color: white; border-radius: 10px; padding: 10px 14px; cursor: pointer; font-weight: 600; }
        .ghost { background: transparent; border: 1px solid #4a4a4a; color: #ddd; border-radius: 10px; padding: 10px 12px; cursor: pointer; }
        .info { color: #9dc8ff; margin-bottom: 8px; }
        .error { color: #ff9b9b; margin-bottom: 8px; }

        .monthBlock { margin-bottom: 18px; }
        .monthTitle { font-size: 14px; font-weight: 700; margin-bottom: 10px; opacity: 0.92; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
        .tile { background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 12px; overflow: hidden; cursor: pointer; position: relative; }
        .tile:hover { border-color: #4a4a4a; }
        .tile.picked { border-color: #7daeff; }
        .thumb { width: 100%; height: 150px; object-fit: cover; display: block; background: #000; }
        .caption { padding: 8px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .badge { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 999px; background: #7daeff; color: #0b1b35; display: grid; place-items: center; font-weight: 700; }

        .docFilters { margin-bottom: 10px; display: flex; gap: 8px; align-items: center; }
        .docFilters select { background: #232323; color: #eee; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px 10px; }
        .docGroup { margin-bottom: 18px; }
        .docGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
        .docCard { background: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 12px; padding: 10px; cursor: pointer; position: relative; }
        .docCard.picked { border-color: #7daeff; }
        .docName { font-weight: 700; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .docMeta { font-size: 12px; opacity: 0.8; }

        .viewer { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .stage { width: 92vw; max-width: 1300px; max-height: 90vh; text-align: center; }
        .stageTitle { margin-bottom: 8px; font-weight: 700; }
        .full { max-width: 100%; max-height: 82vh; object-fit: contain; background: #000; }
        .nav { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; border-radius: 999px; border: 0; font-size: 34px; color: white; background: rgba(255,255,255,0.14); cursor: pointer; }
        .left { left: 16px; }
        .right { right: 16px; }
        .close { position: absolute; right: 16px; top: 16px; width: 44px; height: 44px; border-radius: 999px; border: 0; background: rgba(255,255,255,0.14); color: white; font-size: 18px; cursor: pointer; }

        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
          .sidebar { position: relative; height: auto; border-right: 0; border-bottom: 1px solid #2a2a2a; }
        }
      `}</style>
    </div>
  );
}
