import React from 'react';
import { useRouter } from 'next/navigation';
import { Asset } from '../types';
import { DocIcon, ChevronRight } from './Icons';
import { useCloud } from '../context/CloudContext';


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
    <section className="contentPane">

      {collectionView === 'recent' && <div className="hint">{t('dashboard.recentHint')}</div>}
      {collectionView === 'trash' && <div className="hint">{t('dashboard.trashHint')}</div>}

      {photoGroups.length === 0 && <div className="hint">{t('dashboard.noDataMatching')}</div>}

      {photoGroups.map(([group, items]) => {
        const isOpen = expandedGroups[group] ?? true;
        return (
          <div key={group} className="monthBlock">
            {groupByTimeEnabled && (
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
                <span>{group}</span>
                <span className="groupCount">{items.length}</span>
                {showViewAll && (
                  <button 
                    className="groupGoBtn"
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

            <div className={`gridCollapseWrapper ${isOpen ? 'open' : ''}`}>
              <div className="gridCollapseWrapperInner">
                <div className="grid">
                  {items.map((a, idx) => {
                    const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                    const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                    const picked = selectedIds.includes(a.id);
                    return (
                      <div key={a.id} data-id={a.id} className={`tile ${picked ? 'picked' : ''} ${a.processingStatus === 'processing' ? 'tileProcessing' : ''}`} {...cardHandlers(a, () => openPhoto(a.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
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
                        ) : (
                          <div className="filePlaceholder">
                            <DocIcon item={a} size={48} />
                            <span className="fileExt">{a.originalName.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                          </div>
                        )}
                        <div className="caption">{a.originalName}</div>
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
        .groupToggleWrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .groupLabel {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
        .chip:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
          border-color: var(--border-input-focus);
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
        .groupGoBtn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-tile);
          color: var(--text-muted);
          width: 24px;
          height: 24px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 0;
          margin-left: 6px;
        }
        .groupGoBtn:hover {
          background: var(--button-primary-bg);
          border-color: var(--button-primary-bg);
          color: var(--button-primary-text);
          box-shadow: 0 2px 8px var(--button-primary-shadow);
          transform: scale(1.05);
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
          overflow: hidden;
          min-height: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
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
          animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
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
        .tile.picked {
          border-color: var(--button-primary-bg);
          box-shadow: 0 0 0 1px var(--button-primary-bg), 0 8px 24px rgba(0, 0, 0, 0.15);
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
        .tileProcessing {
          cursor: wait;
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
        .processingText {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .filePlaceholder {
          height: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          gap: 12px;
        }
        .fileIcon {
          font-size: 40px;
        }
        .fileExt {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-item-active);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
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
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
