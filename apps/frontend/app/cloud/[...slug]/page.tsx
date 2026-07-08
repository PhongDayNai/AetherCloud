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
import styles from './page.module.css';

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
          <div className={styles.pageHeader}>
            <h1>{t('sidebar.allPhotosVideos') || 'Thư viện ảnh & video'}</h1>
            <p>{t('photos.subtitle') || 'Không gian lưu trữ hình ảnh và thước phim kỷ niệm sinh động của bạn.'}</p>
          </div>
          <div className={styles.viewTabs}>
            <button
              className={`${styles.tabBtn} ${collectionView === 'all' ? styles.active : ''}`}
              onClick={() => setCollectionView('all')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Photos size={14} />
              {t('sidebar.allPhotosVideos') || 'Tất cả ảnh/video'}
            </button>
            <button
              className={`${styles.tabBtn} ${collectionView === 'recent' ? styles.active : ''}`}
              onClick={() => setCollectionView('recent')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Flash size={14} />
              {t('sidebar.recentlyAdded') || 'Mới thêm'}
            </button>
            <button
              className={`${styles.tabBtn} ${collectionView === 'albums' ? styles.active : ''}`}
              onClick={() => setCollectionView('albums')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Folder size={14} />
              {t('sidebar.albums') || (language === 'en' ? 'Albums' : 'Album')}
            </button>
            <button
              className={`${styles.tabBtn} ${collectionView === 'images' ? styles.active : ''}`}
              onClick={() => setCollectionView('images')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Photos size={14} />
              {t('sidebar.imagesOnly') || 'Ảnh'}
            </button>
            <button
              className={`${styles.tabBtn} ${collectionView === 'videos' ? styles.active : ''}`}
              onClick={() => setCollectionView('videos')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Video size={14} />
              {t('sidebar.videosOnly') || 'Video'}
            </button>
            <button
              className={`${styles.tabBtn} ${collectionView === 'trash' ? styles.active : ''}`}
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
          <div className={styles.pageHeader}>
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
        <div className={styles.spaceAllFilesView}>
          {/* Header section: Breadcrumb và Tiêu đề lớn tinh gọn */}
          <div className={`${styles.pageHeader} ${styles.flexHeader}`} style={{ borderBottom: 'none', paddingBottom: '8px' }}>
            <div className={styles.headerText}>
              <div className={styles.spaceBreadcrumb} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  className={styles.breadcrumbBack}
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
            <div className={styles.headerActions}>
              <button
                className={`${styles.actionBtn} ${styles.editBtn}`}
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
                    className={`${styles.actionBtn} ${styles.deleteBtn} ${styles.danger}`}
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

          <div className={styles.filterPanel} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            {/* Hàng 1: Chọn loại tệp chính */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>{t('spaces.fileTypeLabel')}</span>
                <div className={styles.filterButtons}>
                  <button
                    className={`${styles.filterBtn} ${spaceFileTypeTab === 'all' ? styles.active : ''}`}
                    onClick={() => { setSpaceFileTypeTab('all'); setSpaceSubFormats(['all']); }}
                  >
                    {t('spaces.typeAll')}
                  </button>
                  <button
                    className={`${styles.filterBtn} ${spaceFileTypeTab === 'media' ? styles.active : ''}`}
                    onClick={() => { setSpaceFileTypeTab('media'); setSpaceSubFormats(['all']); }}
                  >
                    {t('spaces.typeMedia')}
                  </button>
                  <button
                    className={`${styles.filterBtn} ${spaceFileTypeTab === 'docs' ? styles.active : ''}`}
                    onClick={() => { setSpaceFileTypeTab('docs'); setSpaceSubFormats(['all']); }}
                  >
                    {t('spaces.typeDocs')}
                  </button>
                </div>
              </div>

              {/* Lựa chọn sắp xếp sử dụng CustomSelect global */}
              <div className={styles.filterGroup} style={{ marginLeft: 'auto' }}>
                <span className={styles.filterLabel}>{t('spaces.sortByLabel')}</span>
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
              <div className={`${styles.filterGroup} ${styles.subFormatGroup}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', animation: 'fadeIn 0.2s ease-out' }}>
                <span className={styles.filterLabel}>{t('spaces.formatLabel')}</span>
                <div className={styles.categoryFilterRow} style={{ display: 'flex', gap: '8px', margin: 0, padding: 0, overflowX: 'visible', flexWrap: 'wrap' }}>
                  {availableSubFormats.map((cat) => {
                    const isActive = spaceSubFormats.includes(cat);
                    return (
                      <button
                        key={cat}
                        className={`${styles.catChip} ${isActive ? styles.active : ''}`}
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
            <div className={styles.emptyHint} style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('spaces.noFilesFound')}
            </div>
          ) : (
            /* Animation key thay đổi theo bộ lọc để trigger lại animation xuất hiện */
            <div
              key={`${spaceFileTypeTab}-${spaceSubFormats.join(',')}-${spaceSortBy}`}
              className={styles.spaceAssetsGrid}
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
                    className={`${styles.assetCard} ${picked ? styles.picked : ''} ${!isImg && !isVid ? styles.docCardStyle : styles.mediaCardStyle}`}
                    style={{ animationDelay: `${(idx % 24) * 0.02}s` }}
                    {...cardHandlers(item, () => {
                      const idx = processedSpaceAssets.findIndex((x) => x.id === item.id);
                      if (idx >= 0) setActiveIndex(idx);
                    })}
                  >
                    {isImg && (
                      <div className={styles.mediaWrapper}>
                        <img src={srcOriginal} alt={item.originalName} className={styles.thumb} loading="lazy" />
                        <div className={styles.mediaHoverOverlay}>
                          <span className={styles.fileNameOverlay}>{item.originalName}</span>
                          <span className={styles.fileSizeOverlay}>{fmtBytes(item.size)}</span>
                        </div>
                      </div>
                    )}
                    {isVid && (
                      item.processingStatus === 'processing' ? (
                        <div className={styles.processingPlaceholder}>
                          <div className={styles.doubleRingLoader}>
                            <div className={styles.ring1} />
                            <div className={styles.ring2} />
                          </div>
                          <span className={styles.processingText}>{t('buttons.processing') || 'Đang xử lý...'}</span>
                        </div>
                      ) : (
                        <div className={styles.mediaWrapper}>
                          <video src={srcPlay} className={styles.thumb} muted preload="none" />
                          <div className={styles.videoPlayIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </div>
                          <div className={styles.mediaHoverOverlay}>
                            <span className={styles.fileNameOverlay}>{item.originalName}</span>
                            <span className={styles.fileSizeOverlay}>{fmtBytes(item.size)}</span>
                          </div>
                        </div>
                      )
                    )}
                    {!isImg && !isVid && (
                      <div className={styles.docCardContent}>
                        <div className={styles.docIconWrap}>
                          <Icons.DocIcon item={item} size={28} />
                          <span className={styles.docExtBadge}>{item.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                        </div>
                        <div className={styles.docMetaWrap}>
                          <div className={styles.docTitleName} title={item.originalName}>{item.originalName}</div>
                          <div className={styles.docSubSize}>{fmtBytes(item.size)}</div>
                        </div>
                      </div>
                    )}
                    {picked && <div className={styles.badge}>✓</div>}
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
          <div ref={sentinelRef} className={styles.sentinelContainer}>
            {isLoadingMore ? (
              <div className={styles.sentinelLoading}>
                <span className={styles.sentinelSpinner}></span>
                <span>{t('messages.loading') || 'Đang tải thêm...'}</span>
              </div>
            ) : (
              <button className={styles.sentinelLoadMoreBtn} onClick={() => loadMoreAssets()}>
                {t('actions.loadMore') || 'Xem thêm'}
              </button>
            )}
          </div>
        )}
    </>
  );
}
