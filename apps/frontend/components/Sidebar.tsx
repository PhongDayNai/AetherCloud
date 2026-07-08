'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Asset, User, DocProject, Tag } from '../types';
import * as Icons from './Icons';
import styles from './Sidebar.module.css';

import WorkspaceSwitcher from './sidebar/WorkspaceSwitcher';
import ProfileMenu from './sidebar/ProfileMenu';
import StorageProgress from './sidebar/StorageProgress';
import { translateSpace } from '../lib/utils';

interface SidebarProps {
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  setTab: (tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces') => void;
  collectionView: 'all' | 'recent' | 'images' | 'videos' | 'trash';
  setCollectionView: (view: 'all' | 'recent' | 'images' | 'videos' | 'trash') => void;
  selectedAlbum: string;
  setSelectedAlbum: (album: string) => void;
  setSelectionMode: (mode: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  basePhotoAssets: Asset[];
  docs: Asset[];
  trashedDocs: Asset[];
  docCollectionView: 'all' | 'recent' | 'trash';
  setDocCollectionView: (view: 'all' | 'recent' | 'trash') => void;
  docCategoryFilter: string[];
  setDocCategoryFilter: (filter: any) => void;
  setSelectedDocProject: (project: string) => void;
  albumsExpanded: boolean;
  setAlbumsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  availableAlbums: [string, number][];
  docProjectsExpanded: boolean;
  setDocProjectsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDocProject: string;
  docProjects: DocProject[];
  docsBase: Asset[];
  docCategoryCounts: Map<string, number>;
  docKindsExpanded: boolean;
  setDocKindsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  docTypes: string[];
  docTypeFilter: string;
  setDocTypeFilter: (filter: string) => void;
  tags: Tag[];
  selectedFilterTags: string[];
  toggleFilterTag: (tagName: string) => void;
  setSelectedFilterTags: (tags: string[]) => void;
  usage: any;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  user: User | null;
  setShowSettingsModal: (show: boolean) => void;
  handleLogout: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  activeWorkspace: any;
  setActiveWorkspace: (ws: any) => void;
  spaces: any[];
  photosCount?: number;
  docsCount?: number;
  groups: any[];
}

export default function Sidebar({
  tab,
  setTab,
  collectionView,
  setCollectionView,
  selectedAlbum,
  setSelectedAlbum,
  setSelectionMode,
  setSelectedIds,
  basePhotoAssets,
  docs,
  trashedDocs,
  docCollectionView,
  setDocCollectionView,
  docCategoryFilter,
  setDocCategoryFilter,
  setSelectedDocProject,
  albumsExpanded,
  setAlbumsExpanded,
  availableAlbums,
  docProjectsExpanded,
  setDocProjectsExpanded,
  selectedDocProject,
  docProjects,
  docsBase,
  docCategoryCounts,
  docKindsExpanded,
  setDocKindsExpanded,
  docTypes,
  docTypeFilter,
  setDocTypeFilter,
  tags,
  selectedFilterTags,
  toggleFilterTag,
  setSelectedFilterTags,
  usage,
  showProfileMenu,
  setShowProfileMenu,
  user,
  setShowSettingsModal,
  handleLogout,
  t,
  activeWorkspace,
  setActiveWorkspace,
  spaces,
  photosCount,
  docsCount,
  groups
}: SidebarProps): React.JSX.Element {
  const router = useRouter();

  const getPath = (targetTab: string) => {
    let gId: string | null = null;
    if (activeWorkspace.type === 'group') {
      gId = activeWorkspace.id;
    } else if (activeWorkspace.type === 'space' && activeWorkspace.groupId) {
      gId = activeWorkspace.groupId;
    }
    return gId ? `/cloud/group/${gId}/${targetTab}` : `/cloud/${targetTab}`;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>AetherCloud</div>

      {/* Workspace Switcher subcomponent */}
      <WorkspaceSwitcher
        activeWorkspace={activeWorkspace}
        t={t}
      />

      <div className={styles.sidebarMenu}>
        {/* Main Navigation */}
        <div className={styles.mainNav}>
          <button className={`${styles.navItem} ${tab === 'dashboard' ? styles.active : ''}`} onClick={() => { router.push(getPath('dashboard')); }}>
            <span className={styles.ico}><Icons.Dashboard /></span><span>{t('sidebar.dashboard') || 'Tổng quan'}</span>
          </button>

          <button className={`${styles.navItem} ${tab === 'photos' ? styles.active : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum('all'); router.push(getPath('photos')); }}>
            <span className={styles.ico}><Icons.Photos /></span><span>{t('sidebar.allPhotosVideos')}</span><span className={styles.count}>{photosCount ?? 0}</span>
          </button>

          <button className={`${styles.navItem} ${tab === 'docs' ? styles.active : ''}`} onClick={() => { setDocCollectionView('all'); setDocCategoryFilter('all'); setSelectedDocProject('all'); router.push(getPath('docs')); }}>
            <span className={styles.ico}><Icons.Documents /></span><span>{t('sidebar.documents')}</span><span className={styles.count}>{docsCount ?? 0}</span>
          </button>

          <button className={`${styles.navItem} ${tab === 'spaces' || tab === 'space' || tab === 'space-all' ? styles.active : ''}`} onClick={() => { router.push(getPath('spaces')); }}>
            <span className={styles.ico}><Icons.Spaces /></span><span>{t('sidebar.spaces') || 'Không gian con'}</span><span className={styles.count}>{spaces.length}</span>
          </button>
        </div>

        <div className={styles.navDivider} style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0', opacity: 0.5 }} />

        {/* Sub Navigation (Dynamic Area) */}
        <div className={styles.subNav} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tab === 'photos' && (
            <div className={`${styles.sectionBody} ${styles.sectionIn}`}>
              <div className={styles.subList}>
                <button className={`${styles.subItem} ${selectedAlbum === 'all' ? styles.active : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum('all'); router.push(getPath('photos')); }}>
                  <span className={styles.ico} style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                  {t('sidebar.all')}
                </button>
                {availableAlbums.map(([name, count]) => (
                  <button key={name} className={`${styles.subItem} ${selectedAlbum === name ? styles.active : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum(name); router.push(getPath('photos')); }}>
                    <span className={styles.ico} style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                    {name} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'docs' && (
            <div className={`${styles.sectionBody} ${styles.sectionIn}`}>
              <div className={styles.subList}>
                <button className={`${styles.subItem} ${selectedDocProject === 'all' ? styles.active : ''}`} onClick={() => setSelectedDocProject('all')}>
                  <span className={styles.ico} style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                  {t('sidebar.allProjects') || 'Tất cả tập tài liệu'}
                </button>
                {docProjects.map((p) => (
                  <button key={p.name} className={`${styles.subItem} ${selectedDocProject === p.name ? styles.active : ''}`} onClick={() => setSelectedDocProject(p.name)}>
                    <span className={styles.ico} style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                    {p.name} ({p.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {(tab === 'spaces' || tab === 'space' || tab === 'space-all') && (
            <div className={`${styles.sectionBody} ${styles.sectionIn}`}>
              <div className={styles.subList}>
                {spaces.map((rawSp) => {
                  const sp = translateSpace(rawSp, t);
                  return (
                    <button 
                      key={sp.id} 
                      className={`${styles.subItem} ${(tab === 'space' || tab === 'space-all') && activeWorkspace.type === 'space' && activeWorkspace.id === sp.id ? styles.active : ''}`} 
                      onClick={() => { 
                        const gId = sp.groupId || sp.group_id;
                        router.push(gId ? `/cloud/group/${gId}/space/${sp.id}` : `/cloud/space/${sp.id}`);
                      }}
                    >
                      <span className={styles.ico} style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}>
                        {sp.type === 'journal' ? <Icons.Journal /> : sp.type === 'collection' ? <Icons.Collection /> : <Icons.Project />}
                      </span>
                      <span>{sp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className={styles.navDivider} style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0', opacity: 0.5 }} />

        <div className={styles.tagsSection}>
          <div className={styles.tagsHeader}>{t('sidebar.tagsTitle')}</div>
          {tags.length === 0 ? (
            <div className={styles.subHint}>{t('sidebar.noTags')}</div>
          ) : (
            <div className={styles.tagCloud}>
              {tags.map((tVal) => {
                const isActive = selectedFilterTags.includes(tVal.name);
                return (
                  <button key={tVal.name} className={`${styles.tagChip} ${isActive ? styles.active : ''}`} onClick={() => toggleFilterTag(tVal.name)}>
                    <span className={styles.name}>#{tVal.name}</span>
                    <span className={styles.count}>{tVal.count}</span>
                  </button>
                );
              })}
              {selectedFilterTags.length > 0 && (
                <button className={styles.tagChipClear} onClick={() => setSelectedFilterTags([])}>{t('sidebar.clearFilter')}</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Disk usage Storage progress subcomponent */}
      <StorageProgress
        usage={usage}
        t={t}
      />

      {/* User profile dropdown switcher subcomponent */}
      <ProfileMenu
        user={user}
        setShowSettingsModal={setShowSettingsModal}
        handleLogout={handleLogout}
        t={t}
        activeWorkspace={activeWorkspace}
        groups={groups}
      />
    </aside>
  );
}
