'use client';

import React, { useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import MediaViewer from '../../components/MediaViewer';
import SettingsModal from '../../components/SettingsModal';
import CreateSpaceModal from '../../components/CreateSpaceModal';
import EditSpaceModal from '../../components/EditSpaceModal';
import CreateGroupModal from '../../components/CreateGroupModal';
import GroupSettingsModal from '../../components/GroupSettingsModal';
import BulkShareModal from '../../components/BulkShareModal';
import UploadModal from '../../components/UploadModal';
import ProcessingBadge from '../../components/ProcessingBadge';
import { useCloud, ToastItem } from '../../context/CloudContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useNotification } from '../../context/NotificationContext';

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  useEffect(() => {
    const duration = toast.duration || 3000;
    const exitDelay = duration - 300;

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, exitDelay);

    const removeTimer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onClose]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Chặn lan truyền click
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const handleToastClick = () => {
    if (toast.onClick) {
      toast.onClick();
    }
  };

  return (
    <div 
      className={`toastItem ${toast.type === 'error' ? 'toastError' : toast.type === 'backend' ? 'toastBackend' : 'toastInfo'} ${isExiting ? 'toastExiting' : ''} ${toast.onClick ? 'toastInteractable' : ''}`}
      onClick={handleToastClick}
    >
      <span className="toastIcon">
        {toast.type === 'error' ? '✕' : toast.type === 'backend' ? '🔔' : '✓'}
      </span>
      <div className="toastContent">
        {toast.title && <div className="toastTitle">{toast.title}</div>}
        <span className="toastMsg">{toast.message}</span>
      </div>
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
    setActiveWorkspace, spaces, spacesSubTab,

    search, setSearch, selectionMode, selectedIds, onUpload, addSelectedToAlbum,
    addSelectedToDocProject, moveSelectedToTrash, restoreSelectedFromTrash,
    purgeSelectedForever, deleteSelectedSpaces, restoreSelectedSpaces,
    purgeSelectedSpaces, msg, err,
    addToast, toasts, removeToast,

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
    showEditSpaceModal, setShowEditSpaceModal, editingSpace, setEditingSpace, handleUpdateSpace,
    allActiveAssets, spaceAssets, spaceAssetsFiltered, stats,
    showScrollAnchorBtn, scrollToAnchor,
    groups, handleCreateGroup,
    showCreateGroupModal, setShowCreateGroupModal,
    showGroupSettingsModal, setShowGroupSettingsModal,
    showBulkShareModal, setShowBulkShareModal
  } = useCloud();

  const confirm = useConfirm();
  const { registerToastListener } = useNotification();

  useEffect(() => {
    registerToastListener(addToast);
    return () => {
      registerToastListener(() => {});
    };
  }, [registerToastListener, addToast]);

  const handleBulkDelete = async () => {
    if (tab === 'spaces') {
      if (await confirm(t('spaces.confirmDeleteMultiple') || 'Bạn có chắc muốn đưa các không gian đã chọn vào thùng rác?', { isDanger: true })) {
        await deleteSelectedSpaces(selectedIds);
        setSelectedIds([]);
        setSelectionMode(false);
      }
    } else {
      await moveSelectedToTrash();
    }
  };

  const handleBulkRestore = async () => {
    if (tab === 'spaces') {
      await restoreSelectedSpaces(selectedIds);
      setSelectedIds([]);
      setSelectionMode(false);
    } else {
      await restoreSelectedFromTrash();
    }
  };

  const handleBulkPurge = async () => {
    if (tab === 'spaces') {
      if (await confirm(t('spaces.confirmPurgeMultiple') || 'CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN các không gian đã chọn và toàn bộ dữ liệu bên trong. Không thể khôi phục! Bạn chắc chắn muốn tiếp tục?', { isDanger: true })) {
        await purgeSelectedSpaces(selectedIds);
        setSelectedIds([]);
        setSelectionMode(false);
      }
    } else {
      await purgeSelectedForever();
    }
  };

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
        availableAlbums={albums.map(a => [a.name, a.count] as [string, number])}
        docProjectsExpanded={docProjectsExpanded}
        setDocProjectsExpanded={setDocProjectsExpanded}
        photosCount={stats?.counts?.photosCount || 0}
        docsCount={stats?.counts?.docsCount || 0}
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
          collectionView={tab === 'spaces' ? spacesSubTab : collectionView}
          docCollectionView={docCollectionView}
          onUpload={onUpload}
          addSelectedToAlbum={addSelectedToAlbum}
          addSelectedToDocProject={addSelectedToDocProject}
          moveSelectedToTrash={handleBulkDelete}
          restoreSelectedFromTrash={handleBulkRestore}
          purgeSelectedForever={handleBulkPurge}
          t={t}
        />

        <div className="toastContainer">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={removeToast} />
          ))}
        </div>

        <div key={`${activeWorkspace.type}-${activeWorkspace.type === 'personal' ? 'personal' : activeWorkspace.id}-${tab}-${collectionView}`} className="pageContentTransition">
          {children}
        </div>
      </main>

      <MediaViewer
        active={active}
        tab={tab}
        albumFilteredPhotos={tab === 'dashboard' ? allActiveAssets : (tab === 'space' || tab === 'space-all') ? (spaceAssetsFiltered.length > 0 ? spaceAssetsFiltered : spaceAssets) : albumFilteredPhotos}
        docsFiltered={tab === 'dashboard' ? allActiveAssets : (tab === 'space' || tab === 'space-all') ? (spaceAssetsFiltered.length > 0 ? spaceAssetsFiltered : spaceAssets) : docsFiltered}
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
      <EditSpaceModal
        isOpen={showEditSpaceModal}
        onClose={() => setShowEditSpaceModal(false)}
        space={editingSpace}
        onUpdate={handleUpdateSpace}
      />
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={handleCreateGroup}
      />
      <GroupSettingsModal
        isOpen={showGroupSettingsModal}
        onClose={() => setShowGroupSettingsModal(false)}
        group={activeWorkspace.type === 'group' ? activeWorkspace : null}
      />
      <BulkShareModal
        isOpen={showBulkShareModal}
        onClose={() => setShowBulkShareModal(false)}
        selectedIds={selectedIds}
        groups={groups}
      />
      <UploadModal />
      <ProcessingBadge />

      {showScrollAnchorBtn && (
        <button className="scrollAnchorBtn" onClick={scrollToAnchor}>
          <span>↓ Tiếp tục xem từ tệp tin cũ</span>
        </button>
      )}

      <style jsx>{`
        .scrollAnchorBtn {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          border: none;
          padding: 10px 20px;
          border-radius: 99px;
          font-weight: 700;
          font-size: 13px;
          box-shadow: 0 8px 24px var(--button-primary-shadow);
          cursor: pointer;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: floatBounce 2s infinite ease-in-out;
          transition: all 0.2s ease;
        }
        .scrollAnchorBtn:hover {
          transform: translateX(-50%) translateY(-2px);
          box-shadow: 0 12px 30px var(--button-primary-shadow);
        }
        @keyframes floatBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }

        /* Glow Highlight Effect */
        :global(.glowHighlight) {
          position: relative;
          animation: glowHighlightPulse 0.8s ease-in-out 3;
          z-index: 10;
        }
        @keyframes glowHighlightPulse {
          0%, 100% { box-shadow: none; border-color: var(--border-tile); }
          50% { box-shadow: 0 0 20px var(--button-primary-bg); border-color: var(--button-primary-bg); }
        }

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
        :global(.toastBackend) {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.4);
          color: #c7d2fe;
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
        :global([data-theme='light'] .toastBackend) {
          background: rgba(238, 242, 255, 0.95);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #3730a3;
        }
        :global(.toastInteractable) {
          cursor: pointer;
        }
        :global(.toastInteractable:hover) {
          transform: translateY(-2px) scale(1.015);
          background: rgba(99, 102, 241, 0.22);
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.25);
        }
        :global([data-theme='light'] .toastInteractable:hover) {
          background: rgba(224, 231, 255, 0.95);
          border-color: rgba(99, 102, 241, 0.5);
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
        :global(.toastBackend .toastIcon) {
          background: #6366f1;
          color: #ffffff;
          font-size: 11px;
          animation: toastBellRing 1.5s ease infinite alternate;
        }
        :global([data-theme='light'] .toastInfo .toastIcon) {
          background: #1f2937;
          color: #ffffff;
        }
        :global(.toastContent) {
          display: flex;
          flex-direction: column;
          flex: 1;
          align-items: flex-start;
          justify-content: center;
          gap: 2px;
        }
        :global(.toastTitle) {
          font-weight: 600;
          font-size: 13px;
          color: #ffffff;
        }
        :global([data-theme='light'] .toastTitle) {
          color: #1e1b4b;
        }
        :global(.toastMsg) {
          line-height: 1.4;
          word-break: break-word;
          white-space: normal;
          opacity: 0.95;
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
        @keyframes toastBellRing {
          0% { transform: rotate(0); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(4deg); }
          100% { transform: rotate(0); }
        }
        .pageContentTransition {
          animation: pageFadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        @keyframes pageFadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
