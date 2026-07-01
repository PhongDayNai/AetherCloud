'use client';

import React from 'react';

interface TopbarProps {
  search: string;
  setSearch: (search: string) => void;
  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  tab: 'photos' | 'docs' | 'all' | 'space' | 'spaces';
  collectionView: string;
  docCollectionView: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addSelectedToAlbum: () => void;
  addSelectedToDocProject: () => void;
  moveSelectedToTrash: () => void;
  restoreSelectedFromTrash: () => void;
  purgeSelectedForever: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function Topbar({
  search,
  setSearch,
  selectionMode,
  setSelectionMode,
  selectedIds,
  setSelectedIds,
  tab,
  collectionView,
  docCollectionView,
  onUpload,
  addSelectedToAlbum,
  addSelectedToDocProject,
  moveSelectedToTrash,
  restoreSelectedFromTrash,
  purgeSelectedForever,
  t
}: TopbarProps): React.JSX.Element {
  return (
    <header className="topbar">
      <input 
        className="search" 
        placeholder={t('topbar.searchPlaceholder')} 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
      />

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

      <style jsx>{`
        .topbar {
          display: flex;
          gap: 16px;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          position: sticky;
          top: 16px;
          z-index: 10;
          background: var(--bg-sidebar);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border-strong);
          border-radius: 20px;
          padding: 10px 14px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .search {
          flex: 1;
          max-width: 600px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-primary);
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .search:focus {
          background: var(--bg-input-focus);
          border-color: var(--border-input-focus);
          box-shadow: 0 0 0 1px var(--border-color);
        }
        .search::placeholder {
          color: var(--text-muted);
        }
        .actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .uploadBtn {
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          border-radius: 12px;
          padding: 10px 18px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: 0;
          box-shadow: 0 4px 14px var(--button-primary-shadow);
          display: inline-block;
        }
        .uploadBtn:hover {
          transform: translateY(-1px);
          background: var(--button-primary-hover);
          box-shadow: 0 6px 20px var(--button-primary-hover-shadow);
        }
        .ghost {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
          border-radius: 12px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .ghost:hover {
          background: var(--bg-item-active);
          border-color: var(--border-input-focus);
          color: var(--text-primary);
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
      `}</style>
    </header>
  );
}
