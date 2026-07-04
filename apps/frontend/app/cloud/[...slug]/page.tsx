'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCloud } from '../../../context/CloudContext';
import { useConfirm } from '../../../context/ConfirmContext';
import AssetGrid from '../../../components/AssetGrid';
import DocView from '../../../components/DocView';
import SmartVideo from '../../../components/SmartVideo';
import { Asset } from '../../../types';
import { fmtBytes, docCategoryOf, formatDateTime } from '../../../lib/utils';
import * as Icons from '../../../components/Icons';
import CustomSelect from '../../../components/CustomSelect';

export const translateSpace = (sp: any, t: any) => {
  if (!sp) return sp;
  const isGeneral = 
    sp.name === 'General' && 
    sp.type === 'journal' && 
    (sp.description === 'General discussion space for the group' || sp.description === 'Write journal entries with attachments.');
  if (isGeneral) {
    const isAlt = sp.description === 'Write journal entries with attachments.';
    return {
      ...sp,
      name: t('spaces.generalName') || sp.name,
      description: isAlt 
        ? (t('spaces.generalDescAlternative') || sp.description)
        : (t('spaces.generalDesc') || sp.description)
    };
  }
  return sp;
};

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
    selectionMode, setSelectionMode,
    selectedIds, setSelectedIds,
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

  const dashboardStats = React.useMemo(() => {
    return {
      photosVideosCount: stats?.counts?.photosCount || 0,
      docsCount: stats?.counts?.docsCount || 0,
      spacesCount: spaces.length,
      trashCount: stats?.counts?.trashCount || 0,
      trashSize: stats?.storage?.breakdown?.trashBytes || 0
    };
  }, [stats, spaces]);

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

  const recentPhotos = React.useMemo(() => {
    if (!stats?.recentPhotos) return [];
    const totalCount = 3 * photoCols;
    return stats.recentPhotos.slice(0, totalCount);
  }, [stats, photoCols]);

  const recentDocsData = React.useMemo(() => {
    if (!stats?.recentDocs) return [];
    
    // 1. Tính thời gian tệp mới nhất của mỗi category hoạt động
    const catLatestTime = Object.entries(stats.recentDocs).map(([category, files]) => {
      const fileList = files as Asset[];
      if (fileList.length === 0) return { category, latestTime: 0 };
      const latestTime = Math.max(...fileList.map(f => new Date(f.uploadedAt || f.takenAt || 0).getTime()));
      return { category, latestTime };
    }).filter(c => c.latestTime > 0);
    
    // 2. Sắp xếp các category theo latestTime giảm dần và lấy tối đa 3 category hàng đầu
    const topCategories = catLatestTime
      .sort((a, b) => b.latestTime - a.latestTime)
      .slice(0, 3)
      .map(c => c.category);
      
    // 3. Với mỗi category hàng đầu, lấy docCols - 1 file đầu tiên để chừa 1 ô cuối cho nút Xem tất cả
    const docFilesPerRow = docCols - 1;
    return topCategories.map(category => {
      const files = (stats.recentDocs[category] || []).slice(0, docFilesPerRow);
      return {
        category,
        files
      };
    });
  }, [stats, docCols]);

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

  const suppressClickRef = React.useRef<string | null>(null);
  const longPressRef = React.useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_MS = 420;

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function togglePick(id: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  }

  function beginLongPress(id: string) {
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      suppressClickRef.current = id;
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, LONG_PRESS_MS);
  }

  function endLongPress() {
    clearLongPress();
  }

  function spaceCardHandlers(spaceId: string, onNormalClick?: () => void) {
    return {
      onMouseDown: () => beginLongPress(spaceId),
      onMouseUp: endLongPress,
      onMouseLeave: endLongPress,
      onTouchStart: () => beginLongPress(spaceId),
      onTouchEnd: endLongPress,
      onClick: () => {
        if (suppressClickRef.current === spaceId) {
          suppressClickRef.current = null;
          return;
        }
        if (selectionMode || spacesSubTab === 'trash') {
          if (!selectionMode) setSelectionMode(true);
          togglePick(spaceId);
        } else {
          onNormalClick?.();
        }
      },
    };
  }

  function cardHandlers(item: Asset, onNormalClick?: () => void) {
    return {
      onMouseDown: () => beginLongPress(item.id),
      onMouseUp: endLongPress,
      onMouseLeave: endLongPress,
      onTouchStart: () => beginLongPress(item.id),
      onTouchEnd: endLongPress,
      onClick: () => {
        if (suppressClickRef.current === item.id) {
          suppressClickRef.current = null;
          return;
        }
        if (selectionMode) togglePick(item.id);
        else onNormalClick?.();
      },
    };
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
        <div ref={setDashboardContainer}>
          <div className="pageHeader">
            <h1>{t('sidebar.dashboard') || 'Tổng quan'}</h1>
            <p>{t('dashboard.subtitle') || 'Xem và quản lý toàn bộ tệp tin, hình ảnh, tài liệu của bạn tại một nơi.'}</p>
          </div>

          {/* Dashboard Section */}
          <div className="dashboardSection">


            <div className="dashboardGrid">
              {/* Storage Usage Card */}
              <div className="dashboardCard storageCard">
                <div className="cardHeader">
                  <h3>{t('dashboard.storageUsage') || 'Dung lượng lưu trữ'}</h3>
                  <span className="percentText">{usage?.usedPercent !== undefined ? `${usage.usedPercent}%` : '0%'}</span>
                </div>
                <div className="progressBarContainer">
                  <div 
                    className="progressBar" 
                    style={{ width: `${usage?.usedPercent !== undefined ? Math.min(100, Math.max(0, usage.usedPercent)) : 0}%` }}
                  />
                </div>
                <div className="storageDetails">
                  <span className="usedText">
                    {t('dashboard.usedOfTotal', { 
                      used: fmtBytes(usage?.usedBytes || 0), 
                      total: fmtBytes(usage?.totalBytes || 0) 
                    }) || `${fmtBytes(usage?.usedBytes || 0)} / ${fmtBytes(usage?.totalBytes || 0)} đã dùng`}
                  </span>
                  <span className="freeText">
                    {t('dashboard.freeSpace', { free: fmtBytes(usage?.freeBytes || 0) }) || 
                      `Còn trống ${fmtBytes(usage?.freeBytes || 0)}`}
                  </span>
                </div>
                
                {/* Storage Breakdown */}
                {usage?.breakdown && (
                  <div className="storageBreakdown">
                    <div className="breakdownItem">
                      <span className="dot originalDot"></span>
                      <span className="label">{t('dashboard.originals') || 'Tệp gốc'}:</span>
                      <span className="value">{fmtBytes(usage.breakdown.originalsBytes || 0)}</span>
                    </div>
                    <div className="breakdownItem">
                      <span className="dot derivedDot"></span>
                      <span className="label">{t('dashboard.derived') || 'Tệp tối ưu'}:</span>
                      <span className="value">{fmtBytes(usage.breakdown.derivedBytes || 0)}</span>
                    </div>
                    <div className="breakdownItem">
                      <span className="dot trashDot"></span>
                      <span className="label">{t('dashboard.trash') || 'Thùng rác'}:</span>
                      <span className="value">{fmtBytes(usage.breakdown.trashBytes || 0)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions & Quick Stats Grid */}
              <div className="statsGrid">
                {/* Photos & Videos Card */}
                <div className="statCard clickableCard" onClick={() => { setTab('photos'); router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/photos` : '/cloud/photos'); }}>
                  <div className="statIcon iconPhotos">
                    <Icons.Photos size={20} />
                  </div>
                  <div className="statInfo">
                    <h4>{t('sidebar.allPhotosVideos') || 'Ảnh & Video'}</h4>
                    <p className="statCount">{t('dashboard.photosVideosCount', { count: dashboardStats.photosVideosCount }) || `${dashboardStats.photosVideosCount} tệp`}</p>
                    <p className="statSize">{t('dashboard.albumsCount', { count: stats?.albums?.length || 0 }) || `${stats?.albums?.length || 0} album`}</p>
                  </div>
                </div>

                {/* Documents Card */}
                <div className="statCard clickableCard" onClick={() => { setTab('docs'); router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/docs` : '/cloud/docs'); }}>
                  <div className="statIcon iconDocs">
                    <Icons.Documents size={20} />
                  </div>
                  <div className="statInfo">
                    <h4>{t('sidebar.documents') || 'Tài liệu'}</h4>
                    <p className="statCount">{t('dashboard.docsCount', { count: dashboardStats.docsCount }) || `${dashboardStats.docsCount} tài liệu`}</p>
                    <p className="statSize">{t('dashboard.docProjectsCount', { count: stats?.docProjects?.length || 0 }) || `${stats?.docProjects?.length || 0} tập tài liệu`}</p>
                  </div>
                </div>

                {/* Spaces Card */}
                <div className="statCard clickableCard" onClick={() => { setTab('spaces'); router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/spaces` : '/cloud/spaces'); }}>
                  <div className="statIcon iconSpaces">
                    <Icons.Spaces size={20} />
                  </div>
                  <div className="statInfo">
                    <h4>{t('sidebar.spaces') || 'Không gian con'}</h4>
                    <p className="statCount">{t('dashboard.spacesCount', { count: dashboardStats.spacesCount }) || `${dashboardStats.spacesCount} không gian`}</p>
                    <p className="statSize">{t('dashboard.spacesDesc') || 'Ghi chép & Lưu trữ'}</p>
                  </div>
                </div>

                {/* Trash Card */}
                <div className="statCard clickableCard" onClick={() => { setTab('photos'); setCollectionView('trash'); router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/photos` : '/cloud/photos'); }}>
                  <div className="statIcon iconTrash">
                    <Icons.Trash size={20} />
                  </div>
                  <div className="statInfo">
                    <h4>{t('sidebar.trashBin') || 'Thùng rác'}</h4>
                    <p className="statCount">{t('dashboard.trashCount', { count: dashboardStats.trashCount }) || `${dashboardStats.trashCount} tệp đã xóa`}</p>
                    <p className="statSize">{fmtBytes(dashboardStats.trashSize)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Photos & Videos Section */}
          <div className="recentSection">
            <div className="recentSectionHeader">
              <h2>{t('dashboard.recentPhotosVideos')}</h2>
            </div>
            {recentPhotos.length === 0 ? (
              <div className="recentEmptyHint">{t('dashboard.noRecentPhotosVideos')}</div>
            ) : (
              <>
                <div className="recentPhotosGrid" style={{ gridTemplateColumns: `repeat(${photoCols}, 1fr)` }}>
                  {recentPhotos.map((a) => {
                    const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                    const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                    const picked = selectedIds.includes(a.id);
                    return (
                      <div key={a.id} data-id={a.id} className={`tile ${picked ? 'picked' : ''} ${a.processingStatus === 'processing' ? 'tileProcessing' : ''}`} {...cardHandlers(a, () => openAll(a.id))}>
                        {a.type === 'image' ? (
                          <img src={srcOriginal} alt={a.originalName} className="thumb" loading="lazy" />
                        ) : a.type === 'video' ? (
                          a.processingStatus === 'processing' ? (
                            <div className="processingPlaceholder">
                              <div className="doubleRingLoader">
                                <div className="ring1" />
                                <div className="ring2" />
                              </div>
                              <span className="processingText">{t('buttons.processing') || 'Đang xử lý...'}</span>
                            </div>
                          ) : (
                            <video src={srcPlay} className="thumb" muted preload="none" />
                          )
                        ) : null}
                        <div className="caption">{a.originalName}</div>
                        {picked && <div className="badge">✓</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="sectionFooter">
                  <button className="viewAllBtn" onClick={() => { setTab('photos'); router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/photos` : '/cloud/photos'); }}>
                    {t('dashboard.viewAllPhotosVideos')} &rarr;
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Recent Documents Section */}
          <div className="recentSection" style={{ marginTop: '32px' }}>
            <div className="recentSectionHeader">
              <h2>{t('dashboard.recentDocs')}</h2>
            </div>
            {recentDocsData.length === 0 ? (
              <div className="recentEmptyHint">{t('dashboard.noRecentDocs')}</div>
            ) : (
              <>
                {recentDocsData.map(({ category, files }) => (
                  <div className="recentDocRow" key={category}>
                    <h3 className="docCategoryTitle">
                      {t('categories.' + category) || category.toUpperCase()}
                    </h3>
                    <div className="recentDocsGrid" style={{ gridTemplateColumns: `repeat(${docCols}, 1fr)` }}>
                      {files.map((d) => {
                        const picked = selectedIds.includes(d.id);
                        return (
                          <div key={d.id} data-id={d.id} title={d.originalName} className={`docCard ${picked ? 'picked' : ''}`} {...cardHandlers(d, () => openAll(d.id))}>
                            <div className="docIconWrapper">
                              <Icons.DocIcon item={d} size={28} />
                              <span className="docIconTypeBadge">{d.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                            </div>
                            <div className="docTextWrap" style={{ flex: 1, minWidth: 0 }}>
                              <div className="docName" title={d.originalName}>{d.originalName}</div>
                              <div className="docMeta">{fmtBytes(d.size)}</div>
                            </div>
                            {picked && <div className="badge">✓</div>}
                          </div>
                        );
                      })}
                      {/* Card Xem tất cả loại tài liệu này ở cuối dòng */}
                      <div 
                        className="docCard viewAllDocCard"
                        title={t('dashboard.viewAllDocsOfCategory', { category: t('categories.' + category) || category.toUpperCase() })}
                        onClick={() => {
                          setTab('docs');
                          setDocCategoryFilter(category);
                          router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/docs` : '/cloud/docs');
                        }}
                      >
                        <div className="viewAllDocContent">
                          <span className="viewAllDocText">
                            {t('dashboard.viewAllDocsOfCategory', { category: t('categories.' + category) || category.toUpperCase() })}
                          </span>
                          <span className="viewAllDocArrow">&rarr;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="sectionFooter">
                  <button className="viewAllBtn" onClick={() => { setTab('docs'); setDocCategoryFilter('all'); router.push(activeWorkspace.type === 'group' ? `/cloud/group/${activeWorkspace.id}/docs` : '/cloud/docs'); }}>
                    {t('dashboard.viewAllDocs')} &rarr;
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'spaces' && (() => {
        const isGroup = activeWorkspace.type === 'group';
        const myGroupRole = isGroup ? activeWorkspace.role : null;
        const canCreateSpace = !isGroup || myGroupRole === 'owner' || myGroupRole === 'admin';

        const activeSpaces = spaces.filter(sp => !sp.is_deleted && !sp.isDeleted);
        const trashedSpaces = spaces.filter(sp => sp.is_deleted || sp.isDeleted);
        const spacesToRender = spacesSubTab === 'active' ? activeSpaces : trashedSpaces;

        return (
          <div className="spacesDirectory">
            <div className="pageHeader flexHeader">
              <div className="headerText">
                <h1>{isGroup ? t('spaces.groupTitle') : (t('spaces.title') || 'Không gian con cá nhân')}</h1>
                <p>{isGroup ? (t('spaces.groupSubtitle') || 'Quản lý các nhật ký, bộ sưu tập tệp tin và dự án tài liệu chia sẻ trong nhóm.') : (t('spaces.subtitle') || 'Quản lý các nhật ký, bộ sưu tập tệp tin và dự án tài liệu riêng tư của bạn.')}</p>
              </div>
            </div>

            {/* Selector tab Hoạt động / Thùng rác */}
            <div className="spacesSubTabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <button 
                className={`spacesTabBtn ${spacesSubTab === 'active' ? 'active' : ''}`}
                onClick={() => { setSpacesSubTab('active'); setSelectedIds([]); setSelectionMode(false); }}
                style={{
                  background: spacesSubTab === 'active' ? 'var(--bg-item-active)' : 'transparent',
                  border: 0,
                  color: spacesSubTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  transition: 'all 0.2s'
                }}
              >
                {t('spaces.activeTab') || 'Đang hoạt động'} ({activeSpaces.length})
              </button>
              <button 
                className={`spacesTabBtn ${spacesSubTab === 'trash' ? 'active' : ''}`}
                onClick={() => { setSpacesSubTab('trash'); setSelectedIds([]); setSelectionMode(false); }}
                style={{
                  background: spacesSubTab === 'trash' ? 'var(--bg-item-active)' : 'transparent',
                  border: 0,
                  color: spacesSubTab === 'trash' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  transition: 'all 0.2s'
                }}
              >
                {t('spaces.trashTab') || 'Thùng rác'} ({trashedSpaces.length})
              </button>
            </div>

            <div className="spacesGrid">
              {/* Card tạo mới: chỉ hiển thị ở tab Active và khi người dùng có quyền */}
              {spacesSubTab === 'active' && canCreateSpace && (
                <div className="spaceCard createCard" onClick={() => setShowCreateSpaceModal(true)}>
                  <div className="createIcon"><Icons.Plus size={28} /></div>
                  <div className="createLabel">{t('spaces.create') || 'Tạo không gian con'}</div>
                  <div className="createSub">{t('spaces.createTypes')}</div>
                </div>
              )}

              {spacesToRender.map((rawSp) => {
                const sp = translateSpace(rawSp, t);
                const isSelected = selectedIds.includes(sp.id);
                return (
                  <div 
                    key={sp.id} 
                    className={`spaceCard ${isSelected ? 'picked' : ''}`}
                    {...spaceCardHandlers(sp.id, () => {
                      const gId = sp.groupId || sp.group_id;
                      router.push(gId ? `/cloud/group/${gId}/space/${sp.id}` : `/cloud/space/${sp.id}`);
                    })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (spacesSubTab === 'trash') return;
                      setSelectionMode(true);
                      togglePick(sp.id);
                    }}
                  >
                    <div className="spaceCardHeader">
                      <span className="spaceTypeIcon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {sp.type === 'journal' ? <Icons.Journal size={24} /> : sp.type === 'collection' ? <Icons.Collection size={24} /> : <Icons.Project size={24} />}
                      </span>
                      <span className="spaceBadge">
                        {sp.type === 'journal' ? (t('spaces.journal') || 'Nhật ký') : sp.type === 'collection' ? (t('spaces.collection') || 'Bộ sưu tập') : (t('spaces.project') || 'Dự án')}
                      </span>
                    </div>
                    <h3 className="spaceCardName">{sp.name}</h3>
                    <p className="spaceCardDesc">{sp.description || t('spaces.noDescription')}</p>
                    <div className="spaceCardFooter">
                      <span>{t('spaces.createdLabel') || 'Đã tạo'}: {new Date(sp.createdAt || sp.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                    </div>

                    {isSelected && <div className="badge">✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {tab === 'space' && activeWorkspace.type === 'space' && activeWorkspace.spaceType === 'project' && (
        <>
          <div className="pageHeader flexHeader">
            <div className="headerText">
              <h1>{activeSpaceName}</h1>
              <div className="spaceMetaInfo" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <span className="spaceTypeRow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  <Icons.Project size={14} />
                  <span>{t('spaces.project') || 'Dự án'}</span>
                </span>
                {(() => {
                  const sp = spaces.find(s => s.id === activeWorkspace.id);
                  const trans = translateSpace(sp, t);
                  const desc = trans?.description || t('spaces.projectDesc') || 'Quản lý tài liệu dự án';
                  return (
                    <span className="spaceDescRow" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {desc}
                    </span>
                  );
                })()}
              </div>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
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

              <button className="actionBtn viewAllBtn" onClick={() => {
                router.push(activeWorkspace.type === 'space' && activeWorkspace.groupId ? `/cloud/group/${activeWorkspace.groupId}/space/${activeWorkspace.id}/all` : `/cloud/space/${activeWorkspace.id}/all`);
              }}>
                <Icons.AllFiles size={14} />
                <span>{t('spaces.viewAllFiles')}</span>
              </button>
            </div>
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
            docsGrouped={spaceAssetsGrouped}
            selectedIds={selectedIds}
            cardHandlers={(item) => cardHandlers(item, () => openSpaceAsset(item.id))}
            openDoc={openSpaceAsset}
            t={t}
            groupByTimeEnabled={groupByTimeEnabled}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
          />
        </>
      )}

      {tab === 'space' && activeWorkspace.type === 'space' && activeWorkspace.spaceType !== 'project' && (
        <div className="spaceTimelineView">
          <div className="pageHeader flexHeader">
            <div className="headerText">
              <h1>{activeSpaceName}</h1>
              <div className="spaceMetaInfo" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <span className="spaceTypeRow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {activeWorkspace.spaceType === 'journal' ? (
                    <>
                      <Icons.Journal size={14} />
                      <span>{t('spaces.journal') || 'Nhật ký'}</span>
                    </>
                  ) : (
                    <>
                      <Icons.Collection size={14} />
                      <span>{t('spaces.collection') || 'Bộ sưu tập'}</span>
                    </>
                  )}
                </span>
                {(() => {
                  const sp = spaces.find(s => s.id === activeWorkspace.id);
                  const trans = translateSpace(sp, t);
                  const desc = trans?.description || (activeWorkspace.spaceType === 'journal' ? t('spaces.journalDesc') : t('spaces.collectionDesc')) || '';
                  return (
                    <span className="spaceDescRow" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {desc}
                    </span>
                  );
                })()}
              </div>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
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

              <button className="actionBtn viewAllBtn" onClick={() => {
                router.push(activeWorkspace.type === 'space' && activeWorkspace.groupId ? `/cloud/group/${activeWorkspace.groupId}/space/${activeWorkspace.id}/all` : `/cloud/space/${activeWorkspace.id}/all`);
              }}>
                <Icons.AllFiles size={14} />
                <span>{t('spaces.viewAllFiles')}</span>
              </button>
            </div>
          </div>
          <div className="postComposer">
            <textarea 
              className="composerInput"
              placeholder={activeWorkspace.spaceType === 'journal' ? t('spaces.composerJournalPlaceholder') : t('spaces.composerCollectionPlaceholder')}
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
            />
            <div className="composerActions">
              <label htmlFor="space-file-upload" className="attachBtn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                <span>{t('actions.attachFiles') || 'Đính kèm tệp tin'} ({postFiles.length})</span>
              </label>
              <input 
                type="file" 
                id="space-file-upload" 
                multiple 
                onChange={(e) => {
                  setPostFiles(Array.from(e.target.files || []));
                  e.target.value = '';
                }} 
                style={{ display: 'none' }}
              />
              <button className="submitPostBtn" onClick={handleCreatePost} disabled={!postCaption.trim() && postFiles.length === 0}>
                {t('spaces.postButton')}
              </button>
            </div>
            
            {postFiles.length > 0 && (
              <div className="composerCheckboxContainer">
                <label className={`saveToPersonalPostLabel ${saveToPersonalPost ? 'active' : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={saveToPersonalPost} 
                    onChange={(e) => setSaveToPersonalPost(e.target.checked)} 
                    className="hidden-checkbox"
                  />
                  <span className="custom-checkbox">
                    {saveToPersonalPost && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="checkbox-text">{t('spaces.saveToPersonalCheckbox')}</span>
                </label>
              </div>
            )}
            {postFiles.length > 0 && (
              <div className="attachedFiles">
                {postFiles.map((f, i) => (
                  <div key={i} className="attachedFileChip">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.AllFiles size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>{f.name} ({fmtBytes(f.size)})</span>
                    </span>
                    <button className="removeFileBtn" onClick={() => setPostFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="postsList">
            {posts.length === 0 && (
              <div className="emptyHint">{t('spaces.emptyTimeline')}</div>
            )}
            {posts.map((post) => (
              <div key={post.id} className="postCard">
                <div className="postHeader">
                  <div className="postAuthor">
                    <span className="avatarCircle">{user ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                    <span className="authorName">{user ? user.name : 'Unknown'}</span>
                  </div>
                  <span className="postTime">{formatDateTime(post.createdAt, language)}</span>
                </div>
                {post.caption && <div className="postCaption">{post.caption}</div>}
                {post.assets && post.assets.length > 0 && (
                  <div className="postAssets">
                    {post.assets.map((asset: any) => {
                      const isImg = asset.type === 'image';
                      const isVid = asset.type === 'video';
                      const src = `${api}/api/assets/_media/original/${asset.id}`;
                      return (
                        <div key={asset.id} className="postAssetCard" onClick={() => openSpaceAsset(asset.id)}>
                          {isImg && <img src={src} alt={asset.originalName} />}
                           {isVid && (
                            asset.processingStatus === 'processing' ? (
                              <div className="postVideoProcessingPlaceholder" onClick={(e) => e.stopPropagation()}>
                                <div className="doubleRingLoader">
                                  <div className="ring1" />
                                  <div className="ring2" />
                                </div>
                                <span className="processingText">{t('buttons.processing') || 'Đang xử lý...'}</span>
                              </div>
                            ) : (
                              <div className="postVideoThumb">
                                <SmartVideo 
                                  hlsSrc={asset.hlsRelPath ? `${api}/api/assets/_media/hls/${asset.id}/master.m3u8` : undefined} 
                                  mp4Src={asset.playRelPath ? `${api}/api/assets/_media/play/${asset.id}` : `${api}/api/assets/_media/original/${asset.id}`} 
                                  controls 
                                />
                              </div>
                            )
                          )}
                          {!isImg && !isVid && (
                            <div className="postFileThumb">
                              <Icons.DocIcon item={asset} size={32} />
                              <span className="fileName">{asset.originalName}</span>
                              <span className="fileSize">{fmtBytes(asset.size)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
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
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
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
        .dashboardGrid {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .dashboardGrid {
            grid-template-columns: 1fr;
          }
        }
        .dashboardCard {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--card-shadow);
        }
        .storageCard {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        }
        .storageCard .cardHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .storageCard .cardHeader h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }
        .storageCard .percentText {
          font-size: 20px;
          font-weight: 800;
          color: var(--button-primary-bg);
        }
        .progressBarContainer {
          width: 100%;
          height: 10px;
          background: var(--bg-input);
          border-radius: 99px;
          overflow: hidden;
        }
        .progressBar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .storageDetails {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .usedText {
          color: var(--text-secondary);
          font-weight: 600;
        }
        .freeText {
          color: var(--text-muted);
        }
        .storageBreakdown {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
          margin-top: 4px;
        }
        .breakdownItem {
          display: flex;
          align-items: center;
          font-size: 11.5px;
          gap: 6px;
        }
        .breakdownItem .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .originalDot { background: #3b82f6; }
        .derivedDot { background: #8b5cf6; }
        .trashDot { background: #f87171; }
        
        .breakdownItem .label {
          color: var(--text-muted);
          flex-grow: 1;
        }
        .breakdownItem .value {
          color: var(--text-primary);
          font-weight: 600;
        }
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 500px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }
        }
        .statCard {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--card-shadow);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .clickableCard {
          cursor: pointer;
        }
        .clickableCard:hover {
          transform: translateY(-2px);
          border-color: var(--border-tile-hover);
          box-shadow: var(--card-shadow-hover);
        }
        .statIcon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .iconPhotos { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .iconDocs { background: rgba(52, 211, 153, 0.1); color: #34d399; }
        .iconSpaces { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }
        .iconTrash { background: rgba(248, 113, 113, 0.1); color: #f87171; }
        
        .statInfo {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .statInfo h4 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .statCount {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .statSize {
          margin: 0;
          font-size: 10.5px;
          color: var(--text-muted);
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
        .spacesGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .spaceCard {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          box-shadow: var(--card-shadow);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
        }
        .spaceCard:hover {
          transform: translateY(-4px);
          border-color: var(--border-tile-hover);
          box-shadow: var(--card-shadow-hover);
        }
        .spaceCardHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .spaceTypeIcon {
          font-size: 24px;
        }
        .spaceBadge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 99px;
          background: var(--bg-item-active);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .spaceCardName {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .spaceCardDesc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spaceCardFooter {
          font-size: 11px;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          padding-top: 8px;
        }
        .createCard {
          border: 2px dashed var(--border-color);
          background: transparent;
          justify-content: center;
          align-items: center;
          text-align: center;
          box-shadow: none;
        }
        .createCard:hover {
          border-color: var(--border-input-focus);
          background: rgba(255, 255, 255, 0.01);
        }
        .createIcon {
          font-size: 32px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .createLabel {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .createSub {
          font-size: 12px;
          color: var(--text-muted);
        }
        .spaceTimelineView {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .postComposer {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .composerInput {
          width: 100%;
          min-height: 80px;
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-primary);
          border-radius: 12px;
          padding: 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .composerInput:focus {
          border-color: var(--border-input-focus);
          background: var(--bg-input-focus);
        }
        .composerActions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .attachBtn {
          background: var(--bg-input);
          border: 1px solid var(--border-input);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .attachBtn:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
        }
        .submitPostBtn {
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          border: 0;
          padding: 8px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px var(--button-primary-shadow);
        }
        .submitPostBtn:hover:not(:disabled) {
          background: var(--button-primary-hover);
          transform: translateY(-1px);
        }
        .submitPostBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .attachedFiles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .attachedFileChip {
          background: var(--bg-item-active);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-primary);
        }
        .removeFileBtn {
          background: transparent;
          border: 0;
          color: var(--text-muted);
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .removeFileBtn:hover {
          color: #f87171;
        }
        .postsList {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .emptyHint {
          text-align: center;
          color: var(--text-muted);
          font-style: italic;
          font-size: 14px;
          padding: 40px 0;
        }
        .postCard {
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .postHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }
        .postAuthor {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .avatarCircle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 14px;
        }
        .authorName {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        .postTime {
          font-size: 12px;
          color: var(--text-muted);
        }
        .postCaption {
          font-size: 14.5px;
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .postAssets {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        .postAssetCard {
          border: 1px solid var(--border-tile);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-input);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .postAssetCard:hover {
          transform: scale(1.02);
          border-color: var(--border-tile-hover);
        }
        .postAssetCard img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .postVideoThumb {
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .postFileThumb {
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }
        .fileIcon {
          font-size: 32px;
        }
        .fileName {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .fileSize {
          font-size: 10px;
          color: var(--text-muted);
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
