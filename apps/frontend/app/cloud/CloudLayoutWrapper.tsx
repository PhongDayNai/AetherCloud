'use client';

import React, { useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import MediaViewer from '../../components/MediaViewer';
import SettingsModal from '../../components/SettingsModal';
import CreateSpaceModal from '../../components/CreateSpaceModal';
import { useCloud, ToastItem } from '../../context/CloudContext';

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 4700);

    const removeTimer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  return (
    <div className={`toastItem ${toast.type === 'error' ? 'toastError' : 'toastInfo'} ${isExiting ? 'toastExiting' : ''}`}>
      <span className="toastIcon">
        {toast.type === 'error' ? '✕' : '✓'}
      </span>
      <span className="toastMsg">{toast.message}</span>
      <button className="toastCloseBtn" onClick={handleClose}>
        ✕
      </button>
    </div>
  );
}

export default function CloudLayoutWrapper({ children }: { children: React.ReactNode }) {
  const {
    tab, setTab,
    collectionView, setCollectionView,
    selectedAlbum, setSelectedAlbum,
    setSelectionMode, setSelectedIds,
    basePhotoAssets, docs, trashedDocs,
    docCollectionView, setDocCollectionView,
    docCategoryFilter, setDocCategoryFilter,
    setSelectedDocProject, albumsExpanded, setAlbumsExpanded,
    availableAlbums, docProjectsExpanded, setDocProjectsExpanded,
    selectedDocProject, docProjects, docsBase, docCategoryCounts,
    docKindsExpanded, setDocKindsExpanded, docTypes, docTypeFilter, setDocTypeFilter,
    tags, selectedFilterTags, toggleFilterTag, setSelectedFilterTags,
    usage, showProfileMenu, setShowProfileMenu, user,
    setShowSettingsModal, handleLogout, t, activeWorkspace,
    setActiveWorkspace, spaces,

    search, setSearch, selectionMode, selectedIds, onUpload, addSelectedToAlbum,
    addSelectedToDocProject, moveSelectedToTrash, restoreSelectedFromTrash,
    purgeSelectedForever, msg, err,
    toasts, removeToast,

    active, albumFilteredPhotos, docsFiltered, activeIndex, setActiveIndex,
    showInfo, setShowInfo, showAlbumPicker, setShowAlbumPicker,
    showTagPicker, setShowTagPicker, activeMediaFit, setActiveMediaFit,
    albums, albumQuery, setAlbumQuery, tagQuery, setTagQuery,
    selectedAlbumsForActive, selectedTagsForActive, toggleAlbumSelection,
    toggleTagSelection, saveActiveAlbums, saveActiveTags,
    createNewAlbumInSelection, createNewTagInSelection, loadAlbums, loadTags, setMsg, api,

    showDocProjectPicker, setShowDocProjectPicker,
    docProjectQuery, setDocProjectQuery,
    selectedDocProjectsForActive,
    toggleDocProjectSelection, createNewDocProjectInSelection,
    saveActiveDocProjects, loadDocProjects,

    showSettingsModal, setUser,
    mustChangePassword, setMustChangePassword, setErr,
    groupByTimeEnabled, setGroupByTimeEnabled, groupMode, setGroupMode,
    showCreateSpaceModal, setShowCreateSpaceModal, handleCreateSpace,
    allActiveAssets, spaceAssets
  } = useCloud();

  return (
    <div className="shell">
      <Sidebar
        tab={tab}
        setTab={setTab}
        collectionView={collectionView}
        setCollectionView={setCollectionView}
        selectedAlbum={selectedAlbum}
        setSelectedAlbum={setSelectedAlbum}
        setSelectionMode={setSelectionMode}
        setSelectedIds={setSelectedIds}
        basePhotoAssets={basePhotoAssets}
        docs={docs}
        trashedDocs={trashedDocs}
        docCollectionView={docCollectionView}
        setDocCollectionView={setDocCollectionView}
        docCategoryFilter={docCategoryFilter}
        setDocCategoryFilter={setDocCategoryFilter}
        setSelectedDocProject={setSelectedDocProject}
        albumsExpanded={albumsExpanded}
        setAlbumsExpanded={setAlbumsExpanded}
        availableAlbums={availableAlbums}
        docProjectsExpanded={docProjectsExpanded}
        setDocProjectsExpanded={setDocProjectsExpanded}
        selectedDocProject={selectedDocProject}
        docProjects={docProjects}
        docsBase={docsBase}
        docCategoryCounts={docCategoryCounts}
        docKindsExpanded={docKindsExpanded}
        setDocKindsExpanded={setDocKindsExpanded}
        docTypes={docTypes}
        docTypeFilter={docTypeFilter}
        setDocTypeFilter={setDocTypeFilter}
        tags={tags}
        selectedFilterTags={selectedFilterTags}
        toggleFilterTag={toggleFilterTag}
        setSelectedFilterTags={setSelectedFilterTags}
        usage={usage}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        user={user}
        setShowSettingsModal={setShowSettingsModal}
        handleLogout={handleLogout}
        t={t}
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        spaces={spaces}
      />

      <main className="main">
        <Topbar
          search={search}
          setSearch={setSearch}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          tab={tab}
          collectionView={collectionView}
          docCollectionView={docCollectionView}
          onUpload={onUpload}
          addSelectedToAlbum={addSelectedToAlbum}
          addSelectedToDocProject={addSelectedToDocProject}
          moveSelectedToTrash={moveSelectedToTrash}
          restoreSelectedFromTrash={restoreSelectedFromTrash}
          purgeSelectedForever={purgeSelectedForever}
          t={t}
        />

        <div className="toastContainer">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={removeToast} />
          ))}
        </div>

        {children}
      </main>

      <MediaViewer
        active={active}
        tab={tab}
        albumFilteredPhotos={tab === 'dashboard' ? allActiveAssets : tab === 'space' ? spaceAssets : albumFilteredPhotos}
        docsFiltered={tab === 'dashboard' ? allActiveAssets : tab === 'space' ? spaceAssets : docsFiltered}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        showInfo={showInfo}
        setShowInfo={setShowInfo}
        showAlbumPicker={showAlbumPicker}
        setShowAlbumPicker={setShowAlbumPicker}
        showTagPicker={showTagPicker}
        setShowTagPicker={setShowTagPicker}
        showDocProjectPicker={showDocProjectPicker}
        setShowDocProjectPicker={setShowDocProjectPicker}
        activeMediaFit={activeMediaFit}
        setActiveMediaFit={setActiveMediaFit}
        albumQuery={albumQuery}
        setAlbumQuery={setAlbumQuery}
        docProjectQuery={docProjectQuery}
        setDocProjectQuery={setDocProjectQuery}
        tagQuery={tagQuery}
        setTagQuery={setTagQuery}
        albums={albums}
        docProjects={docProjects}
        tags={tags}
        selectedAlbumsForActive={selectedAlbumsForActive}
        selectedDocProjectsForActive={selectedDocProjectsForActive}
        selectedTagsForActive={selectedTagsForActive}
        toggleAlbumSelection={toggleAlbumSelection}
        toggleDocProjectSelection={toggleDocProjectSelection}
        toggleTagSelection={toggleTagSelection}
        saveActiveAlbums={saveActiveAlbums}
        saveActiveDocProjects={saveActiveDocProjects}
        saveActiveTags={saveActiveTags}
        createNewAlbumInSelection={createNewAlbumInSelection}
        createNewDocProjectInSelection={createNewDocProjectInSelection}
        createNewTagInSelection={createNewTagInSelection}
        loadAlbums={loadAlbums}
        loadDocProjects={loadDocProjects}
        loadTags={loadTags}
        setMsg={setMsg}
        api={api}
        t={t}
      />
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
        groupByTimeEnabled={groupByTimeEnabled}
        setGroupByTimeEnabled={setGroupByTimeEnabled}
        groupMode={groupMode}
        setGroupMode={setGroupMode}
      />
      <CreateSpaceModal
        isOpen={showCreateSpaceModal}
        onClose={() => setShowCreateSpaceModal(false)}
        onCreate={handleCreateSpace}
      />

      <style jsx>{`
        .shell {
          display: grid;
          grid-template-columns: 260px 1fr;
          height: 100vh;
          overflow: hidden;
          background: var(--bg-page);
          color: var(--text-primary);
          transition: background 0.25s ease, color 0.25s ease;
        }
        .main {
          padding: 24px 32px 40px;
          box-sizing: border-box;
          overflow-y: auto;
          height: 100vh;
        }
        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
        }

        /* Toast global styles using :global() */
        :global(.toastContainer) {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 10000;
          pointer-events: none;
          max-width: 360px;
          width: calc(100vw - 48px);
        }
        :global(.toastItem) {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          box-sizing: border-box;
          max-height: 120px;
          overflow: hidden;
        }
        :global(.toastItem.toastExiting) {
          animation: toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        :global(.toastInfo) {
          background: rgba(20, 20, 25, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          backdrop-filter: blur(12px);
        }
        :global(.toastError) {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          backdrop-filter: blur(12px);
        }
        :global([data-theme='light'] .toastInfo) {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.06);
          color: #1f2937;
        }
        :global([data-theme='light'] .toastError) {
          background: rgba(254, 226, 226, 0.9);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #b91c1c;
        }
        :global(.toastIcon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: bold;
          flex-shrink: 0;
        }
        :global(.toastInfo .toastIcon) {
          background: #ffffff;
          color: #09090b;
        }
        :global(.toastError .toastIcon) {
          background: #ef4444;
          color: #ffffff;
        }
        :global([data-theme='light'] .toastInfo .toastIcon) {
          background: #1f2937;
          color: #ffffff;
        }
        :global(.toastMsg) {
          flex: 1;
          line-height: 1.4;
          word-break: break-word;
          white-space: normal;
        }
        :global(.toastCloseBtn) {
          background: transparent;
          border: 0;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }
        :global(.toastCloseBtn:hover) {
          color: var(--text-primary);
        }
        @keyframes toastSlideIn {
          0% {
            opacity: 0;
            transform: translateX(120%) scale(0.9);
          }
          70% {
            transform: translateX(-5%) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toastSlideOut {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
            max-height: 120px;
            margin-bottom: 0;
            padding-top: 12px;
            padding-bottom: 12px;
          }
          100% {
            opacity: 0;
            transform: translateX(130%) scale(0.9);
            max-height: 0;
            margin-bottom: -10px;
            padding-top: 0;
            padding-bottom: 0;
            border-top-width: 0;
            border-bottom-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
