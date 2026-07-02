'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCloud } from '../../../context/CloudContext';
import AssetGrid from '../../../components/AssetGrid';
import DocView from '../../../components/DocView';
import SmartVideo from '../../../components/SmartVideo';
import { Asset } from '../../../types';
import { fmtBytes } from '../../../lib/utils';
import * as Icons from '../../../components/Icons';

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string[] | undefined;

  const {
    api, t, language,
    tab, setTab,
    activeWorkspace, setActiveWorkspace,
    spaces,
    posts, setPosts,
    postCaption, setPostCaption,
    postFiles, setPostFiles,
    selectionMode, setSelectionMode,
    selectedIds, setSelectedIds,
    activeIndex, setActiveIndex,
    collectionView, setCollectionView,
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
    
    // operations
    handleCreatePost,
    loadData,
    
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

  // Compute dashboard metrics from active assets
  const dashboardStats = React.useMemo(() => {
    const activeAssets = assets.filter(a => !a.isDeleted);
    const photosVideos = activeAssets.filter(a => a.type === 'image' || a.type === 'video');
    const documents = activeAssets.filter(a => a.type !== 'image' && a.type !== 'video');
    const trashed = assets.filter(a => a.isDeleted);

    const photosVideosCount = photosVideos.length;
    const photosVideosSize = photosVideos.reduce((acc, a) => acc + (a.size || 0), 0);

    const docsCount = documents.length;
    const docsSize = documents.reduce((acc, a) => acc + (a.size || 0), 0);

    const trashCount = trashed.length;
    const trashSize = usage?.breakdown?.trashBytes || trashed.reduce((acc, a) => acc + (a.size || 0), 0);

    return {
      photosVideosCount,
      photosVideosSize,
      docsCount,
      docsSize,
      spacesCount: spaces.length,
      trashCount,
      trashSize
    };
  }, [assets, spaces, usage]);

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
    } else if (primary === 'space' && slug[1]) {
      const spaceId = slug[1];
      const found = spaces.find((s) => s.id === spaceId);
      setTab('space');
      setActiveWorkspace((prev) => {
        if (prev.type === 'space' && prev.id === spaceId) {
          if (found && (prev.name !== found.name || prev.spaceType !== found.type)) {
            return {
              type: 'space',
              id: spaceId,
              name: found.name,
              spaceType: found.type,
            };
          }
          return prev;
        }
        return {
          type: 'space',
          id: spaceId,
          name: found?.name || 'Loading space...',
          spaceType: found?.type || 'journal',
        };
      });
    }
    setSelectionMode(false);
    setSelectedIds([]);
  }, [slug, router, spaces, setTab, setActiveWorkspace, setSelectionMode, setSelectedIds]);

  // Background fetch to update data silently when tab changes
  useEffect(() => {
    loadData(true);
  }, [slug]);

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
          />
        </>
      )}

      {tab === 'dashboard' && (
        <>
          <div className="pageHeader">
            <h1>{t('sidebar.dashboard') || 'Tổng quan'}</h1>
            <p>{t('dashboard.subtitle') || 'Xem và quản lý toàn bộ tệp tin, hình ảnh, tài liệu của bạn tại một nơi.'}</p>
          </div>

          {/* Dashboard Section */}
          <div className="dashboardSection">
            {usage?.processingCount > 0 && (
              <div className="processingBanner">
                <span className="spinningIcon"><Icons.Flash size={16} /></span>
                <span>
                  {t('dashboard.processingFiles', { count: usage.processingCount }) || 
                    `Hệ thống đang tối ưu hóa ${usage.processingCount} tệp tin ngầm...`}
                </span>
              </div>
            )}

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
                <div className="statCard clickableCard" onClick={() => setTab('photos')}>
                  <div className="statIcon iconPhotos">
                    <Icons.Photos size={20} />
                  </div>
                  <div className="statInfo">
                    <h4>{t('sidebar.allPhotosVideos') || 'Ảnh & Video'}</h4>
                    <p className="statCount">{t('dashboard.photosVideosCount', { count: dashboardStats.photosVideosCount }) || `${dashboardStats.photosVideosCount} tệp`}</p>
                    <p className="statSize">{fmtBytes(dashboardStats.photosVideosSize)}</p>
                  </div>
                </div>

                {/* Documents Card */}
                <div className="statCard clickableCard" onClick={() => setTab('docs')}>
                  <div className="statIcon iconDocs">
                    <Icons.Documents size={20} />
                  </div>
                  <div className="statInfo">
                    <h4>{t('sidebar.documents') || 'Tài liệu'}</h4>
                    <p className="statCount">{t('dashboard.docsCount', { count: dashboardStats.docsCount }) || `${dashboardStats.docsCount} tài liệu`}</p>
                    <p className="statSize">{fmtBytes(dashboardStats.docsSize)}</p>
                  </div>
                </div>

                {/* Spaces Card */}
                <div className="statCard clickableCard" onClick={() => setTab('spaces')}>
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
                <div className="statCard clickableCard" onClick={() => setAllFilesCollectionView('trash')}>
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

          <div className="viewTabs">
            <button 
              className={`tabBtn ${allFilesCollectionView === 'all' ? 'active' : ''}`}
              onClick={() => setAllFilesCollectionView('all')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Folder size={14} />
              {t('sidebar.all') || 'Tất cả'}
            </button>
            <button 
              className={`tabBtn ${allFilesCollectionView === 'recent' ? 'active' : ''}`}
              onClick={() => setAllFilesCollectionView('recent')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Flash size={14} />
              {t('sidebar.recentlyAdded') || 'Mới thêm'}
            </button>
            <button 
              className={`tabBtn ${allFilesCollectionView === 'trash' ? 'active' : ''}`}
              onClick={() => setAllFilesCollectionView('trash')}
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
            collectionView={allFilesCollectionView}
            photoGroups={allActiveAssetsGrouped}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            selectedIds={selectedIds}
            api={api}
            cardHandlers={(item) => cardHandlers(item, () => openAll(item.id))}
            openPhoto={openAll}
            t={t}
          />
        </>
      )}

      {tab === 'spaces' && (
        <div className="spacesDirectory">
          <div className="pageHeader">
            <h1>{t('spaces.title') || 'Không gian con cá nhân'}</h1>
            <p>{t('spaces.subtitle') || 'Quản lý các nhật ký, bộ sưu tập tệp tin và dự án tài liệu riêng tư của bạn.'}</p>
          </div>
          
          <div className="spacesGrid">
            <div className="spaceCard createCard" onClick={() => setShowCreateSpaceModal(true)}>
              <div className="createIcon"><Icons.Plus size={28} /></div>
              <div className="createLabel">{t('spaces.create') || 'Tạo không gian con'}</div>
              <div className="createSub">Nhật ký, Bộ sưu tập hoặc Dự án</div>
            </div>

            {spaces.map((sp) => (
              <div 
                key={sp.id} 
                className="spaceCard"
                onClick={() => {
                  router.push(`/cloud/space/${sp.id}`);
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
                <p className="spaceCardDesc">{sp.description || 'Không có mô tả cho không gian này.'}</p>
                <div className="spaceCardFooter">
                  <span>Đã tạo: {new Date(sp.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'space' && activeWorkspace.type === 'space' && activeWorkspace.spaceType === 'project' && (
        <>
          <div className="pageHeader">
            <h1>{activeWorkspace.name}</h1>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Project size={14} />
              <span>{t('spaces.project') || 'Không gian Dự án'} · {t('spaces.projectDesc') || 'Quản lý tài liệu dự án'}</span>
            </p>
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
          />
        </>
      )}

      {tab === 'space' && activeWorkspace.type === 'space' && activeWorkspace.spaceType !== 'project' && (
        <div className="spaceTimelineView">
          <div className="pageHeader">
            <h1>{activeWorkspace.name}</h1>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {activeWorkspace.spaceType === 'journal' ? (
                <>
                  <Icons.Journal size={14} />
                  <span>{t('spaces.journal') || 'Không gian Nhật ký'} · {t('spaces.journalDesc') || 'Ghi chép câu chuyện'}</span>
                </>
              ) : (
                <>
                  <Icons.Collection size={14} />
                  <span>{t('spaces.collection') || 'Không gian Bộ sưu tập'} · {t('spaces.collectionDesc') || 'Lưu trữ file'}</span>
                </>
              )}
            </p>
          </div>
          <div className="postComposer">
            <textarea 
              className="composerInput"
              placeholder={activeWorkspace.spaceType === 'journal' ? 'Viết gì đó cho hôm nay...' : 'Ghi chú cho tệp đính kèm...'}
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
                onChange={(e) => setPostFiles(Array.from(e.target.files || []))} 
                style={{ display: 'none' }}
              />
              <button className="submitPostBtn" onClick={handleCreatePost} disabled={!postCaption.trim() && postFiles.length === 0}>
                Đăng bài
              </button>
            </div>
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
              <div className="emptyHint">Chưa có bài đăng nào trong không gian này. Hãy là người đầu tiên đăng bài!</div>
            )}
            {posts.map((post) => (
              <div key={post.id} className="postCard">
                <div className="postHeader">
                  <div className="postAuthor">
                    <span className="avatarCircle">{user ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                    <span className="authorName">{user ? user.name : 'Unknown'}</span>
                  </div>
                  <span className="postTime">{new Date(post.createdAt).toLocaleString('vi-VN')}</span>
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
                            <div className="postVideoThumb">
                              <SmartVideo 
                                hlsSrc={asset.hlsRelPath ? `${api}/api/assets/_media/hls/${asset.id}/master.m3u8` : undefined} 
                                mp4Src={asset.playRelPath ? `${api}/api/assets/_media/play/${asset.id}` : `${api}/api/assets/_media/original/${asset.id}`} 
                                controls 
                              />
                            </div>
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

      {hasMore && (
        tab === 'photos' || 
        tab === 'docs' || 
        tab === 'dashboard' || 
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
        .dashboardSection {
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
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
      `}</style>
    </>
  );
}
