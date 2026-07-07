'use client';

import React from 'react';
import styles from './HintPopover.module.css';
import { Bulb } from './Icons';

interface HintPopoverProps {
  title: React.ReactNode;
  message: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  placement?: 'bottom-start' | 'bottom-end' | 'bottom-center' | 'top-start' | 'top-end';
}

export default function HintPopover({
  title,
  message,
  icon,
  onClose,
  action,
  placement = 'bottom-end'
}: HintPopoverProps): React.JSX.Element {
  const placementClass = styles[`placement-${placement}`] || styles['placement-bottom-end'];
  const renderedIcon = icon !== undefined ? icon : <Bulb size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />;

  return (
    <div className={`${styles.popover} ${placementClass}`}>
      <div className={styles.arrow} />
      <div className={styles.content}>
        <div className={styles.header}>
          {renderedIcon && <span className={styles.icon}>{renderedIcon}</span>}
          <span className={styles.title}>{title}</span>
          <button 
            className={styles.closeBtn} 
            onClick={onClose} 
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className={styles.message}>{message}</div>
        {action && (
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={action.onClick}>
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
