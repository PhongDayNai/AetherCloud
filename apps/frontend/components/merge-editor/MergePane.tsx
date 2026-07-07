'use client';

import React from 'react';

interface ExtendedMergeBlock {
  serverLine: string;
  localLine: string;
  mergedLine: string;
  type: 'normal' | 'modified-server' | 'modified-local' | 'conflict';
  serverStatus: 'pending' | 'accepted' | 'rejected' | 'none';
  localStatus: 'pending' | 'accepted' | 'rejected' | 'none';
}

interface MergePaneProps {
  title: string;
  type: 'server' | 'merged' | 'local';
  blocks: ExtendedMergeBlock[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  getLineCountOfRow: (block: ExtendedMergeBlock) => number;
  handleLineChange?: (index: number, val: string) => void;
  resetAndAutoMerge?: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function MergePane({
  title,
  type,
  blocks,
  scrollRef,
  onScroll,
  getLineCountOfRow,
  handleLineChange,
  resetAndAutoMerge,
  t
}: MergePaneProps): React.JSX.Element {
  if (type === 'merged') {
    return (
      <div className="mergePanel mergedPanel">
        <div className="panelTitleHeader flex-row-between">
          <span>{title}</span>
          {resetAndAutoMerge && (
            <button
              type="button"
              className="resetMergeBtn"
              title="Reset & Auto-Merge"
              onClick={resetAndAutoMerge}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{t('merge.reset') || 'Trộn lại'}</span>
            </button>
          )}
        </div>
        <div
          className="panelScrollBody"
          ref={scrollRef}
          onScroll={onScroll}
        >
          {blocks.map((block, idx) => {
            const lineCount = getLineCountOfRow(block);
            const isConflictUnresolved =
              block.type === 'conflict' &&
              (block.serverStatus === 'pending' || block.localStatus === 'pending');

            return (
              <div
                key={idx}
                className={`lineRow ${block.type} ${
                  block.type === 'conflict'
                    ? (isConflictUnresolved ? 'unresolved' : 'resolved')
                    : ''
                }`}
                style={{ height: `${lineCount * 32}px` }}
              >
                <span className="lineNo">{idx + 1}</span>
                {block.type === 'normal' ? (
                  <span className="lineVal">{block.mergedLine || ' '}</span>
                ) : (
                  <textarea
                    className="lineInput"
                    value={block.mergedLine}
                    onChange={(e) => handleLineChange && handleLineChange(idx, e.target.value)}
                    rows={lineCount}
                    style={{ height: 'calc(100% - 4px)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Server or Local Pane
  return (
    <div className={`mergePanel ${type}Panel`}>
      <div className="panelTitleHeader">{title}</div>
      <div
        className="panelScrollBody"
        ref={scrollRef}
        onScroll={onScroll}
      >
        {blocks.map((block, idx) => {
          const lineCount = getLineCountOfRow(block);
          const lineVal = type === 'server' ? block.serverLine : block.localLine;
          return (
            <div key={idx} className={`lineRow ${block.type}`} style={{ height: `${lineCount * 32}px` }}>
              <span className="lineNo">{idx + 1}</span>
              <span className="lineVal">{lineVal || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
