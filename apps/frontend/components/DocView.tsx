'use client';
// Refactored DocView component

import * as Icons from './Icons';
import { DocIcon } from './Icons';
import { Asset } from '../types';
import { fmtBytes, docCategoryOf, DOC_CATEGORY_LABELS } from '../lib/utils';
import { useCloud } from '../context/CloudContext';
import styles from './DocView.module.css';

const ChevronRight = ({ size = 14, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`${styles.chevronIcon} ${className}`}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface DocViewProps {
  docTypeFilter: string;
  setDocTypeFilter: (filter: string) => void;
  docTypes: string[];
  selectedDocProject: string;
  docCollectionView: 'all' | 'recent' | 'binders' | 'trash';
  setDocCollectionView?: (view: 'all' | 'recent' | 'binders' | 'trash') => void;
  docCategoryFilter?: string[];
  setDocCategoryFilter?: (filter: any) => void;
  docsGrouped: [string, Asset[]][];
  selectedIds: string[];
  cardHandlers: (item: Asset, doubleClickCallback: () => void) => any;
  openDoc: (id: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  groupByTimeEnabled?: boolean;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (group: string) => void;
}

export default function DocView({
  docTypeFilter,
  setDocTypeFilter,
  docTypes,
  selectedDocProject,
  docCollectionView,
  setDocCollectionView,
  docCategoryFilter = ['all'],
  setDocCategoryFilter,
  docsGrouped,
  selectedIds,
  cardHandlers,
  openDoc,
  t,
  groupByTimeEnabled = true,
  expandedGroups,
  toggleGroup
}: DocViewProps): React.JSX.Element {
  const { docCategoryCounts, docProjects, setSelectedDocProject, language } = useCloud();

  const getCatLabel = (cat: string) => {
    if (cat === 'all') return t('sidebar.all') || 'All';
    const labelKey = `categories.${cat}`;
    const translated = t(labelKey);
    if (translated === labelKey) {
      return cat.toUpperCase();
    }
    return translated;
  };

  const getGroupLabel = (groupName: string) => {
    if (groupName === 'all') return t('sidebar.all') || 'All';
    if (groupName === 'Ảnh & Video') return t('spaces.typeMedia') || 'Photos & Videos';
    if (groupName === 'Tài liệu khác' || groupName === 'Khác') return t('spaces.formatOther') || 'Other';
    
    // Tìm key category tương ứng dựa theo DOC_CATEGORY_LABELS tiếng Việt
    const entry = Object.entries(DOC_CATEGORY_LABELS).find(([_, v]) => v === groupName);
    if (entry) {
      const catKey = entry[0];
      const translated = t(`categories.${catKey}`);
      if (translated !== `categories.${catKey}`) {
        return translated;
      }
    }
    return groupName;
  };

  const categoriesToShow = ['all', 'pdf', 'word', 'excel', 'powerpoint', 'markdown', 'text', 'ebook', 'database', 'archive', 'installer', 'disk-image', 'font', 'certificate', 'design', 'cad', 'executable', 'code', 'config', 'other'].filter(cat => {
    if (cat === 'all') return true;
    const count = docCategoryCounts?.get(cat) || 0;
    return count > 0;
  });

  return (
    <section className={styles.contentPane}>
      {/* Tab Filter (Active vs Trash) */}
      {setDocCollectionView && (
        <div className={styles.viewTabs}>
          <button 
            className={`${styles.tabBtn} ${docCollectionView === 'all' ? styles.active : ''}`}
            onClick={() => setDocCollectionView('all')}
          >
            <Icons.Folder size={14} />
            {t('sidebar.all') || (language === 'en' ? 'All' : 'Tất cả')}
          </button>
          <button 
            className={`${styles.tabBtn} ${docCollectionView === 'recent' ? styles.active : ''}`}
            onClick={() => setDocCollectionView('recent')}
          >
            <Icons.Flash size={14} />
            {t('sidebar.recentlyAdded') || (language === 'en' ? 'Recently Added' : 'Mới thêm')}
          </button>
          <button 
            className={`${styles.tabBtn} ${docCollectionView === 'binders' ? styles.active : ''}`}
            onClick={() => setDocCollectionView('binders')}
          >
            <Icons.Folder size={14} />
            {t('sidebar.docProjectsTitle') || (language === 'en' ? 'Document Binders' : 'Tập tài liệu')}
          </button>
          <button 
            className={`${styles.tabBtn} ${docCollectionView === 'trash' ? styles.active : ''}`}
            onClick={() => setDocCollectionView('trash')}
          >
            <Icons.Trash size={14} />
            {t('sidebar.trashBin') || (language === 'en' ? 'Trash Bin' : 'Thùng rác')}
          </button>
        </div>
      )}

      {/* Category Chips Filter */}
      {setDocCategoryFilter && (docCollectionView !== 'binders' || selectedDocProject !== 'all') && (
        <div className={styles.categoryFilterRow}>
          {categoriesToShow.map((cat) => {
            const isActive = docCategoryFilter.includes(cat);
            return (
              <button 
                key={cat}
                className={`${styles.catChip} ${isActive ? styles.active : ''}`}
                onClick={() => {
                  if (cat === 'all') {
                    setDocCategoryFilter(['all']);
                  } else {
                    setDocCategoryFilter((prev: string[]) => {
                      const withoutAll = Array.isArray(prev) ? prev.filter(x => x !== 'all') : [];
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
                  ? (t('sidebar.all') || 'Tất cả') 
                  : isActive 
                    ? `✓ ${getCatLabel(cat)}` 
                    : `+ ${getCatLabel(cat)}`}
              </button>
            );
          })}
        </div>
      )}

      {selectedDocProject !== 'all' && docCollectionView !== 'binders' && (
        <div className={styles.docFilters}>
          <span className={`${styles.chip} ${styles.active}`}>
            <Icons.Project size={14} />
            <span>{t('sidebar.docProjectsTitle') || 'Tập tài liệu'}: {selectedDocProject}</span>
          </span>
        </div>
      )}

      {docCollectionView === 'binders' && selectedDocProject !== 'all' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '12px' }}>
          <button 
            onClick={() => setSelectedDocProject('all')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            {t('spaces.backToSpace') || (language === 'en' ? 'Back' : 'Quay lại')}
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{selectedDocProject}</span>
        </div>
      )}

      {docCollectionView === 'binders' && selectedDocProject === 'all' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {docProjects.length === 0 ? (
            <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '80px 0' }}>
              {t('invite.emptyList') || (language === 'en' ? 'No binders created yet' : 'Chưa có tập tài liệu nào được tạo')}
            </div>
          ) : (
            docProjects.map((p) => (
              <div 
                key={p.name}
                style={{ background: 'var(--bg-tile)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}
                onClick={() => setSelectedDocProject(p.name)}
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
                  <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.count} {t('photos.countItems') || (language === 'en' ? 'files' : 'tập tin')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {docCollectionView === 'trash' && <div className={styles.hint}>{t('dashboard.docsTrashHint')}</div>}
          {docsGrouped.length === 0 && <div className={styles.hint}>{t('dashboard.noDocsMatching')}</div>}

          {docsGrouped.map(([group, items]) => {
            const isMultiCategory = docCategoryFilter.length > 1 && !docCategoryFilter.includes('all');
            const showGroupTitle = groupByTimeEnabled || isMultiCategory;
            const isOpen = expandedGroups[group] ?? true;

            return (
              <div key={group} className={styles.monthBlock}>
                {showGroupTitle && (
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
                    <span>{getGroupLabel(group)}</span>
                    <span className={styles.groupCount}>{items.length}</span>
                  </div>
                )}

                <div className={`${styles.gridCollapseWrapper} ${isOpen ? styles.open : ''}`}>
                  <div className={styles.gridCollapseWrapperInner}>
                    <div className={styles.docGrid}>
                      {items.map((d, idx) => {
                        const picked = selectedIds.includes(d.id);
                        return (
                          <div 
                            key={d.id} 
                            data-id={d.id} 
                            title={d.originalName} 
                            className={`${styles.docCard} ${picked ? styles.picked : ''}`} 
                            {...cardHandlers(d, () => openDoc(d.id))} 
                            style={{ animationDelay: `${(idx % 24) * 0.02}s` }}
                          >
                            <div className={styles.docIconWrapper}>
                              <DocIcon item={d} size={28} />
                              <span className={styles.docIconTypeBadge}>{d.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                            </div>
                            <div className={styles.docTextWrap}>
                              <div className={styles.docName} title={d.originalName}>{d.originalName}</div>
                              <div className={styles.docMeta}>
                                {fmtBytes(d.size)}
                              </div>
                            </div>
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
        </>
      )}
    </section>
  );
}
