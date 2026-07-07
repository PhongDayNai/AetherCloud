'use client';

import React from 'react';
import { fmtBytes } from '../../lib/utils';
import styles from '../Sidebar.module.css';

interface StorageProgressProps {
  usage: any;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function StorageProgress({
  usage,
  t
}: StorageProgressProps): React.JSX.Element {
  return (
    <div className={styles.storageCard}>
      <div className={styles.label}>{t('sidebar.storageTitle')}</div>
      {usage ? (
        <>
          {(() => {
            const appUsed = (usage.breakdown?.originalsBytes || 0) + (usage.breakdown?.derivedBytes || 0) + (usage.breakdown?.trashBytes || 0);
            const appPercent = usage.totalBytes > 0 ? Number(((appUsed / usage.totalBytes) * 100).toFixed(4)) : 0;
            return (
              <>
                <div className={styles.row}><span>{t('sidebar.storageUsed')}</span><b>{fmtBytes(appUsed)}</b></div>
                <div className={styles.row}><span>{t('sidebar.totalDisk')}</span><b>{fmtBytes(usage.totalBytes)}</b></div>
                <div className={styles.bar}><div className={styles.barFill} style={{ width: `${Math.min(100, appPercent)}%` }} /></div>
                <small>AetherCloud: {appPercent}% · Filesystem: {usage.usedPercent}%</small>
                {Number(usage.processingCount || 0) > 0 && <small>{t('sidebar.processingMedia', { count: usage.processingCount })}</small>}
              </>
            );
          })()}
        </>
      ) : <small>{t('sidebar.loading')}</small>}
    </div>
  );
}
