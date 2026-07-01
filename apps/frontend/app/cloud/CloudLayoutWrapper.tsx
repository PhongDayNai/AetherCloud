'use client';

import React from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import MediaViewer from '../../components/MediaViewer';
import SettingsModal from '../../components/SettingsModal';
import CreateSpaceModal from '../../components/CreateSpaceModal';
import { useCloud } from '../../context/CloudContext';

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

        {msg && <div className="info">{msg}</div>}
        {err && <div className="error">{err}</div>}

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
        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
