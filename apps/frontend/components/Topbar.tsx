'use client';

import React from 'react';
import { useCloud } from '../context/CloudContext';
import styles from './Topbar.module.css';

import NotificationBell from './topbar/NotificationBell';
import BulkActionToolbar from './topbar/BulkActionToolbar';

interface TopbarProps {
  search: string;
  setSearch: (search: string) => void;
  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
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
  const { activeWorkspace, setShowBulkShareModal, setShowUploadModal } = useCloud();

  return (
    <header className={styles.topbar}>
      <input 
        className={styles.search} 
        placeholder={t('topbar.searchPlaceholder')} 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
      />

      <div className={styles.actions}>
        <div className={styles.uploadBtn} onClick={() => setShowUploadModal(true)} style={{ userSelect: 'none' }}>
          {t('actions.upload')}
        </div>

        <button className={styles.ghost} onClick={() => { setSelectionMode((v) => !v); if (selectionMode) setSelectedIds([]); }}>
          {selectionMode ? t('actions.exitSelect', { count: selectedIds.length }) : t('actions.selectMultiple')}
        </button>

        {/* Bulk Action Toolbar subcomponent */}
        <BulkActionToolbar
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          tab={tab}
          collectionView={collectionView}
          docCollectionView={docCollectionView}
          activeWorkspace={activeWorkspace}
          addSelectedToAlbum={addSelectedToAlbum}
          addSelectedToDocProject={addSelectedToDocProject}
          moveSelectedToTrash={moveSelectedToTrash}
          restoreSelectedFromTrash={restoreSelectedFromTrash}
          purgeSelectedForever={purgeSelectedForever}
          setShowBulkShareModal={setShowBulkShareModal}
          t={t}
        />

        {/* Notification Bell Realtime subcomponent */}
        <NotificationBell t={t} />
      </div>
    </header>
  );
}
