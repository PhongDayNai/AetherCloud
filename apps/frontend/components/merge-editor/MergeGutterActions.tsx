'use client';

import React from 'react';
import { MergeAcceptLeft, MergeAcceptRight, MergeDiscard, MergeReset } from '../Icons';

interface ExtendedMergeBlock {
  serverLine: string;
  localLine: string;
  mergedLine: string;
  type: 'normal' | 'modified-server' | 'modified-local' | 'conflict';
  serverStatus: 'pending' | 'accepted' | 'rejected' | 'none';
  localStatus: 'pending' | 'accepted' | 'rejected' | 'none';
}

interface MergeGutterActionsProps {
  side: 'server' | 'local';
  blocks: ExtendedMergeBlock[];
  getLineCountOfRow: (block: ExtendedMergeBlock) => number;
  onAccept: (index: number) => void;
  onDiscard: (index: number) => void;
  onReset: (index: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export default function MergeGutterActions({
  side,
  blocks,
  getLineCountOfRow,
  onAccept,
  onDiscard,
  onReset,
  scrollRef
}: MergeGutterActionsProps): React.JSX.Element {
  return (
    <div className="mergeGutter">
      <div className="panelTitleHeader" />
      <div
        className="gutterScrollPlaceholder"
        ref={scrollRef}
        style={{ overflow: 'hidden' }}
      >
        {blocks.map((block, idx) => {
          const lineCount = getLineCountOfRow(block);
          const status = side === 'server' ? block.serverStatus : block.localStatus;
          const otherStatus = side === 'server' ? block.localStatus : block.serverStatus;

          const showActions = status === 'pending';
          const showReset = status === 'accepted' || status === 'rejected';

          return (
            <div key={idx} className="gutterActionRow" style={{ height: `${lineCount * 32}px` }}>
              {showActions ? (
                <div className="gutterButtons">
                  <button
                    type="button"
                    className={`gutterActionBtn accept${side === 'server' ? 'Server' : 'Local'} ${otherStatus === 'accepted' ? 'rotate-down' : ''
                      }`}
                    title={side === 'server' ? 'Accept Server Change' : 'Accept Your Change'}
                    style={{ width: '20px', height: '20px' }}
                    onClick={() => onAccept(idx)}
                  >
                    {side === 'server' ? (
                      <MergeAcceptRight size={18} />
                    ) : (
                      <MergeAcceptLeft size={18} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="gutterActionBtn discard"
                    title={side === 'server' ? 'Discard Server Change' : 'Discard Your Change'}
                    style={{ width: '20px', height: '20px' }}
                    onClick={() => onDiscard(idx)}
                  >
                    <MergeDiscard size={18} />
                  </button>
                </div>
              ) : showReset ? (
                <button
                  type="button"
                  className="gutterActionBtn reset"
                  title={side === 'server' ? 'Reset Server Choice' : 'Reset Local Choice'}
                  style={{ width: '20px', height: '20px' }}
                  onClick={() => onReset(idx)}
                >
                  <MergeReset size={13} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
