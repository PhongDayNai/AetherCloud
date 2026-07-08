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
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  setTab: (tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces') => void;
  collectionView: 'all' | 'recent' | 'albums' | 'images' | 'videos' | 'trash';
  setCollectionView: (view: 'all' | 'recent' | 'albums' | 'images' | 'videos' | 'trash') => void;
  selectedAlbum: string;
  setSelectedAlbum: (album: string) => void;
  setSelectionMode: (mode: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  basePhotoAssets: Asset[];
  docs: Asset[];
  trashedDocs: Asset[];
  docCollectionView: 'all' | 'recent' | 'binders' | 'trash';
  setDocCollectionView: (view: 'all' | 'recent' | 'binders' | 'trash') => void;
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
  const { language } = useLanguage();

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
            <span className={styles.ico}><Icons.Dashboard /></span><span>{t('sidebar.dashboard') || (language === 'en' ? 'Dashboard' : 'Tổng quan')}</span>
          </button>

          <button className={`${styles.navItem} ${tab === 'photos' ? styles.active : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum('all'); router.push(getPath('photos')); }}>
            <span className={styles.ico}><Icons.Photos /></span><span>{t('sidebar.allPhotosVideos') || (language === 'en' ? 'All Photos/Videos' : 'Tất cả ảnh/video')}</span><span className={styles.count}>{photosCount ?? 0}</span>
          </button>

          <button className={`${styles.navItem} ${tab === 'docs' ? styles.active : ''}`} onClick={() => { setDocCollectionView('all'); setDocCategoryFilter('all'); setSelectedDocProject('all'); router.push(getPath('docs')); }}>
            <span className={styles.ico}><Icons.Documents /></span><span>{t('sidebar.documents') || (language === 'en' ? 'Documents' : 'Tài liệu')}</span><span className={styles.count}>{docsCount ?? 0}</span>
          </button>

          <button className={`${styles.navItem} ${tab === 'spaces' || tab === 'space' || tab === 'space-all' ? styles.active : ''}`} onClick={() => { router.push(getPath('spaces')); }}>
            <span className={styles.ico}><Icons.Spaces /></span><span>{t('sidebar.spaces') || (language === 'en' ? 'Spaces' : 'Không gian con')}</span><span className={styles.count}>{spaces.length}</span>
          </button>
        </div>

        <div className={styles.tagsSection}>
          <div className={styles.tagsHeader}>{t('sidebar.tagsTitle') || (language === 'en' ? 'Tags' : 'Nhãn / Tags')}</div>
          {tags.length === 0 ? (
            <div className={styles.subHint}>{t('sidebar.noTags') || (language === 'en' ? 'No tags yet.' : 'Chưa có nhãn nào.')}</div>
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
                <button className={styles.tagChipClear} onClick={() => setSelectedFilterTags([])}>{t('sidebar.clearFilter') || (language === 'en' ? 'Clear' : 'Bỏ lọc')}</button>
              )}
            </div>
          )}
        </div>

        <div style={{ flexGrow: 1 }} />
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
