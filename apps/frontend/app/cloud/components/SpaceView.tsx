'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Asset } from '../../../types';
import { fmtBytes, formatDateTime, translateSpace } from '../../../lib/utils';
import * as Icons from '../../../components/Icons';
import DocView from '../../../components/DocView';
import SmartVideo from '../../../components/SmartVideo';
import styles from './SpaceView.module.css';

interface SpaceViewProps {
  api: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: string;
  activeWorkspace: any;
  activeSpaceName: string;
  spaces: any[];
  groups: any[];
  isGeneralSpace: boolean;
  setEditingSpace: React.Dispatch<React.SetStateAction<any>>;
  setShowEditSpaceModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteSpace: (id: string) => Promise<boolean>;
  confirm: (message: string, options?: { isDanger?: boolean }) => Promise<boolean>;
  postCaption: string;
  setPostCaption: React.Dispatch<React.SetStateAction<string>>;
  postFiles: File[];
  setPostFiles: React.Dispatch<React.SetStateAction<File[]>>;
  saveToPersonalPost: boolean;
  setSaveToPersonalPost: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreatePost: () => Promise<void>;
  posts: any[];
  user: any;
  openSpaceAsset: (id: string) => void;
  // doc view props
  docTypeFilter: string;
  setDocTypeFilter: (filter: string) => void;
  docTypes: string[];
  selectedDocProject: string;
  docCollectionView: 'all' | 'recent' | 'trash';
  setDocCollectionView: (view: 'all' | 'recent' | 'trash') => void;
  docCategoryFilter: string[];
  setDocCategoryFilter: (filter: any) => void;
  spaceAssetsGrouped: any;
  selectedIds: string[];
  cardHandlers: (item: any, onNormalClick?: () => void) => any;
  groupByTimeEnabled: boolean;
  expandedGroups: any;
  toggleGroup: (group: string) => void;
}

