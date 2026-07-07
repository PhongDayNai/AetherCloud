'use client';

import React from 'react';
import styles from './QuantumLoader.module.css';

interface QuantumLoaderProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export default function QuantumLoader({ size = 'medium', text }: QuantumLoaderProps): React.JSX.Element {
  let wrapperSize = 48;
  let sphereSize = 14;
  
  if (size === 'small') {
    wrapperSize = 28;
    sphereSize = 8;
  } else if (size === 'large') {
    wrapperSize = 68;
    sphereSize = 20;
  }

  return (
    <div className={styles.loaderContainer}>
      <div 
        className={styles.loaderWrapper} 
        style={{ width: `${wrapperSize}px`, height: `${wrapperSize}px` }}
      >
        {/* Central glowing energy sphere */}
        <div 
          className={styles.sphere} 
          style={{ width: `${sphereSize}px`, height: `${sphereSize}px` }}
        />
        
        {/* Orbit Rings */}
        <div className={`${styles.orbitRing} ${styles.ring1}`} style={{ width: '100%', height: '100%' }} />
        <div className={`${styles.orbitRing} ${styles.ring2}`} style={{ width: '100%', height: '100%' }} />
        <div className={`${styles.orbitRing} ${styles.ring3}`} style={{ width: '100%', height: '100%' }} />
      </div>

      {text && <span className={styles.loadingText}>{text}</span>}
    </div>
  );
}
