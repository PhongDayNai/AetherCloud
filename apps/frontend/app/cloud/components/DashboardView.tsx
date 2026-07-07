'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Asset } from '../../../types';
import { fmtBytes } from '../../../lib/utils';
import * as Icons from '../../../components/Icons';
import styles from './DashboardView.module.css';

interface DashboardViewProps {
  api: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  setCollectionView: (view: 'all' | 'recent' | 'images' | 'videos' | 'trash') => void;
  activeWorkspace: any;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  spaces: any[];
  usage: any;
  stats: any;
  photoCols: number;
  docCols: number;
  selectedIds: string[];
  cardHandlers: (item: Asset, onNormalClick?: () => void) => any;
  openAll: (id: string) => void;
  setDocCategoryFilter: (filter: string) => void;
  setDashboardContainer: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>;
}

export default function DashboardView({
  api,
  t,
  setCollectionView,
  activeWorkspace,
  setSelectedIds,
  setSelectionMode,
  spaces,
  usage,
  stats,
  photoCols,
  docCols,
  selectedIds,
  cardHandlers,
  openAll,
  setDocCategoryFilter,
  setDashboardContainer,
}: DashboardViewProps): React.JSX.Element {
  const router = useRouter();

  const dashboardStats = useMemo(() => {
    return {
      photosVideosCount: stats?.counts?.photosCount || 0,
      docsCount: stats?.counts?.docsCount || 0,
      spacesCount: spaces.length,
      trashCount: stats?.counts?.trashCount || 0,
      trashSize: stats?.storage?.breakdown?.trashBytes || 0,
    };
  }, [stats, spaces]);

  const recentPhotos = useMemo(() => {
    if (!stats?.recentPhotos) return [];
    const totalCount = 3 * photoCols;
    return stats.recentPhotos.slice(0, totalCount);
  }, [stats, photoCols]);

  const recentDocsData = useMemo(() => {
    if (!stats?.recentDocs) return [];

    const catLatestTime = Object.entries(stats.recentDocs)
      .map(([category, files]) => {
        const fileList = files as Asset[];
        if (fileList.length === 0) return { category, latestTime: 0 };
        const latestTime = Math.max(
          ...fileList.map((f) => new Date(f.uploadedAt || f.takenAt || 0).getTime())
        );
        return { category, latestTime };
      })
      .filter((c) => c.latestTime > 0);

    const topCategories = catLatestTime
      .sort((a, b) => b.latestTime - a.latestTime)
      .slice(0, 3)
      .map((c) => c.category);

    const docFilesPerRow = docCols - 1;
    return topCategories.map((category) => {
      const files = (stats.recentDocs[category] || []).slice(0, docFilesPerRow);
      return {
        category,
        files,
      };
    });
  }, [stats, docCols]);

  return (
    <div ref={setDashboardContainer}>
      <div className={styles.pageHeader}>
        <h1>{t('sidebar.dashboard') || 'Tổng quan'}</h1>
        <p>{t('dashboard.subtitle') || 'Xem và quản lý toàn bộ tệp tin, hình ảnh, tài liệu của bạn tại một nơi.'}</p>
      </div>

      <div className={styles.dashboardSection}>
        <div className={styles.dashboardGrid}>
          {/* Storage Usage Card */}
          <div className={`${styles.dashboardCard} ${styles.storageCard}`}>
            <div className={styles.cardHeader}>
              <h3>{t('dashboard.storageUsage') || 'Dung lượng lưu trữ'}</h3>
              <span className={styles.percentText}>
                {usage?.usedPercent !== undefined ? `${usage.usedPercent}%` : '0%'}
              </span>
            </div>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBar}
                style={{
                  width: `${usage?.usedPercent !== undefined ? Math.min(100, Math.max(0, usage.usedPercent)) : 0}%`,
                }}
              />
            </div>
            <div className={styles.storageDetails}>
              <span className={styles.usedText}>
                {t('dashboard.usedOfTotal', {
                  used: fmtBytes(usage?.usedBytes || 0),
                  total: fmtBytes(usage?.totalBytes || 0),
                }) || `${fmtBytes(usage?.usedBytes || 0)} / ${fmtBytes(usage?.totalBytes || 0)} đã dùng`}
              </span>
              <span className={styles.freeText}>
                {t('dashboard.freeSpace', { free: fmtBytes(usage?.freeBytes || 0) }) ||
                  `Còn trống ${fmtBytes(usage?.freeBytes || 0)}`}
              </span>
            </div>

            {/* Storage Breakdown */}
            {usage?.breakdown && (
              <div className={styles.storageBreakdown}>
                <div className={styles.breakdownItem}>
                  <span className={`${styles.dot} ${styles.originalDot}`}></span>
                  <span className={styles.label}>{t('dashboard.originals') || 'Tệp gốc'}:</span>
                  <span className={styles.value}>{fmtBytes(usage.breakdown.originalsBytes || 0)}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={`${styles.dot} ${styles.derivedDot}`}></span>
                  <span className={styles.label}>{t('dashboard.derived') || 'Tệp tối ưu'}:</span>
                  <span className={styles.value}>{fmtBytes(usage.breakdown.derivedBytes || 0)}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={`${styles.dot} ${styles.trashDot}`}></span>
                  <span className={styles.label}>{t('dashboard.trash') || 'Thùng rác'}:</span>
                  <span className={styles.value}>{fmtBytes(usage.breakdown.trashBytes || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Quick Stats Grid */}
          <div className={styles.statsGrid}>
            {/* Photos & Videos Card */}
            <div
              className={`${styles.statCard} ${styles.clickableCard}`}
              onClick={() => {
                setCollectionView('all');
                router.push(
                  activeWorkspace.type === 'group'
                    ? `/cloud/group/${activeWorkspace.id}/photos`
                    : '/cloud/photos'
                );
              }}
            >
              <div className={`${styles.statIcon} ${styles.iconPhotos}`}>
                <Icons.Photos size={20} />
              </div>
              <div className={styles.statInfo}>
                <h4>{t('sidebar.allPhotosVideos') || 'Ảnh & Video'}</h4>
                <p className={styles.statCount}>
                  {t('dashboard.photosVideosCount', { count: dashboardStats.photosVideosCount }) ||
                    `${dashboardStats.photosVideosCount} tệp`}
                </p>
                <p className={styles.statSize}>
                  {t('dashboard.albumsCount', { count: stats?.albums?.length || 0 }) ||
                    `${stats?.albums?.length || 0} album`}
                </p>
              </div>
            </div>

            {/* Documents Card */}
            <div
              className={`${styles.statCard} ${styles.clickableCard}`}
              onClick={() => {
                router.push(
                  activeWorkspace.type === 'group'
                    ? `/cloud/group/${activeWorkspace.id}/docs`
                    : '/cloud/docs'
                );
              }}
            >
              <div className={`${styles.statIcon} ${styles.iconDocs}`}>
                <Icons.Documents size={20} />
              </div>
              <div className={styles.statInfo}>
                <h4>{t('sidebar.documents') || 'Tài liệu'}</h4>
                <p className={styles.statCount}>
                  {t('dashboard.docsCount', { count: dashboardStats.docsCount }) ||
                    `${dashboardStats.docsCount} tài liệu`}
                </p>
                <p className={styles.statSize}>
                  {t('dashboard.docProjectsCount', { count: stats?.docProjects?.length || 0 }) ||
                    `${stats?.docProjects?.length || 0} tập tài liệu`}
                </p>
              </div>
            </div>

            {/* Spaces Card */}
            <div
              className={`${styles.statCard} ${styles.clickableCard}`}
              onClick={() => {
                router.push(
                  activeWorkspace.type === 'group'
                    ? `/cloud/group/${activeWorkspace.id}/spaces`
                    : '/cloud/spaces'
                );
              }}
            >
              <div className={`${styles.statIcon} ${styles.iconSpaces}`}>
                <Icons.Spaces size={20} />
              </div>
              <div className={styles.statInfo}>
                <h4>{t('sidebar.spaces') || 'Không gian con'}</h4>
                <p className={styles.statCount}>
                  {t('dashboard.spacesCount', { count: dashboardStats.spacesCount }) ||
                    `${dashboardStats.spacesCount} không gian`}
                </p>
                <p className={styles.statSize}>{t('dashboard.spacesDesc') || 'Ghi chép & Lưu trữ'}</p>
              </div>
            </div>

            {/* Trash Card */}
            <div
              className={`${styles.statCard} ${styles.clickableCard}`}
              onClick={() => {
                setCollectionView('trash');
                setSelectedIds([]);
                setSelectionMode(false);
                router.push(
                  activeWorkspace.type === 'group'
                    ? `/cloud/group/${activeWorkspace.id}/photos`
                    : '/cloud/photos'
                );
              }}
            >
              <div className={`${styles.statIcon} ${styles.iconTrash}`}>
                <Icons.Trash size={20} />
              </div>
              <div className={styles.statInfo}>
                <h4>{t('sidebar.trashBin') || 'Thùng rác'}</h4>
                <p className={styles.statCount}>
                  {t('dashboard.trashCount', { count: dashboardStats.trashCount }) ||
                    `${dashboardStats.trashCount} tệp đã xóa`}
                </p>
                <p className={styles.statSize}>{fmtBytes(dashboardStats.trashSize)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Photos & Videos Section */}
      <div className={styles.recentSection}>
        <div className={styles.recentSectionHeader}>
          <h2>{t('dashboard.recentPhotosVideos')}</h2>
        </div>
        {recentPhotos.length === 0 ? (
          <div className={styles.recentEmptyHint}>{t('dashboard.noRecentPhotosVideos')}</div>
        ) : (
          <>
            <div
              className={styles.recentPhotosGrid}
              style={{ gridTemplateColumns: `repeat(${photoCols}, 1fr)` }}
            >
              {recentPhotos.map((a) => {
                const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                const picked = selectedIds.includes(a.id);
                return (
                  <div
                    key={a.id}
                    data-id={a.id}
                    className={`${styles.tile} ${picked ? styles.picked : ''} ${
                      a.processingStatus === 'processing' ? styles.tileProcessing : ''
                    }`}
                    {...cardHandlers(a, () => openAll(a.id))}
                  >
                    {a.type === 'image' ? (
                      <img src={srcOriginal} alt={a.originalName} className={styles.thumb} loading="lazy" />
                    ) : a.type === 'video' ? (
                      a.processingStatus === 'processing' ? (
                        <div className={styles.processingPlaceholder}>
                          <div className={styles.doubleRingLoader}>
                            <div className={styles.ring1} />
                            <div className={styles.ring2} />
                          </div>
                          <span className={styles.processingText}>
                            {t('buttons.processing') || 'Đang xử lý...'}
                          </span>
                        </div>
                      ) : (
                        <video src={srcPlay} className={styles.thumb} muted preload="none" />
                      )
                    ) : null}
                    <div className={styles.caption}>{a.originalName}</div>
                    {picked && <div className={styles.badge}>✓</div>}
                  </div>
                );
              })}
            </div>
            <div className={styles.sectionFooter}>
              <button
                className={styles.viewAllBtn}
                onClick={() => {
                  setCollectionView('all');
                  router.push(
                    activeWorkspace.type === 'group'
                      ? `/cloud/group/${activeWorkspace.id}/photos`
                      : '/cloud/photos'
                  );
                }}
              >
                {t('dashboard.viewAllPhotosVideos')} &rarr;
              </button>
            </div>
          </>
        )}
      </div>

      {/* Recent Documents Section */}
      <div className={styles.recentSection} style={{ marginTop: '32px' }}>
        <div className={styles.recentSectionHeader}>
          <h2>{t('dashboard.recentDocs')}</h2>
        </div>
        {recentDocsData.length === 0 ? (
          <div className={styles.recentEmptyHint}>{t('dashboard.noRecentDocs')}</div>
        ) : (
          <>
            {recentDocsData.map(({ category, files }) => (
              <div className={styles.recentDocRow} key={category}>
                <h3 className={styles.docCategoryTitle}>
                  {t('categories.' + category) || category.toUpperCase()}
                </h3>
                <div
                  className={styles.recentDocsGrid}
                  style={{ gridTemplateColumns: `repeat(${docCols}, 1fr)` }}
                >
                  {files.map((d) => {
                    const picked = selectedIds.includes(d.id);
                    return (
                      <div
                        key={d.id}
                        data-id={d.id}
                        title={d.originalName}
                        className={`${styles.docCard} ${picked ? styles.picked : ''}`}
                        {...cardHandlers(d, () => openAll(d.id))}
                      >
                        <div className={styles.docIconWrapper}>
                          <Icons.DocIcon item={d} size={28} />
                          <span className={styles.docIconTypeBadge}>
                            {d.originalName.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                        <div className={styles.docTextWrap} style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.docName} title={d.originalName}>
                            {d.originalName}
                          </div>
                          <div className={styles.docMeta}>{fmtBytes(d.size)}</div>
                        </div>
                        {picked && <div className={styles.badge}>✓</div>}
                      </div>
                    );
                  })}
                  {/* Card Xem tất cả loại tài liệu này ở cuối dòng */}
                  <div
                    className={`${styles.docCard} ${styles.viewAllDocCard}`}
                    title={t('dashboard.viewAllDocsOfCategory', {
                      category: t('categories.' + category) || category.toUpperCase(),
                    })}
                    onClick={() => {
                      setDocCategoryFilter(category);
                      router.push(
                        activeWorkspace.type === 'group'
                          ? `/cloud/group/${activeWorkspace.id}/docs`
                          : '/cloud/docs'
                      );
                    }}
                  >
                    <div className={styles.viewAllDocContent}>
                      <span className={styles.viewAllDocText}>
                        {t('dashboard.viewAllDocsOfCategory', {
                          category: t('categories.' + category) || category.toUpperCase(),
                        })}
                      </span>
                      <span className={styles.viewAllDocArrow}>&rarr;</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className={styles.sectionFooter}>
              <button
                className={styles.viewAllBtn}
                onClick={() => {
                  setDocCategoryFilter('all');
                  router.push(
                    activeWorkspace.type === 'group'
                      ? `/cloud/group/${activeWorkspace.id}/docs`
                      : '/cloud/docs'
                  );
                }}
              >
                {t('dashboard.viewAllDocs')} &rarr;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
