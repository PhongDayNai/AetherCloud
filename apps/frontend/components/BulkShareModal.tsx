'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCloud } from '../context/CloudContext';
import * as Icons from './Icons';
import styles from './BulkShareModal.module.css';

interface BulkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  groups: any[];
}

export default function BulkShareModal({
  isOpen,
  onClose,
  selectedIds,
  groups
}: BulkShareModalProps): React.JSX.Element | null {
  const { t } = useLanguage();
  const { api, addToast, setSelectionMode, setSelectedIds, loadData } = useCloud();

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedGroupIds([]);
      setSearchQuery('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleGroup = (groupId: string) => {
    if (loading) return;
    setSelectedGroupIds(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0) {
      setErrorMsg(t('groups.selectGroupRequired') || 'Vui lòng chọn ít nhất một nhóm.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      // Loop over and share to each selected group
      for (const groupId of selectedGroupIds) {
        const res = await fetch(`${api}/api/assets/bulk/share`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, groupId })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || t('messages.shareFailed') || 'Chia sẻ thất bại.');
        }
      }

      addToast(t('messages.shareSuccess', { count: selectedIds.length }) || `Đã chia sẻ thành công ${selectedIds.length} tệp tin.`, 'info');
      
      // Reset selection and close
      setSelectionMode(false);
      setSelectedIds([]);
      onClose();
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter groups by search query
  const filteredGroups = groups.filter(group => 
    (group.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort groups: unselected first, selected last
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const aSelected = selectedGroupIds.includes(a.id) ? 1 : 0;
    const bSelected = selectedGroupIds.includes(b.id) ? 1 : 0;
    return aSelected - bSelected;
  });

  // Get selected group objects for the pills section
  const selectedGroups = groups.filter(group => selectedGroupIds.includes(group.id));

  // Determine if we have more than 9 selected items (trigger horizontal 3-row grid)
  const isScrollGrid = selectedGroupIds.length > 9;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t('actions.shareToGroup') || 'Chia sẻ vào Nhóm'}</h2>
          <button className={styles.closeBtn} onClick={onClose}><Icons.Close size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

          <div className={styles.shareSummary}>
            {t('groups.shareSummaryText', { count: selectedIds.length }) || `Chọn các nhóm để chia sẻ ${selectedIds.length} tệp tin đã chọn. Các thành viên trong nhóm sẽ có quyền xem các tệp này.`}
          </div>

          {/* Selected Pills Section */}
          {selectedGroups.length > 0 && (
            <div className={styles.selectedContainer}>
              <label className={styles.formLabel}>{t('groups.selected') || 'Đã chọn'}</label>
              <div className={`${styles.selectedPills} ${isScrollGrid ? styles.scrollGrid : ''}`}>
                {selectedGroups.map((group) => (
                  <div 
                    key={group.id} 
                    className={styles.selectedPill}
                    onClick={() => handleToggleGroup(group.id)}
                    title={group.name}
                  >
                    <span className={styles.pillCheck}>✓</span>
                    <span className={styles.pillText}>{group.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar & Workspace List */}
          <div className={styles.groupsListContainer}>
            <label className={styles.formLabel}>{t('sidebar.workspace') || 'Chọn nhóm nhận'}</label>
            
            <div className={styles.searchContainer}>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={styles.searchIcon}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder={t('placeholders.searchGroups') || 'Tìm kiếm nhóm...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                disabled={loading}
              />
            </div>

            {sortedGroups.length === 0 ? (
              <div className={styles.noGroupsText}>
                {searchQuery ? (t('groups.noSearchResults') || 'Không tìm thấy nhóm phù hợp.') : (t('groups.noGroupsAvailable') || 'Không có nhóm nào khả dụng.')}
              </div>
            ) : (
              <div className={styles.groupsList}>
                {sortedGroups.map((group) => {
                  const isChecked = selectedGroupIds.includes(group.id);
                  return (
                    <div 
                      key={group.id} 
                      className={`${styles.groupRow} ${isChecked ? styles.checkedRow : ''}`}
                      onClick={() => handleToggleGroup(group.id)}
                    >
                      <div className={styles.groupInfo}>
                        <Icons.Group size={18} className={styles.groupIcon} />
                        <span className={styles.groupName}>{group.name}</span>
                      </div>
                      <div className={styles.checkboxWrapper}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => {}} // Controlled click via parent row
                          className={styles.groupCheckbox}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.actionBtnCancel} onClick={onClose} disabled={loading}>
              {t('actions.cancel') || 'Hủy'}
            </button>
            <button type="submit" className={styles.actionBtnSubmit} disabled={selectedGroupIds.length === 0 || loading}>
              {loading ? (t('buttons.processing') || 'Đang chia sẻ...') : (t('actions.share') || 'Chia sẻ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
