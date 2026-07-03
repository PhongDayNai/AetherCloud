'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Asset, User, DocProject, Tag } from '../types';
import { fmtBytes } from '../lib/utils';
import { useCloud } from '../context/CloudContext';

export const translateSpace = (sp: any, t: any) => {
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
        : (t('spaces.generalDesc') || sp.description)
    };
  }
  return sp;
};

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
}

import * as Icons from './Icons';


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
  docsCount
}: SidebarProps): React.JSX.Element {
  const router = useRouter();
  const { 
    groups, 
    loadData,
    setShowCreateGroupModal,
    setShowGroupSettingsModal
  } = useCloud();
  const [showWsDropdown, setShowWsDropdown] = useState(false);

  // Lắng nghe click toàn cục để tự động collapse bộ chọn workspace và profile menu khi click ra ngoài
  React.useEffect(() => {
    if (!showWsDropdown && !showProfileMenu) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (showWsDropdown) {
        const wrapper = document.querySelector('.workspaceSwitcherWrapper');
        if (wrapper && !wrapper.contains(e.target as Node)) {
          setShowWsDropdown(false);
        }
      }
      if (showProfileMenu) {
        const wrapper = document.querySelector('.profileSwitcherWrapper');
        if (wrapper && !wrapper.contains(e.target as Node)) {
          setShowProfileMenu(false);
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [showWsDropdown, showProfileMenu]);

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
    <aside className="sidebar" onClick={() => { setShowProfileMenu(false); }}>
      <div className="logo">AetherCloud</div>

      {/* Giao diện Workspace Switcher thiết kế theo yêu cầu */}
      <div className="workspaceSwitcherWrapper">
        <div 
          className={`workspaceSwitcherContainer ${showWsDropdown ? 'expanded' : 'collapsed'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!showWsDropdown ? (
            <button className="wsBtn" onClick={() => setShowWsDropdown(true)}>
              <span className="wsIcon">
                {activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId) ? <Icons.User /> : <Icons.Group />}
              </span>
              <span className="wsName">
                {activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId)
                  ? t('sidebar.personalCloud') || 'Không gian cá nhân'
                  : activeWorkspace.type === 'group'
                  ? activeWorkspace.name
                  : (groups.find(g => g.id === activeWorkspace.groupId)?.name || 'Loading group...')}
              </span>
              <span className="wsChangeIcon">
                <Icons.Change size={14} />
              </span>
            </button>
          ) : (
            <div className="wsExpandedContent">
              <div className="wsDropdownTitle">{t('sidebar.workspace') || 'Workspace'}</div>
              
              {/* 1. Trên cùng: Tạo nhóm mới */}
              <button 
                className="wsDropdownItem" 
                onClick={() => {
                  setShowWsDropdown(false);
                  setShowCreateGroupModal(true);
                }}
                style={{ color: 'var(--text-accent)', fontWeight: 600 }}
              >
                <span className="icon"><Icons.Plus /></span>
                <span>{t('sidebar.createGroup') || 'Tạo nhóm mới'}</span>
              </button>

              <div className="navDivider" style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0', opacity: 0.5 }} />

              {/* 2. Thứ hai: Không gian cá nhân */}
              <button 
                className={`wsDropdownItem ${activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId) ? 'active' : ''}`}
                onClick={() => {
                  setShowWsDropdown(false);
                  router.push('/cloud/dashboard');
                }}
              >
                <span className="icon"><Icons.User /></span>
                <span className="name">{t('sidebar.personalCloud') || 'Không gian cá nhân'}</span>
                {(activeWorkspace.type === 'personal' || (activeWorkspace.type === 'space' && !activeWorkspace.groupId)) && <span className="activeDot" />}
              </button>
              
              <div className="navDivider" style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0', opacity: 0.5 }} />
              
              {/* 3. Thứ ba trở đi: Danh sách nhóm */}
              {groups.map((group) => {
                const isCurrentActiveGroup = (activeWorkspace.type === 'group' && activeWorkspace.id === group.id) || (activeWorkspace.type === 'space' && activeWorkspace.groupId === group.id);
                return (
                  <div 
                    key={group.id} 
                    className={`wsDropdownItemWrap ${isCurrentActiveGroup ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', borderRadius: '8px' }}
                  >
                    <button
                      className={`wsDropdownItem ${isCurrentActiveGroup ? 'active' : ''}`}
                      onClick={() => {
                        setShowWsDropdown(false);
                        router.push(`/cloud/group/${group.id}/dashboard`);
                      }}
                      style={{ flex: 1, border: 0, background: 'transparent' }}
                    >
                      <span className="icon"><Icons.Group /></span>
                      <span className="name">{group.name}</span>
                      {isCurrentActiveGroup && <span className="activeDot" />}
                    </button>
                    
                    {isCurrentActiveGroup && (
                      <button 
                        className="wsItemSettingsBtn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWsDropdown(false);
                          setShowGroupSettingsModal(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 0,
                          padding: '6px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          marginRight: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Icons.Settings size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="sidebarMenu">
        {/* Main Navigation */}
        <div className="mainNav">
          <button className={`navItem ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => { router.push(getPath('dashboard')); }}>
            <span className="ico"><Icons.Dashboard /></span><span>{t('sidebar.dashboard') || 'Tổng quan'}</span>
          </button>

          <button className={`navItem ${tab === 'photos' ? 'active' : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum('all'); router.push(getPath('photos')); }}>
            <span className="ico"><Icons.Photos /></span><span>{t('sidebar.allPhotosVideos')}</span><span className="count">{photosCount ?? 0}</span>
          </button>

          <button className={`navItem ${tab === 'docs' ? 'active' : ''}`} onClick={() => { setDocCollectionView('all'); setDocCategoryFilter('all'); setSelectedDocProject('all'); router.push(getPath('docs')); }}>
            <span className="ico"><Icons.Documents /></span><span>{t('sidebar.documents')}</span><span className="count">{docsCount ?? 0}</span>
          </button>

          <button className={`navItem ${tab === 'spaces' || tab === 'space' || tab === 'space-all' ? 'active' : ''}`} onClick={() => { router.push(getPath('spaces')); }}>
            <span className="ico"><Icons.Spaces /></span><span>{t('sidebar.spaces') || 'Không gian con'}</span><span className="count">{spaces.length}</span>
          </button>
        </div>

        <div className="navDivider" style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0', opacity: 0.5 }} />

        {/* Sub Navigation (Dynamic Area) */}
        <div className="subNav" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tab === 'photos' && (
            <div className="sectionBody sectionIn">
              <div className="subList">
                <button className={`subItem ${selectedAlbum === 'all' ? 'active' : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum('all'); router.push(getPath('photos')); }}>
                  <span className="ico" style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                  {t('sidebar.all')}
                </button>
                {availableAlbums.map(([name, count]) => (
                  <button key={name} className={`subItem ${selectedAlbum === name ? 'active' : ''}`} onClick={() => { setCollectionView('all'); setSelectedAlbum(name); router.push(getPath('photos')); }}>
                    <span className="ico" style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                    {name} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'docs' && (
            <div className="sectionBody sectionIn">
              <div className="subList">
                <button className={`subItem ${selectedDocProject === 'all' ? 'active' : ''}`} onClick={() => setSelectedDocProject('all')}>
                  <span className="ico" style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                  {t('sidebar.allProjects') || 'Tất cả tập tài liệu'}
                </button>
                {docProjects.map((p) => (
                  <button key={p.name} className={`subItem ${selectedDocProject === p.name ? 'active' : ''}`} onClick={() => setSelectedDocProject(p.name)}>
                    <span className="ico" style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}><Icons.Folder /></span>
                    {p.name} ({p.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {(tab === 'spaces' || tab === 'space' || tab === 'space-all') && (
            <div className="sectionBody sectionIn">
              <div className="subList">
                {spaces.map((rawSp) => {
                  const sp = translateSpace(rawSp, t);
                  return (
                    <button 
                      key={sp.id} 
                      className={`subItem ${(tab === 'space' || tab === 'space-all') && activeWorkspace.type === 'space' && activeWorkspace.id === sp.id ? 'active' : ''}`} 
                      onClick={() => { 
                        const gId = sp.groupId || sp.group_id;
                        router.push(gId ? `/cloud/group/${gId}/space/${sp.id}` : `/cloud/space/${sp.id}`);
                      }}
                    >
                      <span className="ico" style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}>
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

        <div className="navDivider" style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0', opacity: 0.5 }} />

        <div className="tagsSection">
          <div className="tagsHeader">{t('sidebar.tagsTitle')}</div>
          {tags.length === 0 ? (
            <div className="subHint">{t('sidebar.noTags')}</div>
          ) : (
            <div className="tagCloud">
              {tags.map((tVal) => {
                const isActive = selectedFilterTags.includes(tVal.name);
                return (
                  <button key={tVal.name} className={`tagChip ${isActive ? 'active' : ''}`} onClick={() => toggleFilterTag(tVal.name)}>
                    <span className="name">#{tVal.name}</span>
                    <span className="count">{tVal.count}</span>
                  </button>
                );
              })}
              {selectedFilterTags.length > 0 && (
                <button className="tagChipClear" onClick={() => setSelectedFilterTags([])}>{t('sidebar.clearFilter')}</button>
              )}
            </div>
          )}
        </div>
      </div>



      <div className="storageCard">
        <div className="label">{t('sidebar.storageTitle')}</div>
        {usage ? (
          <>
            {(() => {
              const appUsed = (usage.breakdown?.originalsBytes || 0) + (usage.breakdown?.derivedBytes || 0) + (usage.breakdown?.trashBytes || 0);
              const appPercent = usage.totalBytes > 0 ? Number(((appUsed / usage.totalBytes) * 100).toFixed(4)) : 0;
              return (
                <>
                  <div className="row"><span>{t('sidebar.storageUsed')}</span><b>{fmtBytes(appUsed)}</b></div>
                  <div className="row"><span>{t('sidebar.totalDisk')}</span><b>{fmtBytes(usage.totalBytes)}</b></div>
                  <div className="bar"><div className="barFill" style={{ width: `${Math.min(100, appPercent)}%` }} /></div>
                  <small>AetherCloud: {appPercent}% · Filesystem: {usage.usedPercent}%</small>
                  {Number(usage.processingCount || 0) > 0 && <small>{t('sidebar.processingMedia', { count: usage.processingCount })}</small>}
                </>
              );
            })()}
          </>
        ) : <small>{t('sidebar.loading')}</small>}
      </div>

      <div className="profileSwitcherWrapper">
        <div 
          className={`profileSwitcherContainer ${showProfileMenu ? 'expanded' : 'collapsed'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!showProfileMenu ? (
            <div className="profileBtn" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(true); }}>
              <div className="profileAvatar">
                {user ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="profileMeta">
                <div className="profileName">{user ? (user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })) : t('sidebar.loading')}</div>
                <div className="profileRole">{user ? (user.role === 'admin' ? t('profile.admin') : t('profile.member')) : ''}</div>
              </div>
              <div className="profileSettingsIcon">
                <Icons.Settings size={14} />
              </div>
            </div>
          ) : (
            user && (
              <div className="profileExpandedContent">
                <div className="popoverUserHeader">
                  <div className="popoverUserEmail">{user.email}</div>
                  <div className="popoverUserAvatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="avatarImg" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="popoverUserName">{user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })}</div>
                  <div className="popoverUserBadge">
                    {user.role === 'admin' ? t('profile.admin') : t('profile.member')}
                  </div>
                </div>
                
                <div className="navDivider" style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0', opacity: 0.5, width: '100%' }} />
                
                <button className="popoverItem" onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}>
                  <span className="popoverIcon"><Icons.Settings size={14} /></span>
                  <span>{t('profile.settings')}</span>
                </button>
                <button className="popoverItem" onClick={() => { handleLogout(); setShowProfileMenu(false); }}>
                  <span className="popoverIcon"><Icons.LogOut size={14} /></span>
                  <span>{t('profile.logout')}</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          border-right: 1px solid var(--border-color);
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          background: var(--bg-sidebar);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .logo {
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 24px;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          padding-left: 8px;
        }
        .navItem {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          border: 0;
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 4px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: inherit;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .navItem:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
          transform: translateX(2px);
        }
        .navItem.active {
          background: var(--bg-item-active);
          color: var(--text-primary);
          box-shadow: inset 0 0 0 1px var(--border-color), 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .ico {
          font-size: 16px;
          width: 20px;
          display: inline-flex;
          justify-content: center;
          opacity: 0.9;
        }
        .count {
          margin-left: auto;
          font-size: 11px;
          font-weight: 600;
          background: var(--bg-item-active);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: 6px;
        }
        .navItem.active .count {
          background: var(--bg-active-count);
          color: var(--text-active-count);
        }
        .chev {
          margin-left: auto;
          opacity: .6;
          font-size: 10px;
          transition: transform 0.2s ease;
        }
        .sectionWrap {
          margin-top: 16px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        .sectionTitle {
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--text-muted);
          text-transform: uppercase;
          padding-left: 8px;
        }
        .sectionBody {
          animation: sectionSlideIn .25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .subList {
          margin: 4px 0 8px 12px;
          border-left: 1px solid var(--border-color);
          padding-left: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: listSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
          transform-origin: top;
        }
        .subItem {
          width: 100%;
          text-align: left;
          border: 0;
          background: transparent;
          color: var(--text-muted);
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .subItem:hover {
          background: var(--bg-item-hover);
          color: var(--text-secondary);
        }
        .subItem.active {
          background: var(--bg-item-active);
          color: var(--text-primary);
        }
        .subHint {
          font-size: 11px;
          color: var(--text-muted);
          padding: 6px 10px;
          font-style: italic;
        }
        .sidebarMenu {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          scrollbar-width: none;
        }
        .sidebarMenu::-webkit-scrollbar {
          display: none;
        }
        .storageCard {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 12px;
        }
        .profileSwitcherWrapper {
          position: relative;
          width: 100%;
          height: 52px;
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .profileSwitcherContainer {
          position: absolute;
          bottom: 12px;
          left: 0;
          width: 100%;
          z-index: 1000;
          background: transparent;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .profileSwitcherContainer.collapsed {
          height: 52px;
        }
        .profileSwitcherContainer.expanded {
          background: var(--bg-popover);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 16px 12px 12px 12px;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
          transform-origin: bottom center;
          animation: profileExpandAnim 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .profileBtn {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          height: 52px;
        }
        .profileBtn:hover {
          background: var(--bg-item-hover);
        }
        .profileSettingsIcon {
          display: flex;
          align-items: center;
          color: var(--text-muted);
          transition: all 0.25s ease;
        }
        .profileBtn:hover .profileSettingsIcon {
          color: var(--text-primary);
          transform: rotate(90deg);
        }
        @keyframes profileExpandAnim {
          from {
            opacity: 0;
            transform: scaleY(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
          }
        }
        .profileAvatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
        }
        .profileMeta {
          flex: 1;
          min-width: 0;
        }
        .profileName {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profileRole {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .popoverUserHeader {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          text-align: center;
        }
        .popoverUserEmail {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 14px;
          word-break: break-all;
          width: 100%;
        }
        .popoverUserAvatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 22px;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        .avatarImg {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .popoverUserName {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .popoverUserBadge {
          font-size: 10.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 99px;
          background: var(--popover-badge-bg);
          color: var(--popover-badge-text);
          border: 1px solid var(--popover-badge-border);
          display: inline-block;
          margin-bottom: 14px;
        }
        .popoverDivider {
          border: 0;
          height: 1px;
          background: var(--popover-divider);
          margin: 10px 0;
          width: 100%;
        }
        .popoverItem {
          width: 100%;
          background: transparent;
          border: 0;
          padding: 10px 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
          font-size: 13.5px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
          box-sizing: border-box;
        }
        .popoverItem:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
        }
        .popoverIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .popoverItem:hover .popoverIcon {
          color: var(--text-primary);
        }
        .storageCard .label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 6px;
          color: var(--text-secondary);
        }
        .row b {
          color: var(--text-primary);
        }
        .bar {
          height: 6px;
          border-radius: 99px;
          overflow: hidden;
          background: var(--bg-item-active);
          margin: 8px 0;
        }
        .barFill {
          height: 100%;
          background: linear-gradient(90deg, var(--text-primary), var(--text-secondary));
          border-radius: 99px;
        }
        .storageCard small {
          display: block;
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 4px;
          line-height: 1.4;
        }

        .tagsSection {
          margin: 16px 0;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        .tagsHeader {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .tagCloud {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tagChip {
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--text-secondary);
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .tagChip:hover {
          background: var(--bg-item-hover);
          color: var(--text-primary);
          border-color: var(--border-input-focus);
        }
        .tagChip.active {
          background: var(--button-primary-bg);
          border-color: var(--button-primary-bg);
          color: var(--button-primary-text);
          box-shadow: 0 4px 10px var(--button-primary-shadow);
        }
        .tagChip.active .count {
          color: var(--button-primary-text);
          opacity: 0.8;
          background: var(--bg-tag-active-count);
        }
        .tagChip .count {
          font-size: 9px;
          color: var(--text-muted);
          background: var(--bg-item-active);
          padding: 1px 4px;
          border-radius: 4px;
        }
        .tagChipClear {
          border: 1px solid rgba(239, 68, 68, 0.15);
          background: rgba(239, 68, 68, 0.05);
          color: #fca5a5;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .tagChipClear:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ffffff;
        }

        .workspaceSwitcherWrapper {
          position: relative;
          width: 100%;
          height: 40px;
          margin-bottom: 16px;
        }
        .workspaceSwitcherContainer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .workspaceSwitcherContainer.collapsed {
          height: 38px;
        }
        .workspaceSwitcherContainer.expanded {
          background: var(--bg-popover);
          border-color: var(--border-strong);
          border-radius: 14px;
          padding: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transform-origin: top center;
          animation: wsExpand 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .wsBtn {
          width: 100%;
          height: 36px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: none;
          padding: 0 14px;
          color: var(--text-primary);
          font-family: inherit;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          box-sizing: border-box;
        }
        .wsBtn:hover {
          background: var(--bg-item-hover);
        }
        .wsIcon {
          font-size: 16px;
          display: inline-flex;
          align-items: center;
        }
        .wsName {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wsChangeIcon {
          display: flex;
          align-items: center;
          color: var(--text-muted);
          transition: all 0.25s ease;
        }
        .wsBtn:hover .wsChangeIcon {
          color: var(--text-primary);
          transform: rotate(180deg);
        }
        .wsExpandedContent {
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: wsFadeIn 0.2s ease-out forwards;
        }
        .wsBackdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
          background: transparent;
        }
        .activeDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--button-primary-bg);
          margin-left: auto;
          box-shadow: 0 0 8px var(--button-primary-bg);
        }
        @keyframes wsExpand {
          from {
            opacity: 0;
            transform: scaleY(0.9) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
          }
        }
        @keyframes wsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .wsDropdownTitle {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          padding: 6px 10px;
          letter-spacing: 0.5px;
        }
        .wsDropdownItemWrap {
          transition: all 0.15s ease;
        }
        .wsDropdownItemWrap:hover {
          background: var(--bg-item-hover);
        }
        .wsDropdownItemWrap.active {
          background: var(--bg-item-active);
        }
        .wsDropdownItem {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: 0;
          padding: 8px 10px;
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          text-align: left;
          transition: all 0.15s ease;
        }
        .wsDropdownItem:hover {
          color: var(--text-primary);
        }
        .wsDropdownItem.active {
          color: var(--text-primary);
        }
        .wsDropdownItem .icon {
          font-size: 15px;
          display: inline-flex;
          align-items: center;
        }
        .wsItemSettingsBtn:hover {
          color: var(--text-primary) !important;
        }
        
        @keyframes dropdownSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </aside>
  );
}
