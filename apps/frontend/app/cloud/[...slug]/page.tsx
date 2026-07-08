'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCloud } from '../../../context/CloudContext';
import { useConfirm } from '../../../context/ConfirmContext';
import AssetGrid from '../../../components/AssetGrid';
import DocView from '../../../components/DocView';
import SmartVideo from '../../../components/SmartVideo';
import { Asset } from '../../../types';
import { fmtBytes, docCategoryOf, formatDateTime, translateSpace } from '../../../lib/utils';
import * as Icons from '../../../components/Icons';
import CustomSelect from '../../../components/CustomSelect';
import { useGridSelection } from '../hooks/useGridSelection';
import DashboardView from '../components/DashboardView';
import SpacesDirectoryView from '../components/SpacesDirectoryView';
import SpaceView from '../components/SpaceView';

function useGridColumns(container: HTMLDivElement | null, minWidth: number, gap: number) {
  const [columns, setColumns] = React.useState(3);

  React.useEffect(() => {
    if (!container) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const colCount = Math.floor((width + gap) / (minWidth + gap));
        setColumns(Math.max(3, colCount));
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    // Initial check
    const initialWidth = container.getBoundingClientRect().width;
    const colCount = Math.floor((initialWidth + gap) / (minWidth + gap));
    setColumns(Math.max(3, colCount));

    return () => {
      observer.disconnect();
    };
  }, [container, minWidth, gap]);

  return columns;
}

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string[] | undefined;

  const {
    api, t, language,
    tab, setTab,
    activeWorkspace, setActiveWorkspace, search,
    spaces, groups,
    posts, setPosts,
    postCaption, setPostCaption,
    postFiles, setPostFiles,
    activeIndex, setActiveIndex,
    setSpaceAssetsFiltered,
    collectionView, setCollectionView,
    spacesSubTab, setSpacesSubTab,
    docTypeFilter, setDocTypeFilter,
    docCategoryFilter, setDocCategoryFilter,
    docCollectionView, setDocCollectionView,
    allFilesCollectionView, setAllFilesCollectionView,
    groupByTimeEnabled, setGroupByTimeEnabled,
    groupMode, setGroupMode,
    expandedGroups, setExpandedGroups,
    activeMediaFit,
    user,
    selectedDocProject,
    setShowCreateSpaceModal,
    showEditSpaceModal,
    setShowEditSpaceModal,
    editingSpace,
    setEditingSpace,
    handleUpdateSpace,
    saveToPersonalPost,
    setSaveToPersonalPost,

    // operations
    handleCreatePost,
    loadData,
    handleDeleteSpace,
    deleteSelectedSpaces,
    restoreSelectedSpaces,
    purgeSelectedSpaces,

    // derived memos
    filteredAssets,
    basePhotoAssets,
    photoAssets,
    docs,
    docsBase,
    docTypes,
    docsFiltered,
    allActiveAssets,
    allActiveAssetsGrouped,
    spaceAssets,
    spaceAssetsGrouped,
    docCategoryCounts,
    docsGrouped,
    selectedAlbum,
    setSelectedAlbum,
    availableAlbums,
    albumFilteredPhotos,
    photoGroups,
    active,
    hasMore,
    isLoadingMore,
    loadMoreAssets,

    // extra properties for dashboard
    usage,
    assets
  } = useCloud();

  const {
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    togglePick,
    cardHandlers,
    spaceCardHandlers,
  } = useGridSelection();

  // Compute dashboard metrics from stats
  const { stats } = useCloud();
  const confirm = useConfirm();

  // Derived active space translation
  const activeSpaceName = React.useMemo(() => {
    if (activeWorkspace.type !== 'space') return 'name' in activeWorkspace ? activeWorkspace.name : '';
    const sp = spaces.find(s => s.id === activeWorkspace.id);
    const trans = translateSpace(sp, t);
    return trans?.name || ('name' in activeWorkspace ? activeWorkspace.name : '');
  }, [activeWorkspace, spaces, t]);

  const isGeneralSpace = React.useMemo(() => {
    if (activeWorkspace.type !== 'space') return false;
    const sp = spaces.find(s => s.id === activeWorkspace.id);
    if (!sp) return false;
    return (
      sp.name === 'General' &&
      sp.type === 'journal' &&
      (sp.description === 'General discussion space for the group' || sp.description === 'Write journal entries with attachments.')
    );
  }, [activeWorkspace, spaces]);



  const [dashboardContainer, setDashboardContainer] = React.useState<HTMLDivElement | null>(null);
  const photoCols = useGridColumns(dashboardContainer, 200, 16);
  const docCols = useGridColumns(dashboardContainer, 280, 12);

  // Local states for Space View All tab
  const [spaceFileTypeTab, setSpaceFileTypeTab] = React.useState<'all' | 'media' | 'docs'>('all');
  const [spaceSubFormats, setSpaceSubFormats] = React.useState<string[]>(['all']);
  const [spaceSortBy, setSpaceSortBy] = React.useState<string>('newest');



  const getSubFormatLabel = (cat: string) => {
    if (cat === 'all') return t('sidebar.all') || 'All';
    if (cat === 'image') return t('spaces.image') || 'Photo';
    if (cat === 'video') return t('spaces.video') || 'Video';
    const labelKey = `categories.${cat}`;
    const translated = t(labelKey);
    if (translated === labelKey) {
      return cat.toUpperCase();
    }
    return translated;
  };

  // 1. Tính toán các sub-formats khả dụng trong spaceAssets dựa theo tab chính (sắp xếp đồng bộ)
  const availableSubFormats = React.useMemo(() => {
    const order = ['all', 'image', 'video', 'pdf', 'word', 'excel', 'powerpoint', 'markdown', 'text', 'ebook', 'database', 'archive', 'installer', 'disk-image', 'font', 'certificate', 'design', 'cad', 'executable', 'code', 'config', 'other'];

    if (spaceFileTypeTab === 'media') {
      const hasImg = spaceAssets.some(a => a.type === 'image');
      const hasVid = spaceAssets.some(a => a.type === 'video');
      if (hasImg && hasVid) {
        return ['all', 'image', 'video'];
      }
      return [];
    }

    if (spaceFileTypeTab === 'docs') {
      const cats = new Set<string>();
      spaceAssets.forEach(a => {
        if (a.type !== 'image' && a.type !== 'video') {
          cats.add(docCategoryOf(a));
        }
      });
      if (cats.size > 0) {
        return ['all', ...order.filter(cat => cats.has(cat))];
      }
      return [];
    }

    // spaceFileTypeTab === 'all'
    const allTypes = new Set<string>();
    spaceAssets.forEach(a => {
      if (a.type === 'image') {
        allTypes.add('image');
      } else if (a.type === 'video') {
        allTypes.add('video');
      } else {
        allTypes.add(docCategoryOf(a));
      }
    });
    if (allTypes.size > 0) {
      return ['all', ...order.filter(cat => allTypes.has(cat))];
    }
    return [];
  }, [spaceAssets, spaceFileTypeTab]);

  const processedSpaceAssets = React.useMemo(() => {
    let list = spaceAssets;

    // 1. Lọc theo search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => (a.originalName || '').toLowerCase().includes(q) || (a.tags || []).some(tVal => tVal.toLowerCase().includes(q)));
    }

    // 2. Lọc theo tab chính (Tất cả, Media, Docs)
    if (spaceFileTypeTab === 'media') {
      list = list.filter(a => a.type === 'image' || a.type === 'video');
    } else if (spaceFileTypeTab === 'docs') {
      list = list.filter(a => a.type !== 'image' && a.type !== 'video');
    }

    // 3. Lọc theo định dạng chi tiết (SubFormats - Đa chọn)
    if (availableSubFormats.length > 0 && !spaceSubFormats.includes('all')) {
      list = list.filter(a => {
        const itemType = a.type;
        const itemCat = docCategoryOf(a);

        if (itemType === 'image' && spaceSubFormats.includes('image')) return true;
        if (itemType === 'video' && spaceSubFormats.includes('video')) return true;
        if (itemType !== 'image' && itemType !== 'video' && spaceSubFormats.includes(itemCat)) return true;

        return false;
      });
    }

    // 4. Sắp xếp (Sort)
    return list.slice().sort((a, b) => {
      if (spaceSortBy === 'newest') {
        return new Date(b.uploadedAt || b.takenAt || 0).getTime() - new Date(a.uploadedAt || a.takenAt || 0).getTime();
      }
      if (spaceSortBy === 'oldest') {
        return new Date(a.uploadedAt || a.takenAt || 0).getTime() - new Date(b.uploadedAt || b.takenAt || 0).getTime();
      }
      if (spaceSortBy === 'name_asc') {
        return (a.originalName || '').localeCompare(b.originalName || '');
      }
      if (spaceSortBy === 'name_desc') {
        return (b.originalName || '').localeCompare(a.originalName || '');
      }
      if (spaceSortBy === 'size_desc') {
        return (b.size || 0) - (a.size || 0);
      }
      if (spaceSortBy === 'size_asc') {
        return (a.size || 0) - (b.size || 0);
      }
      return 0;
    });
  }, [spaceAssets, search, spaceFileTypeTab, spaceSubFormats, spaceSortBy, availableSubFormats]);

  React.useEffect(() => {
    if (tab === 'space-all') {
      setSpaceAssetsFiltered(processedSpaceAssets);
    } else {
      setSpaceAssetsFiltered([]);
    }
  }, [processedSpaceAssets, tab, setSpaceAssetsFiltered]);


  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreAssets();
      }
    }, {
      root: null,
      rootMargin: '150px',
    });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, isLoadingMore, loadMoreAssets]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  // Sync slug with tab and workspace state reference-safely in context
  useEffect(() => {
    if (!slug || slug.length === 0) {
      router.replace('/cloud/dashboard');
      return;
    }

    const primary = slug[0];
    if (primary === 'dashboard' || primary === 'photos' || primary === 'docs' || primary === 'spaces') {
      setTab(primary);
      setActiveWorkspace((prev) => (prev.type === 'personal' ? prev : { type: 'personal' }));
    } else if (primary === 'group' && slug[1]) {
      const groupId = slug[1];
      const foundGroup = groups.find((g) => g.id === groupId);
      if (slug[2] === 'space' && slug[3]) {
        const spaceId = slug[3];
        const found = spaces.find((s) => s.id === spaceId);
        const isAll = slug[4] === 'all';
        setTab(isAll ? 'space-all' : 'space');
        setActiveWorkspace((prev) => {
          if (prev.type === 'space' && prev.id === spaceId) {
            if (found && (prev.name !== found.name || prev.spaceType !== found.type)) {
              return {
                type: 'space',
                id: spaceId,
                name: found.name,
                spaceType: found.type,
                groupId: groupId,
              };
            }
            return prev;
          }
          return {
            type: 'space',
            id: spaceId,
            name: found?.name || 'Loading space...',
            spaceType: found?.type || 'journal',
            groupId: groupId,
          };
        });
      } else {
        const subTab = slug[2] || 'dashboard';
        setTab(subTab as any);
        setActiveWorkspace((prev) => {
          if (prev.type === 'group' && prev.id === groupId) {
            if (foundGroup && prev.name !== foundGroup.name) {
              return {
                type: 'group',
                id: groupId,
                name: foundGroup.name,
                role: foundGroup.role,
              };
            }
            return prev;
          }
          return {
            type: 'group',
            id: groupId,
            name: foundGroup?.name || 'Loading group...',
            role: foundGroup?.role || 'member',
          };
        });
      }
    } else if (primary === 'space' && slug[1]) {
      const spaceId = slug[1];
      const found = spaces.find((s) => s.id === spaceId);
      const isAll = slug[2] === 'all';
      setTab(isAll ? 'space-all' : 'space');
      setActiveWorkspace((prev) => {
        if (prev.type === 'space' && prev.id === spaceId) {
          if (found && (prev.name !== found.name || prev.spaceType !== found.type)) {
            return {
              type: 'space',
              id: spaceId,
              name: found.name,
              spaceType: found.type,
              groupId: found.groupId || found.group_id,
            };
          }
          return prev;
        }
        return {
          type: 'space',
          id: spaceId,
          name: found?.name || 'Loading space...',
          spaceType: found?.type || 'journal',
          groupId: found?.groupId || found?.group_id,
        };
      });
    }
    setSelectionMode(false);
    setSelectedIds([]);
  }, [slug, router, spaces, groups, setTab, setActiveWorkspace, setSelectionMode, setSelectedIds]);



  // Helpers copied/adapted from original component
  function openPhoto(id: string) {
    const idx = albumFilteredPhotos.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function openDoc(id: string) {
    const idx = docsFiltered.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function openAll(id: string) {
    const idx = allActiveAssets.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function openSpaceAsset(id: string) {
    const idx = spaceAssets.findIndex((x) => x.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  return (
    <>
      {tab === 'photos' && (
        <>
          <div className="pageHeader">
            <h1>{t('sidebar.allPhotosVideos') || 'Thư viện ảnh & video'}</h1>
            <p>{t('photos.subtitle') || 'Không gian lưu trữ hình ảnh và thước phim kỷ niệm sinh động của bạn.'}</p>
          </div>
          <div className="viewTabs">
            <button
              className={`tabBtn ${collectionView === 'all' ? 'active' : ''}`}
              onClick={() => setCollectionView('all')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Photos size={14} />
              {t('sidebar.allPhotosVideos') || 'Tất cả ảnh/video'}
            </button>
            <button
              className={`tabBtn ${collectionView === 'recent' ? 'active' : ''}`}
              onClick={() => setCollectionView('recent')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Flash size={14} />
              {t('sidebar.recentlyAdded') || 'Mới thêm'}
            </button>
            <button
              className={`tabBtn ${collectionView === 'albums' ? 'active' : ''}`}
              onClick={() => setCollectionView('albums')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Folder size={14} />
              {t('sidebar.albums') || (language === 'en' ? 'Albums' : 'Album')}
            </button>
            <button
              className={`tabBtn ${collectionView === 'images' ? 'active' : ''}`}
              onClick={() => setCollectionView('images')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Photos size={14} />
              {t('sidebar.imagesOnly') || 'Ảnh'}
            </button>
            <button
              className={`tabBtn ${collectionView === 'videos' ? 'active' : ''}`}
              onClick={() => setCollectionView('videos')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Video size={14} />
              {t('sidebar.videosOnly') || 'Video'}
            </button>
            <button
              className={`tabBtn ${collectionView === 'trash' ? 'active' : ''}`}
              onClick={() => setCollectionView('trash')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Trash size={14} />
              {t('sidebar.trashBin') || 'Thùng rác'}
            </button>
          </div>

          {collectionView === 'albums' && selectedAlbum !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '8px' }}>
              <button 
                onClick={() => setSelectedAlbum('all')} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                {t('spaces.backToSpace') || (language === 'en' ? 'Back' : 'Quay lại')}
              </button>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{selectedAlbum}</span>
            </div>
          )}

          {collectionView === 'albums' && selectedAlbum === 'all' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
              {availableAlbums.length === 0 ? (
                <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '80px 0' }}>
                  {t('invite.emptyList') || (language === 'en' ? 'No albums created yet' : 'Chưa có album nào được tạo')}
                </div>
              ) : (
                availableAlbums.map(([name, count]) => (
                  <div 
                    key={name}
                    style={{ background: 'var(--bg-tile)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}
                    onClick={() => setSelectedAlbum(name)}
                    onMouseEnter={(e: any) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e: any) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-item-active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icons.Folder size={24} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{count} {t('photos.countItems') || (language === 'en' ? 'files' : 'tập tin')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <AssetGrid
              groupByTimeEnabled={groupByTimeEnabled}
              setGroupByTimeEnabled={setGroupByTimeEnabled}
              groupMode={groupMode}
              setGroupMode={setGroupMode}
              collectionView={collectionView}
              photoGroups={photoGroups}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              selectedIds={selectedIds}
              api={api}
              cardHandlers={cardHandlers}
              openPhoto={openPhoto}
              t={t}
            />
          )}
        </>
      )}

      {tab === 'docs' && (
        <>
          <div className="pageHeader">
            <h1>{t('sidebar.documents') || 'Tài liệu cá nhân'}</h1>
            <p>{t('docs.subtitle') || 'Lưu trữ, đọc và sắp xếp các văn bản, bảng tính, tệp PDF của bạn.'}</p>
          </div>
          <DocView
            docTypeFilter={docTypeFilter}
            setDocTypeFilter={setDocTypeFilter}
            docTypes={docTypes}
            selectedDocProject={selectedDocProject}
            docCollectionView={docCollectionView}
            setDocCollectionView={setDocCollectionView}
            docCategoryFilter={docCategoryFilter}
            setDocCategoryFilter={setDocCategoryFilter}
            docsGrouped={docsGrouped}
            selectedIds={selectedIds}
            cardHandlers={cardHandlers}
            openDoc={openDoc}
            t={t}
            groupByTimeEnabled={groupByTimeEnabled}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
          />
        </>
      )}

      {tab === 'dashboard' && (
        <DashboardView
          api={api}
          t={t}
          setCollectionView={setCollectionView}
          activeWorkspace={activeWorkspace}
          setSelectedIds={setSelectedIds}
          setSelectionMode={setSelectionMode}
          spaces={spaces}
          usage={usage}
          stats={stats}
          photoCols={photoCols}
          docCols={docCols}
          selectedIds={selectedIds}
          cardHandlers={cardHandlers}
          openAll={openAll}
          setDocCategoryFilter={setDocCategoryFilter}
          setDashboardContainer={setDashboardContainer}
        />
      )}

      {tab === 'spaces' && (
        <SpacesDirectoryView
          t={t}
          language={language}
          activeWorkspace={activeWorkspace}
          spaces={spaces}
          spacesSubTab={spacesSubTab}
          setSpacesSubTab={setSpacesSubTab}
          setSelectedIds={setSelectedIds}
          setSelectionMode={setSelectionMode}
          selectedIds={selectedIds}
          spaceCardHandlers={spaceCardHandlers}
          togglePick={togglePick}
          setShowCreateSpaceModal={setShowCreateSpaceModal}
        />
      )}

      {tab === 'space' && activeWorkspace.type === 'space' && (
        <SpaceView
          api={api}
          t={t}
          language={language}
          activeWorkspace={activeWorkspace}
          activeSpaceName={activeSpaceName}
          spaces={spaces}
          groups={groups}
          isGeneralSpace={isGeneralSpace}
          setEditingSpace={setEditingSpace}
          setShowEditSpaceModal={setShowEditSpaceModal}
          handleDeleteSpace={handleDeleteSpace}
          confirm={confirm}
          postCaption={postCaption}
          setPostCaption={setPostCaption}
          postFiles={postFiles}
          setPostFiles={setPostFiles}
          saveToPersonalPost={saveToPersonalPost}
          setSaveToPersonalPost={setSaveToPersonalPost}
          handleCreatePost={handleCreatePost}
          posts={posts}
          user={user}
          openSpaceAsset={openSpaceAsset}
          docTypeFilter={docTypeFilter}
          setDocTypeFilter={setDocTypeFilter}
          docTypes={docTypes}
          selectedDocProject={selectedDocProject}
          docCollectionView={docCollectionView}
          setDocCollectionView={setDocCollectionView}
          docCategoryFilter={docCategoryFilter}
          setDocCategoryFilter={setDocCategoryFilter}
          spaceAssetsGrouped={spaceAssetsGrouped}
          selectedIds={selectedIds}
          cardHandlers={cardHandlers}
          groupByTimeEnabled={groupByTimeEnabled}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
        />
      )}

      {tab === 'space-all' && activeWorkspace.type === 'space' && (
        <div className="spaceAllFilesView">
          {/* Header section: Breadcrumb và Tiêu đề lớn tinh gọn */}
          <div className="pageHeader flexHeader" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
            <div className="headerText">
              <div className="spaceBreadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  className="breadcrumbBack"
                  onClick={() => router.push(activeWorkspace.type === 'space' && activeWorkspace.groupId ? `/cloud/group/${activeWorkspace.groupId}/space/${activeWorkspace.id}` : `/cloud/space/${activeWorkspace.id}`)}
                  style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', transition: 'color 0.15s ease', display: 'inline-flex', alignItems: 'center' }}
                  onMouseEnter={(e: any) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e: any) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                  <span>{t('spaces.backToSpace')}</span>
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
                  {t('actions.viewAll')}
                </span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '4px 0 6px 0', letterSpacing: '-0.5px' }}>
                {activeSpaceName}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {t('spaces.totalFilesSummary', { total: spaceAssets.length, filtered: processedSpaceAssets.length })}
              </p>
            </div>
            <div className="headerActions">
              <button
                className="actionBtn editBtn"
                style={isGeneralSpace ? { visibility: 'hidden', pointerEvents: 'none' } : {}}
                onClick={() => {
                  const sp = spaces.find(s => s.id === activeWorkspace.id);
                  if (sp) {
                    setEditingSpace(sp);
                    setShowEditSpaceModal(true);
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                <span>{t('spaces.editSpace')}</span>
              </button>

              {(!groups.find(g => g.id === activeWorkspace.groupId) ||
                ['owner', 'admin'].includes(groups.find(g => g.id === activeWorkspace.groupId)?.role)) && (
                  <button
                    className="actionBtn deleteBtn danger"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      borderRadius: '12px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onClick={async () => {
                      if (await confirm(t('spaces.confirmDelete') || 'Bạn có chắc chắn muốn xóa không gian con này vào thùng rác?', { isDanger: true })) {
                        const success = await handleDeleteSpace(activeWorkspace.id);
                        if (success) {
                          if (activeWorkspace.groupId) {
                            router.push(`/cloud/group/${activeWorkspace.groupId}/spaces`);
                          } else {
                            router.push('/cloud/spaces');
                          }
                        }
                      }
                    }}
                    onMouseEnter={(e: any) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e: any) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.color = '#fca5a5';
                    }}
                  >
                    <Icons.Trash size={14} />
                    <span>{t('spaces.deleteSpace') || 'Xóa không gian'}</span>
                  </button>
                )}
            </div>
          </div>

          <div className="filterPanel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            {/* Hàng 1: Chọn loại tệp chính */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div className="filterGroup">
                <span className="filterLabel">{t('spaces.fileTypeLabel')}</span>
                <div className="filterButtons">
                  <button
                    className={`filterBtn ${spaceFileTypeTab === 'all' ? 'active' : ''}`}
                    onClick={() => { setSpaceFileTypeTab('all'); setSpaceSubFormats(['all']); }}
                  >
                    {t('spaces.typeAll')}
                  </button>
                  <button
                    className={`filterBtn ${spaceFileTypeTab === 'media' ? 'active' : ''}`}
                    onClick={() => { setSpaceFileTypeTab('media'); setSpaceSubFormats(['all']); }}
                  >
                    {t('spaces.typeMedia')}
                  </button>
                  <button
                    className={`filterBtn ${spaceFileTypeTab === 'docs' ? 'active' : ''}`}
                    onClick={() => { setSpaceFileTypeTab('docs'); setSpaceSubFormats(['all']); }}
                  >
                    {t('spaces.typeDocs')}
                  </button>
                </div>
              </div>

              {/* Lựa chọn sắp xếp sử dụng CustomSelect global */}
              <div className="filterGroup" style={{ marginLeft: 'auto' }}>
                <span className="filterLabel">{t('spaces.sortByLabel')}</span>
                <CustomSelect
                  value={spaceSortBy}
                  options={[
                    { value: 'newest', label: t('spaces.sortNewest') },
                    { value: 'oldest', label: t('spaces.sortOldest') },
                    { value: 'name_asc', label: t('spaces.sortNameAsc') },
                    { value: 'name_desc', label: t('spaces.sortNameDesc') },
                    { value: 'size_desc', label: t('spaces.sortSizeDesc') },
                    { value: 'size_asc', label: t('spaces.sortSizeAsc') }
                  ]}
                  onChange={(val) => setSpaceSortBy(val)}
                  width="160px"
                />
              </div>
            </div>

            {/* Hàng 2: Bộ lọc định dạng con (SubFormats - Multi-select Chips) */}
            {availableSubFormats.length > 0 && (
              <div className="filterGroup subFormatGroup" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', animation: 'fadeIn 0.2s ease-out' }}>
                <span className="filterLabel">{t('spaces.formatLabel')}</span>
                <div className="categoryFilterRow" style={{ display: 'flex', gap: '8px', margin: 0, padding: 0, overflowX: 'visible', flexWrap: 'wrap' }}>
                  {availableSubFormats.map((cat) => {
                    const isActive = spaceSubFormats.includes(cat);
                    return (
                      <button
                        key={cat}
                        className={`catChip ${isActive ? 'active' : ''}`}
                        style={{
                          background: isActive ? 'var(--button-primary-bg)' : 'var(--bg-tile)',
                          borderColor: isActive ? 'var(--button-primary-bg)' : 'var(--border-tile)',
                          color: isActive ? 'var(--button-primary-text)' : 'var(--text-secondary)',
                          borderRadius: '99px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => {
                          if (cat === 'all') {
                            setSpaceSubFormats(['all']);
                          } else {
                            setSpaceSubFormats((prev: string[]) => {
                              const withoutAll = prev.filter(x => x !== 'all');
                              if (withoutAll.includes(cat)) {
                                const next = withoutAll.filter(x => x !== cat);
                                return next.length === 0 ? ['all'] : next;
                              }
                              return [...withoutAll, cat];
                            });
                          }
                        }}
                      >
                        {cat === 'all'
                          ? t('sidebar.all')
                          : isActive
                            ? `✓ ${getSubFormatLabel(cat)}`
                            : `+ ${getSubFormatLabel(cat)}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {processedSpaceAssets.length === 0 ? (
            <div className="emptyHint" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('spaces.noFilesFound')}
            </div>
          ) : (
            /* Animation key thay đổi theo bộ lọc để trigger lại animation xuất hiện */
            <div
              key={`${spaceFileTypeTab}-${spaceSubFormats.join(',')}-${spaceSortBy}`}
              className="spaceAssetsGrid"
            >
              {processedSpaceAssets.map((item, idx) => {
                const isImg = item.type === 'image';
                const isVid = item.type === 'video';
                const srcOriginal = `${api}/api/assets/_media/original/${item.id}`;
                const srcPlay = `${api}/api/assets/_media/play/${item.id}`;
                const picked = selectedIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    data-id={item.id}
                    className={`assetCard ${picked ? 'picked' : ''} ${!isImg && !isVid ? 'docCardStyle' : 'mediaCardStyle'}`}
                    style={{ animationDelay: `${(idx % 24) * 0.02}s` }}
                    {...cardHandlers(item, () => {
                      const idx = processedSpaceAssets.findIndex((x) => x.id === item.id);
                      if (idx >= 0) setActiveIndex(idx);
                    })}
                  >
                    {isImg && (
                      <div className="mediaWrapper">
                        <img src={srcOriginal} alt={item.originalName} className="thumb" loading="lazy" />
                        <div className="mediaHoverOverlay">
                          <span className="fileNameOverlay">{item.originalName}</span>
                          <span className="fileSizeOverlay">{fmtBytes(item.size)}</span>
                        </div>
                      </div>
                    )}
                    {isVid && (
                      item.processingStatus === 'processing' ? (
                        <div className="processingPlaceholder">
                          <div className="doubleRingLoader">
                            <div className="ring1" />
                            <div className="ring2" />
                          </div>
                          <span className="processingText">{t('buttons.processing') || 'Đang xử lý...'}</span>
                        </div>
                      ) : (
                        <div className="mediaWrapper">
                          <video src={srcPlay} className="thumb" muted preload="none" />
                          <div className="videoPlayIcon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </div>
                          <div className="mediaHoverOverlay">
                            <span className="fileNameOverlay">{item.originalName}</span>
                            <span className="fileSizeOverlay">{fmtBytes(item.size)}</span>
                          </div>
                        </div>
                      )
                    )}
                    {!isImg && !isVid && (
                      <div className="docCardContent">
                        <div className="docIconWrap">
                          <Icons.DocIcon item={item} size={28} />
                          <span className="docExtBadge">{item.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                        </div>
                        <div className="docMetaWrap">
                          <div className="docTitleName" title={item.originalName}>{item.originalName}</div>
                          <div className="docSubSize">{fmtBytes(item.size)}</div>
                        </div>
                      </div>
                    )}
                    {picked && <div className="badge">✓</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {hasMore && (
        tab === 'photos' ||
        tab === 'docs' ||
        (tab === 'space' && activeWorkspace.type === 'space' && activeWorkspace.spaceType === 'project')
      ) && (
          <div ref={sentinelRef} className="sentinelContainer">
            {isLoadingMore ? (
              <div className="sentinelLoading">
                <span className="sentinelSpinner"></span>
                <span>{t('messages.loading') || 'Đang tải thêm...'}</span>
              </div>
            ) : (
              <button className="sentinelLoadMoreBtn" onClick={() => loadMoreAssets()}>
                {t('actions.loadMore') || 'Xem thêm'}
              </button>
            )}
          </div>
        )}

      <style jsx>{`
        .composerCheckboxContainer {
          margin: 8px 0;
          display: flex;
          align-items: center;
        }
        .saveToPersonalPostLabel {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          transition: color 0.2s ease;
          user-select: none;
          padding: 6px 0;
          position: relative;
        }
        .saveToPersonalPostLabel:hover {
          color: var(--text-secondary);
        }
        .hidden-checkbox {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          overflow: hidden;
        }
        .custom-checkbox {
          width: 16px;
          height: 16px;
          border: 2px solid #525252;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #000000;
          flex-shrink: 0;
        }
        .saveToPersonalPostLabel:hover .custom-checkbox {
          border-color: #a3a3a3;
          background: rgba(255, 255, 255, 0.05);
        }
        .saveToPersonalPostLabel.active .custom-checkbox {
          border-color: #ffffff;
          background: #ffffff;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }
        .saveToPersonalPostLabel.active .checkbox-text {
          background: linear-gradient(to right, #a3a3a3 15%, #ffffff 50%, #a3a3a3 85%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShimmer 2.5s linear infinite;
          font-weight: 600;
        }

        /* Light Mode Overrides */
        :global([data-theme='light']) .custom-checkbox {
          border-color: #d4d4d4;
          color: #ffffff;
        }
        :global([data-theme='light']) .saveToPersonalPostLabel:hover .custom-checkbox {
          border-color: #737373;
          background: rgba(0, 0, 0, 0.03);
        }
        :global([data-theme='light']) .saveToPersonalPostLabel.active .custom-checkbox {
          border-color: #000000;
          background: #000000;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.15);
        }
        :global([data-theme='light']) .saveToPersonalPostLabel.active .checkbox-text {
          background: linear-gradient(to right, #737373 15%, #000000 50%, #737373 85%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 600;
        }

        @keyframes textShimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }

        .dashboardSection {
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .recentSection {
          margin-top: 32px;
        }
        .recentSectionHeader {
          margin-bottom: 16px;
        }
        .recentSectionHeader h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .recentEmptyHint {
          font-size: 13px;
          color: var(--text-muted);
          font-style: italic;
          padding: 16px 0;
        }
        .recentPhotosGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .doubleRingLoader {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .doubleRingLoader .ring1 {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #eab308;
          animation: ring1Pulse 1.6s ease-in-out infinite;
        }
        .doubleRingLoader .ring2 {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(234, 179, 8, 0.4);
          animation: ring2Pulse 1.6s ease-in-out infinite;
        }
        @keyframes ring1Pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        @keyframes ring2Pulse {
          0% { transform: scale(1.2); opacity: 1; border-color: rgba(234, 179, 8, 0.4); }
          50% { transform: scale(0.8); opacity: 0.2; border-color: rgba(234, 179, 8, 0.1); }
          100% { transform: scale(1.2); opacity: 1; border-color: rgba(234, 179, 8, 0.4); }
        }
        .processingPlaceholder {
          height: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          gap: 12px;
        }
        .processingText {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .postVideoProcessingPlaceholder {
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          border-radius: 12px;
          gap: 12px;
          width: 100%;
        }
        .recentDocsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .recentDocRow {
          margin-bottom: 24px;
        }
        .docCategoryTitle {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          margin: 16px 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sectionFooter {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        .viewAllBtn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-tile);
          color: var(--button-primary-bg);
          padding: 10px 28px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .viewAllBtn:hover {
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          border-color: var(--button-primary-bg);
          box-shadow: 0 4px 12px var(--button-primary-shadow);
          transform: translateY(-1px);
        }
        :global([data-theme='light']) .viewAllBtn {
          background: rgba(0, 0, 0, 0.02);
        }
        :global([data-theme='light']) .viewAllBtn:hover {
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
        }
        
        .tile {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          box-shadow: var(--card-shadow);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          content-visibility: auto;
          contain-intrinsic-size: 200px 222px;
          will-change: transform, opacity;
        }
        .tile:hover {
          border-color: var(--border-tile-hover);
          transform: translateY(-4px);
          box-shadow: var(--card-shadow-hover);
        }
        .tile:hover .thumb {
          transform: scale(1.04);
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
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-top: 1px solid var(--caption-border);
        }
        .tile:hover .caption {
          color: var(--text-primary);
        }
        
        .docCard {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 14px;
          padding: 14px;
          cursor: pointer;
          position: relative;
          box-shadow: var(--card-shadow);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 12px;
          content-visibility: auto;
          contain-intrinsic-size: 280px 74px;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .docCard:hover {
          transform: translateY(-2px);
          border-color: var(--border-tile-hover);
          box-shadow: var(--card-shadow-hover);
        }
        .tile.picked, .docCard.picked, .spaceCard.picked {
          border-color: var(--button-primary-bg) !important;
          box-shadow: 0 0 0 1px var(--button-primary-bg), 0 8px 24px rgba(0, 0, 0, 0.15) !important;
        }
        .tile .badge, .docCard .badge, .spaceCard .badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          z-index: 2;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        .docName {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
          width: 100%;
        }
        .docMeta {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .docIconWrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border-tile);
          border-radius: 10px;
          flex-shrink: 0;
        }
        .docIconTypeBadge {
          position: absolute;
          bottom: -4px;
          background: var(--border-tile-hover);
          color: var(--text-primary);
          font-size: 7.5px;
          font-weight: 800;
          padding: 1px 3.5px;
          border-radius: 4px;
          border: 1px solid var(--border-tile);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          letter-spacing: 0.2px;
          pointer-events: none;
          line-height: 1;
        }
        
        .viewAllDocCard {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(139, 92, 246, 0.04)) !important;
          border: 1px dashed var(--button-primary-bg) !important;
          justify-content: center !important;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .viewAllDocContent {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: var(--button-primary-bg);
          font-weight: 700;
          font-size: 13px;
          width: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .viewAllDocText {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          text-align: center;
        }
        .viewAllDocArrow {
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .viewAllDocCard:hover .viewAllDocArrow {
          transform: translateX(4px);
        }
        .sentinelContainer {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 32px 0;
          margin-top: 16px;
        }
        .sentinelLoading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
        }
        .sentinelSpinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border-color);
          border-top-color: var(--button-primary-bg);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .sentinelLoadMoreBtn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-tile);
          color: var(--text-primary);
          padding: 8px 24px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sentinelLoadMoreBtn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--border-tile-hover);
          transform: translateY(-1px);
        }
        :global([data-theme='light']) .sentinelLoadMoreBtn {
          background: rgba(0, 0, 0, 0.02);
        }
        :global([data-theme='light']) .sentinelLoadMoreBtn:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .processingBanner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.2);
          color: #eab308;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinningIcon {
          display: inline-flex;
          animation: spin 2s linear infinite;
        }


        .tabBtn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          border-radius: 6px 6px 0 0;
        }
        .tabBtn:hover {
          color: var(--text-primary);
          background: var(--bg-item-hover);
        }
        .tabBtn.active {
          color: var(--text-primary);
          border-bottom: 2px solid var(--button-primary-bg);
        }
        .viewTabs {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .pageHeader {
          margin-bottom: 24px;
        }
        .pageHeader h1 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          color: var(--text-primary);
          margin-top: 0;
        }
        .pageHeader p {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 0;
          margin-bottom: 0;
        }



        /* space-all styles */
        .flexHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .headerActions {
          display: flex;
          gap: 10px;
        }
        .actionBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--border-input);
          background: var(--bg-input);
          color: var(--text-primary);
        }
        .actionBtn:hover {
          background: var(--bg-item-hover);
          border-color: var(--border-input-focus);
        }
        .actionBtn.viewAllBtn {
          background: var(--button-primary-bg);
          border-color: var(--button-primary-bg);
          color: var(--button-primary-text);
          box-shadow: 0 2px 8px var(--button-primary-shadow);
        }
        .actionBtn.viewAllBtn:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .backToSpaceLink {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .backToSpaceLink:hover {
          color: var(--text-primary);
        }
        .filterPanel {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 12px;
          padding: 12px 18px;
          margin-bottom: 24px;
        }
        .filterGroup {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filterLabel {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .filterButtons {
          display: flex;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
        }
        .filterBtn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .filterBtn:hover {
          color: var(--text-primary);
        }
        .filterBtn.active {
          background: var(--bg-tile);
          color: var(--text-primary);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .filterSelect {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-primary);
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 600;
          border-radius: 8px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filterSelect:focus {
          border-color: var(--border-input-focus);
        }
        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .spaceAssetsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .assetCard {
          position: relative;
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--card-shadow);
          animation: cardEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .assetCard:hover {
          transform: translateY(-2px);
          border-color: var(--border-tile-hover);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        }
        .assetCard.picked {
          border-color: var(--button-primary-bg);
          box-shadow: 0 0 0 2px var(--button-primary-bg);
        }
        .mediaCardStyle {
          aspect-ratio: 1;
        }
        .mediaWrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .mediaWrapper .thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .videoPlayIcon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 44px;
          height: 44px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .mediaHoverOverlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
          padding: 20px 12px 10px;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .assetCard:hover .mediaHoverOverlay {
          opacity: 1;
        }
        .fileNameOverlay {
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fileSizeOverlay {
          font-size: 10px;
          opacity: 0.8;
        }
        .docCardStyle {
          padding: 14px;
          display: flex;
          align-items: center;
          aspect-ratio: auto;
          min-height: 74px;
        }
        .docCardContent {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }
        .docCardContent .docIconWrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          flex-shrink: 0;
        }
        .docExtBadge {
          position: absolute;
          bottom: -4px;
          font-size: 7.5px;
          font-weight: 900;
          padding: 1px 3px;
          border-radius: 4px;
          background: var(--bg-page);
          color: var(--text-secondary);
          border: 1px solid var(--border-tile);
        }
        .docMetaWrap {
          flex: 1;
          min-width: 0;
        }
        .docTitleName {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .docSubSize {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .assetCard .badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          z-index: 2;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </>
  );
}
