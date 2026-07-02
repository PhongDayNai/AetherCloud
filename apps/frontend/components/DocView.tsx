'use client';
// Refactored DocView component

import * as Icons from './Icons';
import { DocIcon } from './Icons';
import { Asset } from '../types';
import { fmtBytes, docCategoryOf } from '../lib/utils';

interface DocViewProps {
  docTypeFilter: string;
  setDocTypeFilter: (filter: string) => void;
  docTypes: string[];
  selectedDocProject: string;
  docCollectionView: 'all' | 'recent' | 'trash';
  setDocCollectionView?: (view: 'all' | 'recent' | 'trash') => void;
  docCategoryFilter?: string;
  setDocCategoryFilter?: (filter: string) => void;
  docsGrouped: [string, Asset[]][];
  selectedIds: string[];
  cardHandlers: (item: Asset, doubleClickCallback: () => void) => any;
  openDoc: (id: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  groupByTimeEnabled?: boolean;
}

export default function DocView({
  docTypeFilter,
  setDocTypeFilter,
  docTypes,
  selectedDocProject,
  docCollectionView,
  setDocCollectionView,
  docCategoryFilter = 'all',
  setDocCategoryFilter,
  docsGrouped,
  selectedIds,
  cardHandlers,
  openDoc,
  t,
  groupByTimeEnabled = true
}: DocViewProps): React.JSX.Element {
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
          {['all', 'pdf', 'word', 'excel', 'markdown', 'text', 'archive', 'code', 'other'].map((cat) => {
            const isActive = docCategoryFilter === cat;
            return (
              <button 
                key={cat}
                className={`catChip ${isActive ? 'active' : ''}`}
                onClick={() => setDocCategoryFilter(cat)}
              >
                {cat === 'all' 
                  ? (t('sidebar.all') || 'Tất cả') 
                  : (t('categories.' + cat) || cat.toUpperCase())}
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

      {docsGrouped.map(([group, items]) => (
        <div key={group} className="docGroup" style={{ marginBottom: groupByTimeEnabled ? '24px' : '0' }}>
          {groupByTimeEnabled && <div className="monthTitle">{group} · {items.length}</div>}
          <div className="docGrid">
            {items.map((d, idx) => {
              const picked = selectedIds.includes(d.id);
              return (
                <div key={d.id} className={`docCard ${picked ? 'picked' : ''}`} {...cardHandlers(d, () => openDoc(d.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
                  <div className="docIconWrapper">
                    <DocIcon item={d} size={28} />
                    <span className="docIconTypeBadge">{d.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                  </div>
                  <div className="docTextWrap" style={{ flex: 1, minWidth: 0 }}>
                    <div className="docName">{d.originalName}</div>
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
      ))}


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
        }
        .categoryFilterRow::-webkit-scrollbar {
          height: 4px;
        }
        .categoryFilterRow::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 99px;
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
        .monthTitle {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }
        .docGroup {
          margin-bottom: 24px;
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
