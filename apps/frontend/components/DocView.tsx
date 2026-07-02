'use client';
// Refactored DocView component

import * as Icons from './Icons';
import { DocIcon } from './Icons';
import { Asset } from '../types';
import { fmtBytes, docCategoryOf, DOC_CATEGORY_LABELS } from '../lib/utils';
import { useCloud } from '../context/CloudContext';

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
    className={className}
    style={{ transition: 'transform 0.25s ease' }}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface DocViewProps {
  docTypeFilter: string;
  setDocTypeFilter: (filter: string) => void;
  docTypes: string[];
  selectedDocProject: string;
  docCollectionView: 'all' | 'recent' | 'trash';
  setDocCollectionView?: (view: 'all' | 'recent' | 'trash') => void;
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
  const { docCategoryCounts } = useCloud();

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
    <section className="contentPane">
      {/* Tab Filter (Active vs Trash) */}
      {setDocCollectionView && (
        <div className="viewTabs">
          <button 
            className={`tabBtn ${docCollectionView === 'all' ? 'active' : ''}`}
            onClick={() => setDocCollectionView('all')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icons.Folder size={14} />
            {t('sidebar.all') || 'Tất cả'}
          </button>
          <button 
            className={`tabBtn ${docCollectionView === 'recent' ? 'active' : ''}`}
            onClick={() => setDocCollectionView('recent')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icons.Flash size={14} />
            {t('sidebar.recentlyAdded') || 'Mới thêm'}
          </button>
          <button 
            className={`tabBtn ${docCollectionView === 'trash' ? 'active' : ''}`}
            onClick={() => setDocCollectionView('trash')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icons.Trash size={14} />
            {t('sidebar.trashBin') || 'Thùng rác'}
          </button>
        </div>
      )}

      {/* Category Chips Filter */}
      {setDocCategoryFilter && (
        <div className="categoryFilterRow">
          {categoriesToShow.map((cat) => {
            const isActive = docCategoryFilter.includes(cat);
            return (
              <button 
                key={cat}
                className={`catChip ${isActive ? 'active' : ''}`}
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

      {selectedDocProject !== 'all' && (
        <div className="docFilters">
          <span className="chip active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icons.Project size={14} />
            <span>{t('sidebar.docProjectsTitle') || 'Tập tài liệu'}: {selectedDocProject}</span>
          </span>
        </div>
      )}

      {docCollectionView === 'trash' && <div className="hint">{t('dashboard.docsTrashHint')}</div>}
      {docsGrouped.length === 0 && <div className="hint">{t('dashboard.noDocsMatching')}</div>}

      {docsGrouped.map(([group, items]) => {
        const isMultiCategory = docCategoryFilter.length > 1 && !docCategoryFilter.includes('all');
        const showGroupTitle = groupByTimeEnabled || isMultiCategory;
        const isOpen = expandedGroups[group] ?? true;

        return (
          <div key={group} className="monthBlock">
            {showGroupTitle && (
              <div 
                className="groupHeader" 
                role="button" 
                tabIndex={0}
                onClick={() => toggleGroup(group)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { toggleGroup(group); } }}
              >
                <span className={`groupHeaderChevron ${isOpen ? 'open' : ''}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <ChevronRight size={14} />
                </span>
                <span>{getGroupLabel(group)}</span>
                <span className="groupCount">{items.length}</span>
              </div>
            )}

            <div className={`gridCollapseWrapper ${isOpen ? 'open' : ''}`}>
              <div className="gridCollapseWrapperInner">
                <div className="docGrid">
                  {items.map((d, idx) => {
                    const picked = selectedIds.includes(d.id);
                    return (
                      <div key={d.id} data-id={d.id} title={d.originalName} className={`docCard ${picked ? 'picked' : ''}`} {...cardHandlers(d, () => openDoc(d.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
                        <div className="docIconWrapper">
                          <DocIcon item={d} size={28} />
                          <span className="docIconTypeBadge">{d.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                        </div>
                        <div className="docTextWrap" style={{ flex: 1, minWidth: 0 }}>
                          <div className="docName" title={d.originalName}>{d.originalName}</div>
                          <div className="docMeta">
                            {fmtBytes(d.size)}
                          </div>
                        </div>
                        {picked && <div className="badge">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}


      <style jsx>{`
        .contentPane {
          animation: contentSwitch .35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes contentSwitch {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .viewTabs {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .tabBtn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          padding: 6px 12px;
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
        .categoryFilterRow {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 16px;
          scroll-behavior: smooth;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
        }
        .categoryFilterRow::-webkit-scrollbar {
          display: none;
        }
        .catChip {
          flex-shrink: 0;
          background: var(--bg-tile);
          border: 1px solid var(--border-tile);
          color: var(--text-secondary);
          border-radius: 99px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .catChip:hover {
          border-color: var(--border-tile-hover);
          color: var(--text-primary);
        }
        .catChip.active {
          background: var(--button-primary-bg);
          border-color: var(--button-primary-bg);
          color: var(--button-primary-text);
          box-shadow: 0 4px 10px var(--button-primary-shadow);
        }
        .docFilters {
          margin-bottom: 16px;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .docFilters select {
          background: var(--bg-input);
          color: var(--text-primary);
          border: 1px solid var(--border-input);
          border-radius: 8px;
          padding: 6px 12px;
          font-family: inherit;
          outline: none;
        }
        .chip {
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--text-secondary);
          border-radius: 99px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .chip.active {
          background: var(--button-primary-bg);
          border-color: var(--button-primary-bg);
          color: var(--button-primary-text);
          box-shadow: 0 4px 10px var(--button-primary-shadow);
        }
        .hint {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 16px;
          font-style: italic;
        }
        .monthBlock {
          margin-bottom: 28px;
        }
        .groupHeader {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--text-primary);
          border-radius: 14px;
          padding: 10px 14px;
          margin-bottom: 14px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          font-size: 13px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .groupHeader:hover {
          background: var(--bg-item-hover);
          border-color: var(--border-input-focus);
        }
        .groupHeaderChevron {
          display: inline-block;
          font-size: 10px;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          transform: rotate(0deg);
          color: var(--text-muted);
        }
        .groupHeaderChevron.open {
          transform: rotate(90deg);
          color: var(--text-primary);
        }
        .groupCount {
          margin-left: auto;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          background: var(--bg-item-hover);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .gridCollapseWrapper {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, margin-top 0.35s ease;
          opacity: 0;
          visibility: hidden;
          margin-top: 0;
        }
        .gridCollapseWrapper.open {
          grid-template-rows: 1fr;
          opacity: 1;
          visibility: visible;
          margin-top: 10px;
        }
        .gridCollapseWrapperInner {
          min-height: 0;
        }
        .docGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
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
          animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
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
        .docCard.picked {
          border-color: var(--button-primary-bg);
          box-shadow: 0 0 0 1px var(--button-primary-bg);
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
        .badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 99px;
          background: var(--button-primary-bg);
          color: var(--button-primary-text);
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          z-index: 2;
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
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
