'use client';

import React from 'react';
import * as Icons from '../../../components/Icons';
import QuantumLoader from '../../../components/QuantumLoader';
import { docCategoryOf } from '../../../lib/utils';
import { Asset } from '../../../types';

interface DocSidebarFilesProps {
  sidebarFiles: Asset[];
  activeAssetId: string | undefined;
  isSidebarCollapsed: boolean;
  isLoadingMore: boolean;
  onItemClick: (fileId: string) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function DocSidebarFiles({
  sidebarFiles,
  activeAssetId,
  isSidebarCollapsed,
  isLoadingMore,
  onItemClick,
  onScroll,
  t
}: DocSidebarFilesProps): React.JSX.Element {
  return (
    <aside className={`fileSidebar no-print ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebarHeader">{t('sidebar.documents') || 'Documents'}</div>
      <div className="fileList" onScroll={onScroll}>
        {sidebarFiles.map((file) => {
          return (
            <div
              key={file.id}
              className={`fileItem ${file.id === activeAssetId ? 'active' : ''}`}
              onClick={() => onItemClick(file.id)}
              title={file.originalName}
            >
              <span className="fileItemIcon">
                <Icons.DocIcon item={file} size={18} />
              </span>
              <span className="fileItemName">{file.originalName}</span>
            </div>
          );
        })}
        {isLoadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
            <QuantumLoader size="small" />
          </div>
        )}
        {sidebarFiles.length === 0 && (
          <div style={{ padding: '16px', color: '#71717a', fontSize: '13px', textAlign: 'center' }}>
            {t('viewer.noFilesFound') || 'No files found'}
          </div>
        )}
        {/* Empty item at the bottom of the scroll list to allow scrolling past the mascot tips */}
        {!isSidebarCollapsed && <div style={{ height: '35vh', flexShrink: 0 }} />}
      </div>
    </aside>
  );
}
