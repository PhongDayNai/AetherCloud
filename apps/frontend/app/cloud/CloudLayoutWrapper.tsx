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

import Toast from '../../components/Toast';
import toastStyles from '../../components/Toast.module.css';
import styles from './CloudLayoutWrapper.module.css';

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
    <div className={styles.shell}>
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
        groups={groups}
      />

      <main className={styles.main}>
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

        <div className={toastStyles.toastContainer}>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={removeToast} />
          ))}
        </div>

        <div key={`${activeWorkspace.type}-${activeWorkspace.type === 'personal' ? 'personal' : activeWorkspace.id}-${tab}-${collectionView}`} className={styles.pageContentTransition}>
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
        group={
          activeWorkspace.type === 'group'
            ? activeWorkspace
            : activeWorkspace.type === 'space' && activeWorkspace.groupId
            ? groups.find((g) => g.id === activeWorkspace.groupId) || null
            : null
        }
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
        <button className={styles.scrollAnchorBtn} onClick={scrollToAnchor}>
          <span>↓ Tiếp tục xem từ tệp tin cũ</span>
        </button>
      )}
    </div>
  );
}
