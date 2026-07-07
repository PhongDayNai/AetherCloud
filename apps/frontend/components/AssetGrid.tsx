import React from 'react';
import { useRouter } from 'next/navigation';
import { Asset } from '../types';
import { DocIcon, ChevronRight } from './Icons';
import { useCloud } from '../context/CloudContext';
import styles from './AssetGrid.module.css';

interface AssetGridProps {
  groupByTimeEnabled: boolean;
  setGroupByTimeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  groupMode: 'month' | 'year';
  setGroupMode: (mode: 'month' | 'year') => void;
  collectionView: string;
  photoGroups: [string, Asset[]][];
  expandedGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
  selectedIds: string[];
  api: string;
  cardHandlers: (item: Asset, doubleClickCallback: () => void) => any;
  openPhoto: (id: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  showViewAll?: boolean;
}

export default function AssetGrid({
  groupByTimeEnabled,
  setGroupByTimeEnabled,
  groupMode,
  setGroupMode,
  collectionView,
  photoGroups,
  expandedGroups,
  toggleGroup,
  selectedIds,
  api,
  cardHandlers,
  openPhoto,
  t,
  showViewAll = false
}: AssetGridProps): React.JSX.Element {
  const router = useRouter();
  const { setTab, setDocCategoryFilter } = useCloud();

  const handleNavigate = (group: string) => {
    if (group === 'Ảnh & Video') {
      setTab('photos');
      router.push('/cloud/photos');
    } else {
      let filter = 'other';
      if (group === 'PDF') filter = 'pdf';
      else if (group === 'Word') filter = 'word';
      else if (group === 'Excel/CSV') filter = 'excel';
      else if (group === 'PowerPoint') filter = 'powerpoint';
      else if (group === 'Markdown') filter = 'markdown';
      else if (group === 'Text') filter = 'text';
      else if (group === 'Nén') filter = 'archive';
      else if (group === 'Code') filter = 'code';
      
      setTab('docs');
      setDocCategoryFilter(filter);
      router.push('/cloud/docs');
    }
  };

  return (
    <section className={styles.contentPane}>

      {collectionView === 'recent' && <div className={styles.hint}>{t('dashboard.recentHint')}</div>}
      {collectionView === 'trash' && <div className={styles.hint}>{t('dashboard.trashHint')}</div>}

      {photoGroups.length === 0 && <div className={styles.hint}>{t('dashboard.noDataMatching')}</div>}

      {photoGroups.map(([group, items]) => {
        const isOpen = expandedGroups[group] ?? true;
        return (
          <div key={group} className={styles.monthBlock}>
            {groupByTimeEnabled && (
              <div 
                className={styles.groupHeader} 
                role="button" 
                tabIndex={0}
                onClick={() => toggleGroup(group)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { toggleGroup(group); } }}
              >
                <span className={`${styles.groupHeaderChevron} ${isOpen ? styles.open : ''}`}>
                  <ChevronRight size={14} />
                </span>
                <span>{group}</span>
                <span className={styles.groupCount}>{items.length}</span>
                {showViewAll && (
                  <button 
                    className={styles.groupGoBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(group);
                    }}
                    title={t('actions.viewAll') || 'Xem tất cả'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                  </button>
                )}
              </div>
            )}

            <div className={`${styles.gridCollapseWrapper} ${isOpen ? styles.open : ''}`}>
              <div className={styles.gridCollapseWrapperInner}>
                <div className={styles.grid}>
                  {items.map((a, idx) => {
                    const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                    const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                    const picked = selectedIds.includes(a.id);
                    return (
                      <div 
                        key={a.id} 
                        data-id={a.id} 
                        className={`${styles.tile} ${picked ? styles.picked : ''} ${a.processingStatus === 'processing' ? styles.tileProcessing : ''}`} 
                        {...cardHandlers(a, () => openPhoto(a.id))} 
                        style={{ animationDelay: `${(idx % 24) * 0.02}s` }}
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
                              <span className={styles.processingText}>{t('buttons.processing') || 'Đang xử lý...'}</span>
                            </div>
                          ) : (
                            <video src={srcPlay} className={styles.thumb} muted preload="none" />
                          )
                        ) : (
                          <div className={styles.filePlaceholder}>
                            <DocIcon item={a} size={48} />
                            <span className={styles.fileExt}>{a.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                          </div>
                        )}
                        <div className={styles.caption}>{a.originalName}</div>
                        {picked && <div className={styles.badge}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
