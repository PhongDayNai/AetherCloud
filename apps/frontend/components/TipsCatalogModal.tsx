'use client';

import React, { useState, useEffect } from 'react';
import { DocTip, TipIcon, getLocalizedText } from '../app/doc-viewer/tipsViewerTips';
import * as Icons from './Icons';

interface TipsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tips: DocTip[];
  language?: 'vi' | 'en';
  theme?: 'light' | 'dark';
}

function useColumnCount() {
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setColumnCount(1);
      } else if (window.innerWidth < 960) {
        setColumnCount(2);
      } else {
        setColumnCount(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return columnCount;
}

export default function TipsCatalogModal({
  isOpen,
  onClose,
  tips,
  language = 'vi',
  theme = 'dark'
}: TipsCatalogModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const columnCount = useColumnCount();

  if (!isOpen || tips.length === 0) return null;

  const localizedTips = getLocalizedText(language);

  // Dynamically extract categories from tips list to ensure full reusability
  const categoryMap = new Map<string, { vi: string; en: string }>();
  tips.forEach((tip) => {
    categoryMap.set(tip.category.en, tip.category);
  });
  const uniqueCategories = Array.from(categoryMap.entries());

  return (
    <div className="tipsModalBackdrop" onClick={onClose} data-theme={theme}>
      <div className="tipsModal" onClick={(e) => e.stopPropagation()}>
        <div className="tipsModalHeader">
          <h2 className="tipsModalTitle">
            <TipIcon name="bulb" size={20} className="modalTitleIcon" />
            <span>{localizedTips.allTipsTitle}</span>
          </h2>
          <button className="tipsModalClose" onClick={onClose} title={localizedTips.closeBtn}>
            <Icons.Close size={18} />
          </button>
        </div>

        {/* Dynamic Category Tabs */}
        <div className="categoryFilters">
          <button
            className={`categoryFilterTab ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            {localizedTips.categoryAll}
          </button>

          {uniqueCategories.map(([catEn, catInfo]) => (
            <button
              key={catEn}
              className={`categoryFilterTab ${selectedCategory === catEn ? 'active' : ''}`}
              onClick={() => setSelectedCategory(catEn)}
            >
              {catInfo[language]}
            </button>
          ))}
        </div>

        {/* Grid content with category-based key to restart staggered entry animations */}
        <div className="tipsModalContent">
          <div key={selectedCategory} className="tipsGrid">
            {(() => {
              const filteredTips = tips.filter(
                (tip) => selectedCategory === 'all' || tip.category.en === selectedCategory
              );
              if (filteredTips.length === 0) return null;

              const columns: { tip: DocTip; flatIndex: number }[][] = Array.from(
                { length: columnCount },
                () => []
              );
              filteredTips.forEach((tip, index) => {
                columns[index % columnCount].push({ tip, flatIndex: index });
              });

              return columns.map((col, colIndex) => (
                <div key={colIndex} className="tipsGridColumn">
                  {col.map(({ tip, flatIndex }) => {
                    const tipCategory = tip.category[language];
                    const tipTitle = tip.title[language];
                    const tipContent = tip.content[language];
                    const tipDeepTip = tip.deepTip?.[language];

                    return (
                      <div
                        key={tip.key}
                        className="tipGridCard"
                        style={{ animationDelay: `${(flatIndex + 1) * 0.04}s` }}
                      >
                        <div className="tipGridCardInner">
                          <div className="tipGridCardHeader">
                            <span className="tipGridCardCategory">{tipCategory}</span>
                            <div className="tipGridCardTitleRow">
                              <TipIcon name={tip.icon} size={18} className="tipGridCardIcon" />
                              <h3 className="tipGridCardTitle">{tipTitle}</h3>
                            </div>
                          </div>
                          <div className="tipGridCardBody">
                            <p className="tipGridCardContent">{tipContent}</p>
                            {tipDeepTip && (
                              <div className="tipGridCardDeep">
                                <span className="deepLabel">{localizedTips.proTipTitle}:</span>
                                <p className="deepContent">{tipDeepTip}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
