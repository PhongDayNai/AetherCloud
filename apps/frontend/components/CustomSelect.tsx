'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './CustomSelect.module.css';

interface CustomSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  width?: string;
  disabled?: boolean;
}

export default function CustomSelect({ value, options, onChange, width = '130px', disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const getLabelParts = (label: string) => {
    const index = label.indexOf('(');
    if (index === -1) {
      return { main: label, desc: '' };
    }
    return {
      main: label.substring(0, index).trim(),
      desc: label.substring(index).trim()
    };
  };

  const selectedOpt = options.find(o => o.value === value) || options[0];
  const selectedParts = selectedOpt ? getLabelParts(selectedOpt.label) : { main: '', desc: '' };
  const hasDesc = options.some(o => o.label.includes('('));
  const popoverMinWidth = hasDesc ? '240px' : '100%';

  return (
    <div 
      ref={containerRef} 
      className={styles.container}
      style={{ width }}
    >
      <div 
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        className={`${styles.selectBox} ${disabled ? styles.disabled : ''} ${isOpen ? styles.open : ''}`}
      >
        <span>{selectedParts.main}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`${styles.chevronIcon} ${isOpen ? styles.open : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div 
        className={`${styles.popover} ${isOpen ? styles.open : ''}`}
        style={{ minWidth: popoverMinWidth }}
      >
        {options.map((opt) => {
          const isSel = opt.value === value;
          const optParts = getLabelParts(opt.label);
          return (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`${styles.option} ${isSel ? styles.selected : ''}`}
            >
              <div className={styles.optionContent}>
                <span className={styles.optionMain}>{optParts.main}</span>
                {optParts.desc && (
                  <span className={styles.optionDesc}>
                    {optParts.desc}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
