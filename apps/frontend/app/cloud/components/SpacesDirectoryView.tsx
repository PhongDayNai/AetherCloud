'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import * as Icons from '../../../components/Icons';
import styles from './SpacesDirectoryView.module.css';

interface SpacesDirectoryViewProps {
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: string;
  activeWorkspace: any;
  spaces: any[];
  spacesSubTab: string;
  setSpacesSubTab: (subTab: string) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: string[];
  spaceCardHandlers: (spaceId: string, onNormalClick?: () => void) => any;
  togglePick: (id: string) => void;
  setShowCreateSpaceModal: (show: boolean) => void;
}

const translateSpace = (sp: any, t: any) => {
  if (!sp) return sp;
  const isGeneral =
    sp.name === 'General' &&
    sp.type === 'journal' &&
    (sp.description === 'General discussion space for the group' || sp.description === 'Write journal entries with attachments.');
  if (isGeneral) {
    const isAlt = sp.description === 'Write journal entries with attachments.';
    return {
      ...sp,
      name: t('spaces.generalName') || sp.name,
      description: isAlt
        ? (t('spaces.generalDescAlternative') || sp.description)
        : (t('spaces.generalDesc') || sp.description),
    };
  }
  return sp;
};

export default function SpacesDirectoryView({
  t,
  language,
  activeWorkspace,
  spaces,
  spacesSubTab,
  setSpacesSubTab,
  setSelectedIds,
  setSelectionMode,
  selectedIds,
  spaceCardHandlers,
  togglePick,
  setShowCreateSpaceModal,
}: SpacesDirectoryViewProps): React.JSX.Element {
  const router = useRouter();
  const isGroup = activeWorkspace.type === 'group';
  const myGroupRole = isGroup ? activeWorkspace.role : null;
  const canCreateSpace = !isGroup || myGroupRole === 'owner' || myGroupRole === 'admin';

  const activeSpaces = spaces.filter((sp) => !sp.is_deleted && !sp.isDeleted);
  const trashedSpaces = spaces.filter((sp) => sp.is_deleted || sp.isDeleted);
  const spacesToRender = spacesSubTab === 'active' ? activeSpaces : trashedSpaces;

  return (
    <div className={styles.spacesDirectory}>
      <div className={`${styles.pageHeader} ${styles.flexHeader}`}>
        <div className={styles.headerText}>
          <h1>
            {isGroup ? t('spaces.groupTitle') : t('spaces.title') || 'Không gian con cá nhân'}
          </h1>
          <p>
            {isGroup
              ? t('spaces.groupSubtitle') ||
                'Quản lý các nhật ký, bộ sưu tập tệp tin và dự án tài liệu chia sẻ trong nhóm.'
              : t('spaces.subtitle') ||
                'Quản lý các nhật ký, bộ sưu tập tệp tin và dự án tài liệu riêng tư của bạn.'}
          </p>
        </div>
      </div>

      {/* Selector tab Hoạt động / Thùng rác */}
      <div className={styles.spacesSubTabs}>
        <button
          className={`${styles.spacesTabBtn} ${spacesSubTab === 'active' ? styles.active : ''}`}
          onClick={() => {
            setSpacesSubTab('active');
            setSelectedIds([]);
            setSelectionMode(false);
          }}
        >
          {t('spaces.activeTab') || 'Đang hoạt động'} ({activeSpaces.length})
        </button>
        <button
          className={`${styles.spacesTabBtn} ${spacesSubTab === 'trash' ? styles.active : ''}`}
          onClick={() => {
            setSpacesSubTab('trash');
            setSelectedIds([]);
            setSelectionMode(false);
          }}
        >
          {t('spaces.trashTab') || 'Thùng rác'} ({trashedSpaces.length})
        </button>
      </div>

      <div className={styles.spacesGrid}>
        {/* Card tạo mới: chỉ hiển thị ở tab Active và khi người dùng có quyền */}
        {spacesSubTab === 'active' && canCreateSpace && (
          <div className={`${styles.spaceCard} ${styles.createCard}`} onClick={() => setShowCreateSpaceModal(true)}>
            <div className={styles.createIcon}>
              <Icons.Plus size={28} />
            </div>
            <div className={styles.createLabel}>{t('spaces.create') || 'Tạo không gian con'}</div>
            <div className={styles.createSub}>{t('spaces.createTypes')}</div>
          </div>
        )}

        {spacesToRender.map((rawSp) => {
          const sp = translateSpace(rawSp, t);
          const isSelected = selectedIds.includes(sp.id);
          return (
            <div
              key={sp.id}
              className={`${styles.spaceCard} ${isSelected ? styles.picked : ''}`}
              {...spaceCardHandlers(sp.id, () => {
                const gId = sp.groupId || sp.group_id;
                router.push(gId ? `/cloud/group/${gId}/space/${sp.id}` : `/cloud/space/${sp.id}`);
              })}
              onContextMenu={(e) => {
                e.preventDefault();
                if (spacesSubTab === 'trash') return;
                setSelectionMode(true);
                togglePick(sp.id);
              }}
            >
              <div className={styles.spaceCardHeader}>
                <span className={styles.spaceTypeIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {sp.type === 'journal' ? (
                    <Icons.Journal size={24} />
                  ) : sp.type === 'collection' ? (
                    <Icons.Collection size={24} />
                  ) : (
                    <Icons.Project size={24} />
                  )}
                </span>
                <span className={styles.spaceBadge}>
                  {sp.type === 'journal'
                    ? t('spaces.journal') || 'Nhật ký'
                    : sp.type === 'collection'
                    ? t('spaces.collection') || 'Bộ sưu tập'
                    : t('spaces.project') || 'Dự án'}
                </span>
              </div>
              <h3 className={styles.spaceCardName}>{sp.name}</h3>
              <p className={styles.spaceCardDesc}>{sp.description || t('spaces.noDescription')}</p>
              <div className={styles.spaceCardFooter}>
                <span>
                  {t('spaces.createdLabel') || 'Đã tạo'}:{' '}
                  {new Date(sp.createdAt || sp.created_at).toLocaleDateString(
                    language === 'vi' ? 'vi-VN' : 'en-US'
                  )}
                </span>
              </div>

              {isSelected && <div className={styles.badge}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
