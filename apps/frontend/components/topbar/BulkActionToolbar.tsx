'use client';

import React from 'react';
import styles from '../Topbar.module.css';

interface BulkActionToolbarProps {
  selectionMode: boolean;
  selectedIds: string[];
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  collectionView: string;
  docCollectionView: string;
  activeWorkspace: any;
  addSelectedToAlbum: () => void;
  addSelectedToDocProject: () => void;
  moveSelectedToTrash: () => void;
  restoreSelectedFromTrash: () => void;
  purgeSelectedForever: () => void;
  setShowBulkShareModal: (show: boolean) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function BulkActionToolbar({
  selectionMode,
  selectedIds,
  tab,
  collectionView,
  docCollectionView,
  activeWorkspace,
  addSelectedToAlbum,
  addSelectedToDocProject,
  moveSelectedToTrash,
  restoreSelectedFromTrash,
  purgeSelectedForever,
  setShowBulkShareModal,
  t
}: BulkActionToolbarProps): React.JSX.Element | null {
  if (!selectionMode || selectedIds.length === 0) return null;

  const isTrashView = 
    (tab === 'photos' && collectionView === 'trash') || 
    (tab === 'docs' && docCollectionView === 'trash') ||
    (tab === 'spaces' && collectionView === 'trash');

  return (
    <>
      {!isTrashView ? (
        <>
          {tab === 'photos' && (
            <button className={styles.ghost} onClick={addSelectedToAlbum}>
              {t('actions.addToAlbum')}
            </button>
          )}
          {tab === 'docs' && (
            <button className={styles.ghost} onClick={addSelectedToDocProject}>
              {t('actions.addToProject')}
            </button>
          )}
          
          {activeWorkspace.type === 'personal' && tab !== 'spaces' && (
            <button className={styles.ghost} onClick={() => setShowBulkShareModal(true)}>
              {t('actions.shareToGroup') || 'Chia sẻ vào Nhóm'}
            </button>
          )}
          
          <button className={styles.danger} onClick={moveSelectedToTrash}>
            {t('actions.delete')}
          </button>
        </>
      ) : (
        <>
          <button className={styles.ghost} onClick={restoreSelectedFromTrash}>
            {t('actions.restore')}
          </button>
          <button className={styles.danger} onClick={purgeSelectedForever}>
            {t('actions.deleteForever')}
          </button>
        </>
      )}
    </>
  );
}