export default function SpaceView({
  api,
  t,
  language,
  activeWorkspace,
  activeSpaceName,
  spaces,
  groups,
  isGeneralSpace,
  setEditingSpace,
  setShowEditSpaceModal,
  handleDeleteSpace,
  confirm,
  postCaption,
  setPostCaption,
  postFiles,
  setPostFiles,
  saveToPersonalPost,
  setSaveToPersonalPost,
  handleCreatePost,
  posts,
  user,
  openSpaceAsset,
  docTypeFilter,
  setDocTypeFilter,
  docTypes,
  selectedDocProject,
  docCollectionView,
  setDocCollectionView,
  docCategoryFilter,
  setDocCategoryFilter,
  spaceAssetsGrouped,
  selectedIds,
  cardHandlers,
  groupByTimeEnabled,
  expandedGroups,
  toggleGroup,
}: SpaceViewProps): React.JSX.Element {
  const router = useRouter();

  return (
    <>
      {activeWorkspace.spaceType === 'project' ? (
        <>
          <div className={styles.flexHeader} style={{ marginBottom: '24px' }}>
            <div className={styles.headerText}>
              <h1>{activeSpaceName}</h1>
              <div className={styles.spaceMetaInfo}>
                <span className={styles.spaceTypeRow}>
                  <Icons.Project size={14} />
                  <span>{t('spaces.project') || 'Dự án'}</span>
                </span>
                {(() => {
                  const sp = spaces.find((s) => s.id === activeWorkspace.id);
                  const trans = translateSpace(sp, t);
                  const desc = trans?.description || t('spaces.projectDesc') || 'Quản lý tài liệu dự án';
                  return <span className={styles.spaceDescRow}>{desc}</span>;
                })()}
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.actionBtn} ${styles.editBtn}`}
                style={isGeneralSpace ? { visibility: 'hidden', pointerEvents: 'none' } : {}}
                onClick={() => {
                  const sp = spaces.find((s) => s.id === activeWorkspace.id);
                  if (sp) {
                    setEditingSpace(sp);
                    setShowEditSpaceModal(true);
                  }
                }}
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>{t('spaces.editSpace')}</span>
              </button>

              {(!groups.find((g) => g.id === activeWorkspace.groupId) ||
                ['owner', 'admin'].includes(
                  groups.find((g) => g.id === activeWorkspace.groupId)?.role
                )) && (
                <button
                  className={styles.deleteBtn}
                  onClick={async () => {
                    if (
                      await confirm(
                        t('spaces.confirmDelete') ||
                          'Bạn có chắc chắn muốn xóa không gian con này vào thùng rác?',
                        { isDanger: true }
                      )
                    ) {
                      const success = await handleDeleteSpace(activeWorkspace.id);
                      if (success) {
                        if (activeWorkspace.groupId) {
                          router.push(`/cloud/group/${activeWorkspace.groupId}/spaces`);
                        } else {
                          router.push('/cloud/spaces');
                        }
                      }
                    }
                  }}
                >
                  <Icons.Trash size={14} />
                  <span>{t('spaces.deleteSpace') || 'Xóa không gian'}</span>
                </button>
              )}

              <button
                className={`${styles.actionBtn} ${styles.viewAllBtn}`}
                onClick={() => {
                  router.push(
                    activeWorkspace.type === 'space' && activeWorkspace.groupId
                      ? `/cloud/group/${activeWorkspace.groupId}/space/${activeWorkspace.id}/all`
                      : `/cloud/space/${activeWorkspace.id}/all`
                  );
                }}
              >
                <Icons.AllFiles size={14} />
                <span>{t('spaces.viewAllFiles')}</span>
              </button>
            </div>
          </div>
          <DocView
            docTypeFilter={docTypeFilter}
            setDocTypeFilter={setDocTypeFilter}
            docTypes={docTypes}
            selectedDocProject={selectedDocProject}
            docCollectionView={docCollectionView}
            setDocCollectionView={setDocCollectionView}
            docCategoryFilter={docCategoryFilter}
            setDocCategoryFilter={setDocCategoryFilter}
            docsGrouped={spaceAssetsGrouped}
            selectedIds={selectedIds}
            cardHandlers={(item) => cardHandlers(item, () => openSpaceAsset(item.id))}
            openDoc={openSpaceAsset}
            t={t}
            groupByTimeEnabled={groupByTimeEnabled}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
          />
        </>
      ) : (
        <div className={styles.spaceTimelineView}>
          <div className={styles.flexHeader}>
            <div className={styles.headerText}>
              <h1>{activeSpaceName}</h1>
              <div className={styles.spaceMetaInfo}>
                <span className={styles.spaceTypeRow}>
                  {activeWorkspace.spaceType === 'journal' ? (
                    <>
                      <Icons.Journal size={14} />
                      <span>{t('spaces.journal') || 'Nhật ký'}</span>
                    </>
                  ) : (
                    <>
                      <Icons.Collection size={14} />
                      <span>{t('spaces.collection') || 'Bộ sưu tập'}</span>
                    </>
                  )}
                </span>
                {(() => {
                  const sp = spaces.find((s) => s.id === activeWorkspace.id);
                  const trans = translateSpace(sp, t);
                  const desc =
                    trans?.description ||
                    (activeWorkspace.spaceType === 'journal'
                      ? t('spaces.journalDesc')
                      : t('spaces.collectionDesc')) ||
                    '';
                  return <span className={styles.spaceDescRow}>{desc}</span>;
                })()}
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.actionBtn} ${styles.editBtn}`}
                style={isGeneralSpace ? { visibility: 'hidden', pointerEvents: 'none' } : {}}
                onClick={() => {
                  const sp = spaces.find((s) => s.id === activeWorkspace.id);
                  if (sp) {
                    setEditingSpace(sp);
                    setShowEditSpaceModal(true);
                  }
                }}
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>{t('spaces.editSpace')}</span>
              </button>

              {(!groups.find((g) => g.id === activeWorkspace.groupId) ||
                ['owner', 'admin'].includes(
                  groups.find((g) => g.id === activeWorkspace.groupId)?.role
                )) && (
                <button
                  className={styles.deleteBtn}
                  onClick={async () => {
                    if (
                      await confirm(
                        t('spaces.confirmDelete') ||
                          'Bạn có chắc chắn muốn xóa không gian con này vào thùng rác?',
                        { isDanger: true }
                      )
                    ) {
                      const success = await handleDeleteSpace(activeWorkspace.id);
                      if (success) {
                        if (activeWorkspace.groupId) {
                          router.push(`/cloud/group/${activeWorkspace.groupId}/spaces`);
                        } else {
                          router.push('/cloud/spaces');
                        }
                      }
                    }
                  }}
                >
                  <Icons.Trash size={14} />
                  <span>{t('spaces.deleteSpace') || 'Xóa không gian'}</span>
                </button>
              )}

              <button
                className={`${styles.actionBtn} ${styles.viewAllBtn}`}
                onClick={() => {
                  router.push(
                    activeWorkspace.type === 'space' && activeWorkspace.groupId
                      ? `/cloud/group/${activeWorkspace.groupId}/space/${activeWorkspace.id}/all`
                      : `/cloud/space/${activeWorkspace.id}/all`
                  );
                }}
              >
                <Icons.AllFiles size={14} />
                <span>{t('spaces.viewAllFiles')}</span>
              </button>
            </div>
          </div>
          <div className={styles.postComposer}>
            <textarea
              className={styles.composerInput}
              placeholder={
                activeWorkspace.spaceType === 'journal'
                  ? t('spaces.composerJournalPlaceholder')
                  : t('spaces.composerCollectionPlaceholder')
              }
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
            />
            <div className={styles.composerActions}>
              <label
                htmlFor="space-file-upload"
                className={styles.attachBtn}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
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
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>
                  {t('actions.attachFiles') || 'Đính kèm tệp tin'} ({postFiles.length})
                </span>
              </label>
              <input
                type="file"
                id="space-file-upload"
                multiple
                onChange={(e) => {
                  setPostFiles(Array.from(e.target.files || []));
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <button
                className={styles.submitPostBtn}
                onClick={handleCreatePost}
                disabled={!postCaption.trim() && postFiles.length === 0}
              >
                {t('spaces.postButton')}
              </button>
            </div>

            {postFiles.length > 0 && (
              <div className={styles.composerCheckboxContainer}>
                <label className={`${styles.saveToPersonalPostLabel} ${saveToPersonalPost ? styles.active : ''}`}>
                  <input
                    type="checkbox"
                    checked={saveToPersonalPost}
                    onChange={(e) => setSaveToPersonalPost(e.target.checked)}
                    className={styles['hidden-checkbox']}
                  />
                  <span className={styles['custom-checkbox']}>
                    {saveToPersonalPost && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className={styles['checkbox-text']}>{t('spaces.saveToPersonalCheckbox')}</span>
                </label>
              </div>
            )}
            {postFiles.length > 0 && (
              <div className={styles.attachedFiles}>
                {postFiles.map((f, i) => (
                  <div key={i} className={styles.attachedFileChip}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.AllFiles size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>
                        {f.name} ({fmtBytes(f.size)})
                      </span>
                    </span>
                    <button
                      className={styles.removeFileBtn}
                      onClick={() => setPostFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.postsList}>
            {posts.length === 0 && <div className={styles.emptyHint}>{t('spaces.emptyTimeline')}</div>}
            {posts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div className={styles.postAuthor}>
                    <span className={styles.avatarCircle}>
                      {user ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className={styles.authorName}>{user ? user.name : 'Unknown'}</span>
                  </div>
                  <span className={styles.postTime}>{formatDateTime(post.createdAt, language)}</span>
                </div>
                {post.caption && <div className={styles.postCaption}>{post.caption}</div>}
                {post.assets && post.assets.length > 0 && (
                  <div className={styles.postAssets}>
                    {post.assets.map((asset: any) => {
                      const isImg = asset.type === 'image';
                      const isVid = asset.type === 'video';
                      const src = `${api}/api/assets/_media/original/${asset.id}`;
                      return (
                        <div
                          key={asset.id}
                          className={styles.postAssetCard}
                          onClick={() => openSpaceAsset(asset.id)}
                        >
                          {isImg && <img src={src} alt={asset.originalName} />}
                          {isVid &&
                            (asset.processingStatus === 'processing' ? (
                              <div
                                className={styles.postVideoProcessingPlaceholder}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={styles.doubleRingLoader}>
                                  <div className={styles.ring1} />
                                  <div className={styles.ring2} />
                                </div>
                                <span className={styles.processingText}>
                                  {t('buttons.processing') || 'Đang xử lý...'}
                                </span>
                              </div>
                            ) : (
                              <div className={styles.postVideoThumb}>
                                <SmartVideo
                                  hlsSrc={
                                    asset.hlsRelPath
                                      ? `${api}/api/assets/_media/hls/${asset.id}/master.m3u8`
                                      : undefined
                                  }
                                  mp4Src={
                                    asset.playRelPath
                                      ? `${api}/api/assets/_media/play/${asset.id}`
                                      : `${api}/api/assets/_media/original/${asset.id}`
                                  }
                                  controls
                                />
                              </div>
                            ))}
                          {!isImg && !isVid && (
                            <div className={styles.postFileThumb}>
                              <Icons.DocIcon item={asset} size={32} />
                              <span className={styles.fileName}>{asset.originalName}</span>
                              <span className={styles.fileSize}>{fmtBytes(asset.size)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
