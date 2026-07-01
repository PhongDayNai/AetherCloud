'use client';

import React from 'react';
import { Asset } from '../types';

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
  t
}: AssetGridProps): React.JSX.Element {
  return (
    <section className="contentPane">
      <div className="groupToggleWrap">
        <button className={`chip ${groupByTimeEnabled ? 'active' : ''}`} onClick={() => setGroupByTimeEnabled((v) => !v)}>
          {groupByTimeEnabled ? t('dashboard.toggleGroupOff') : t('dashboard.toggleGroupOn')}
        </button>
        {groupByTimeEnabled && (
          <>
            <span className="groupLabel">{t('dashboard.groupBy')}:</span>
            <button className={`chip ${groupMode === 'month' ? 'active' : ''}`} onClick={() => setGroupMode('month')}>{t('dashboard.groupMonth')}</button>
            <button className={`chip ${groupMode === 'year' ? 'active' : ''}`} onClick={() => setGroupMode('year')}>{t('dashboard.groupYear')}</button>
          </>
        )}
      </div>

      {collectionView === 'recent' && <div className="hint">{t('dashboard.recentHint')}</div>}
      {collectionView === 'trash' && <div className="hint">{t('dashboard.trashHint')}</div>}

      {photoGroups.length === 0 && <div className="hint">{t('dashboard.noDataMatching')}</div>}

      {photoGroups.map(([group, items]) => {
        const isOpen = expandedGroups[group] ?? true;
        return (
          <div key={group} className="monthBlock">
            {groupByTimeEnabled && (
              <button className="groupHeader" onClick={() => toggleGroup(group)}>
                <span className={`groupHeaderChevron ${isOpen ? 'open' : ''}`}>▸</span>
                <span>{group}</span>
                <span className="groupCount">{items.length}</span>
              </button>
            )}

            <div className={`gridCollapseWrapper ${isOpen ? 'open' : ''}`}>
              <div className="gridCollapseWrapperInner">
                <div className="grid">
                  {items.map((a, idx) => {
                    const srcOriginal = `${api}/api/assets/_media/original/${a.id}`;
                    const srcPlay = `${api}/api/assets/_media/play/${a.id}`;
                    const picked = selectedIds.includes(a.id);
                    return (
                      <div key={a.id} className={`tile ${picked ? 'picked' : ''} ${a.processingStatus === 'processing' ? 'tileProcessing' : ''}`} {...cardHandlers(a, () => openPhoto(a.id))} style={{ animationDelay: `${(idx % 24) * 0.02}s` }}>
                        {a.type === 'image' ? (
                          <img src={srcOriginal} alt={a.originalName} className="thumb" />
                        ) : (
                          a.processingStatus === 'processing' ? (
                            <div className="processingPlaceholder">
                              <div className="pulseLoader" />
                              <span className="processingText">Đang xử lý...</span>
                            </div>
                          ) : (
                            <video src={srcPlay} className="thumb" muted preload="metadata" />
                          )
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
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .chip {
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #a1a1aa;
          border-radius: 99px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .chip:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #e4e4e7;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .chip.active {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
          box-shadow: 0 4px 10px rgba(255, 255, 255, 0.1);
        }
        .hint {
          font-size: 13px;
          color: #71717a;
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
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #f4f4f5;
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
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .groupHeaderChevron {
          display: inline-block;
          font-size: 10px;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          transform: rotate(0deg);
          color: #71717a;
        }
        .groupHeaderChevron.open {
          transform: rotate(90deg);
          color: #ffffff;
        }
        .groupCount {
          margin-left: auto;
          color: #71717a;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
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
          overflow: hidden;
          min-height: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .tile {
          background: #111113;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .tile:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }
        .tile:hover .thumb {
          transform: scale(1.04);
        }
        .tile.picked {
          border-color: #ffffff;
          box-shadow: 0 0 0 1px #ffffff, 0 8px 24px rgba(0, 0, 0, 0.3);
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
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
        }
        .tile:hover .caption {
          color: #f4f4f5;
        }
        .badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 99px;
          background: #ffffff;
          color: #09090b;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
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
          background: rgba(255, 255, 255, 0.02);
          gap: 12px;
        }
        .pulseLoader {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #3b82f6;
          animation: pulse 1.6s ease-in-out infinite;
        }
        .processingText {
          font-size: 11px;
          color: #71717a;
          font-weight: 600;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
