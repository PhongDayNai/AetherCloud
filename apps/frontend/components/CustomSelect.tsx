'use client';

import React, { useState, useEffect, useRef } from 'react';

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
    <div ref={containerRef} style={{ position: 'relative', width: width, userSelect: 'none' }}>
      <div 
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-input)',
          borderRadius: '8px',
          padding: '8px 14px',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: '500',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => { 
          if (disabled) return;
          e.currentTarget.style.borderColor = 'var(--border-input-focus)'; 
          e.currentTarget.style.background = 'var(--bg-input-focus)'; 
        }}
        onMouseLeave={(e) => { 
          if (disabled) return;
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--border-input)'; 
            e.currentTarget.style.background = 'var(--bg-input)'; 
          }
        }}
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
          style={{ 
            marginLeft: '8px', 
            color: 'var(--text-secondary)', 
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'none'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        background: 'var(--bg-popover)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        padding: '4px',
        zIndex: 1000,
        minWidth: popoverMinWidth,
        boxSizing: 'border-box',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
        visibility: isOpen ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
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
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isSel ? 'var(--bg-item-active)' : 'transparent',
                fontSize: '12.5px',
                fontWeight: isSel ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (!isSel) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-item-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSel) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', width: '100%' }}>
                <span style={{ fontSize: '13px' }}>{optParts.main}</span>
                {optParts.desc && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #71717a)', fontWeight: '400', opacity: 0.75 }}>
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
