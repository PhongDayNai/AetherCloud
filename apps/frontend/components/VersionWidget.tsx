'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime, getApiOrigin } from '../lib/utils';

const api = getApiOrigin();

interface VersionItem {
  versionNumber: number;
  size: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  } | null;
  isActive: boolean;
}

interface VersionWidgetProps {
  assetId: string;
  currentVersion: number;
  hasWritePermission: boolean;
  onPreviewVersion: (version: VersionItem | null) => void;
  onRestoreVersion: (versionNumber: number) => Promise<void>;
  previewVersion: VersionItem | null;
}

export default function VersionWidget({
  assetId,
  currentVersion,
  hasWritePermission,
  onPreviewVersion,
  onRestoreVersion,
  previewVersion
}: VersionWidgetProps) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchVersions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${api}/api/assets/${assetId}/versions`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, assetId]);

  // Click outside close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 400); // Small delay to prevent accidental closing
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      className="versionWidgetContainer"
      ref={widgetRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`versionTriggerBtn ${previewVersion ? 'previewing' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {previewVersion
          ? `${t('viewer.preview')}: v${previewVersion.versionNumber}`
          : `v${currentVersion}`}
      </button>

      {isOpen && (
        <div className="versionPopoverCard">
          <div className="versionPopoverHeader">
            <h4 className="versionPopoverTitle">{t('viewer.history')}</h4>
          </div>

          <div className="versionListContainer">
            {isLoading ? (
              <div className="versionListLoading">
                <span className="spinner" />
                <span>{t('messages.loading')}</span>
              </div>
            ) : items.length === 0 ? (
              <div className="versionListEmpty">{t('viewer.noHistoryFound')}</div>
            ) : (
              <div className="versionList">
                {items.map((item) => {
                  const isCurrentActive = item.isActive;
                  const isBeingPreviewed = previewVersion?.versionNumber === item.versionNumber;

                  return (
                    <div
                      key={item.versionNumber}
                      className={`versionItem ${isCurrentActive ? 'active' : ''} ${
                        isBeingPreviewed ? 'previewed' : ''
                      }`}
                    >
                      <div className="versionItemMeta">
                        <div className="versionNumberRow">
                          <span className="versionNumPill">v{item.versionNumber}</span>
                          {isCurrentActive && (
                            <span className="activeVersionBadge">
                              {t('viewer.currentVersion')}
                            </span>
                          )}
                          {isBeingPreviewed && (
                            <span className="previewVersionBadge">
                              {t('viewer.preview')}
                            </span>
                          )}
                        </div>
                        <div className="versionDetailsRow">
                          <span className="versionAuthor">
                            {item.createdBy?.name || 'Anonymous'}
                          </span>
                          <span className="versionDot">•</span>
                          <span className="versionSize">{formatBytes(item.size)}</span>
                        </div>
                        <div className="versionTimeRow">
                          {formatDateTime(item.createdAt, language)}
                        </div>
                      </div>

                      <div className="versionItemActions">
                        {isCurrentActive ? (
                          // Active file version has no action inside popover
                          null
                        ) : (
                          <>
                            {isBeingPreviewed ? (
                              <button
                                type="button"
                                className="versionActionBtn exitPreviewBtn"
                                title={t('viewer.exitPreview')}
                                onClick={() => onPreviewVersion(null)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="versionActionBtn previewBtn"
                                title={t('viewer.preview')}
                                onClick={() => onPreviewVersion(item)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            )}

                            {hasWritePermission && (
                              <button
                                type="button"
                                className="versionActionBtn restoreBtn"
                                title={t('viewer.restore')}
                                onClick={() => onRestoreVersion(item.versionNumber)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="23 4 23 10 17 10" />
                                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
