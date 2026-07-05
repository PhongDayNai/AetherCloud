'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DocTip, TipIcon, getLocalizedText } from '../app/doc-viewer/tipsViewerTips';
import * as Icons from './Icons';
import TipsCatalogModal from './TipsCatalogModal';
import './mascotTipsWidget.css';

interface MascotTipsWidgetProps {
  tips: DocTip[];
  theme?: 'light' | 'dark';
  language?: 'vi' | 'en';
}

const MascotRobot = ({ size = 42, theme = 'dark' }: { size?: number; theme?: 'light' | 'dark' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mascotRobot">
    {/* Head */}
    <rect x="10" y="12" width="36" height="24" rx="12" fill={theme === 'light' ? '#e0e7ff' : '#1e1b4b'} stroke={theme === 'light' ? '#4f46e5' : '#6366f1'} strokeWidth="2.5" />
    {/* Screen */}
    <rect x="14" y="16" width="28" height="16" rx="8" fill="#09090b" />
    {/* Glowing Eyes */}
    <ellipse cx="22" cy="24" rx="3" ry="3" fill="#60a5fa" className="robotEye">
      <animate attributeName="ry" values="3;3;0.3;3;3" dur="4s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="34" cy="24" rx="3" ry="3" fill="#60a5fa" className="robotEye">
      <animate attributeName="ry" values="3;3;0.3;3;3" dur="4s" repeatCount="indefinite" />
    </ellipse>
    {/* Antenna */}
    <line x1="28" y1="12" x2="28" y2="6" stroke={theme === 'light' ? '#4f46e5' : '#6366f1'} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="28" cy="5" r="2.5" fill="#f59e0b" />
    {/* Neck */}
    <rect x="24" y="34" width="8" height="4" fill="#4f46e5" />
    {/* Body */}
    <rect x="16" y="37" width="24" height="21" rx="6" fill={theme === 'light' ? '#e0e7ff' : '#1e1b4b'} stroke={theme === 'light' ? '#4f46e5' : '#6366f1'} strokeWidth="2.5" />
    {/* Heart/Core */}
    <circle cx="28" cy="47" r="4.5" fill="#f59e0b" className="robotCore" />
    {/* Arms */}
    <path d="M12 42c-2.5 1.5-4 4.5-3.5 7.5" stroke={theme === 'light' ? '#4f46e5' : '#6366f1'} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M40 42c2.5 1.5 4 4.5 3.5 7.5" stroke={theme === 'light' ? '#4f46e5' : '#6366f1'} strokeWidth="2.5" strokeLinecap="round" />

    {/* Speaking Waves */}
    <path d="M 50 18 C 53 20 53 24 50 26" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" className="speakWave1" />
    <path d="M 54 14 C 58 18 58 26 54 30" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" className="speakWave2" />
  </svg>
);

export default function MascotTipsWidget({ tips, theme = 'dark', language = 'vi' }: MascotTipsWidgetProps) {
  const [activeTipIndex, setActiveTipIndex] = useState<number>(0);
  const [showProTip, setShowProTip] = useState<boolean>(false);
  const [showAllTipsModal, setShowAllTipsModal] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const localizedTips = getLocalizedText(language);

  // Initialize random tip index and mark as mounted on client side to avoid SSR hydration mismatches
  useEffect(() => {
    setIsMounted(true);
    if (tips.length > 0) {
      setActiveTipIndex(Math.floor(Math.random() * tips.length));
    }
  }, [tips]);

  // Reset showProTip when active tip index changes
  useEffect(() => {
    setShowProTip(false);
  }, [activeTipIndex]);

  // Auto-swap tips randomly every 30 seconds (pauses when Pro Tip is expanded or Modal is open)
  useEffect(() => {
    if (showProTip || showAllTipsModal || tips.length <= 1) return;

    const interval = setInterval(() => {
      setActiveTipIndex((prev) => {
        let nextIndex = prev;
        while (nextIndex === prev) {
          nextIndex = Math.floor(Math.random() * tips.length);
        }
        return nextIndex;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [showProTip, showAllTipsModal, tips]);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number>(0);

  // Smoothly transition height of the speech bubble during swaps or Pro Tip expansions
  useEffect(() => {
    if (bubbleRef.current) {
      // Disable transition temporarily to read the natural height
      bubbleRef.current.style.transition = 'none';
      bubbleRef.current.style.height = 'auto';
      const naturalHeight = bubbleRef.current.getBoundingClientRect().height;

      // Start transition from the previous height (or natural if first render)
      const startHeight = prevHeightRef.current || naturalHeight;
      bubbleRef.current.style.height = `${startHeight}px`;

      // Force a DOM reflow to apply the starting height
      bubbleRef.current.offsetHeight;

      // Trigger the transition to the new natural height
      bubbleRef.current.style.transition = 'height 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
      bubbleRef.current.style.height = `${naturalHeight}px`;

      // Save height for next transition
      prevHeightRef.current = naturalHeight;
    }
  }, [activeTipIndex, showProTip]);

  if (!isMounted || tips.length === 0) return null;

  const activeTip = tips[activeTipIndex];
  if (!activeTip) return null;

  const activeCategory = activeTip.category[language];
  const activeTitle = activeTip.title[language];
  const activeContent = activeTip.content[language];
  const activeDeepTip = activeTip.deepTip?.[language];

  return (
    <>
      <div className="floatingTipsOverlay no-print">
        <div className="mascotRobotWrapper" onClick={() => setShowAllTipsModal(true)} title={localizedTips.showAll}>
          <MascotRobot theme={theme} />
        </div>

        <div ref={bubbleRef} key={activeTipIndex} className="tipSpeechBubble animate-swap">
          <span className="tipCategoryTag">{activeCategory}</span>
          <div className="tipCardTitleRow">
            <TipIcon name={activeTip.icon} size={14} className="tipCardIcon" />
            <span className="tipCardTitle">{activeTitle}</span>
          </div>
          <p className="tipCardContent">{activeContent}</p>

          {activeDeepTip && (
            <div className="proTipWrapper">
              <button
                className={`proTipToggle ${showProTip ? 'expanded' : ''}`}
                onClick={() => setShowProTip(!showProTip)}
              >
                <span>{localizedTips.proTipTitle}</span>
                <span className="proTipArrow">
                  {showProTip ? <Icons.ChevronUp size={12} /> : <Icons.ChevronDown size={12} />}
                </span>
              </button>
              <div className={`proTipContent ${showProTip ? 'expanded' : ''}`}>
                <p>{activeDeepTip}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <TipsCatalogModal
        isOpen={showAllTipsModal}
        onClose={() => setShowAllTipsModal(false)}
        tips={tips}
        language={language}
        theme={theme}
      />
    </>
  );
}
