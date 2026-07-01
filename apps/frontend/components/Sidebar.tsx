'use client';

import React from 'react';
import { Asset, User, DocProject, Tag } from '../types';
import { fmtBytes } from '../lib/utils';

interface SidebarProps {
  tab: 'photos' | 'docs';
  setTab: (tab: 'photos' | 'docs') => void;
  collectionView: 'all' | 'recent' | 'images' | 'videos' | 'trash';
  setCollectionView: (view: 'all' | 'recent' | 'images' | 'videos' | 'trash') => void;
  selectedAlbum: string;
  setSelectedAlbum: (album: string) => void;
  setSelectionMode: (mode: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  basePhotoAssets: Asset[];
  docs: Asset[];
  trashedDocs: Asset[];
  docCollectionView: 'all' | 'trash';
  setDocCollectionView: (view: 'all' | 'trash') => void;
  docCategoryFilter: string;
  setDocCategoryFilter: (filter: string) => void;
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
}

const Icons = {
  Settings: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: (): React.JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

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
  t
}: SidebarProps): React.JSX.Element {
  return (
    <aside className="sidebar" onClick={() => setShowProfileMenu(false)}>
      <div className="sidebarMenu">
        <div className="logo">AetherCloud</div>

        <button className={`navItem ${tab === 'photos' && collectionView === 'all' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum('all'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">🖼</span><span>{t('sidebar.allPhotosVideos')}</span><span className="count">{basePhotoAssets.filter((x) => !x.isDeleted).length}</span>
        </button>

        <button className={`navItem ${tab === 'docs' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('all'); setDocCategoryFilter('all'); setSelectedDocProject('all'); setSelectionMode(false); setSelectedIds([]); }}>
          <span className="ico">📁</span><span>{t('sidebar.documents')}</span><span className="count">{docs.length}</span>
        </button>

        <div className="sectionWrap">
          <div className="sectionTitle">{tab === 'photos' ? t('sidebar.collectionsTitle') : t('sidebar.docsAreaTitle')}</div>

          {tab === 'photos' ? (
            <div className="sectionBody sectionIn">
              <button
                className={`navItem ${albumsExpanded ? 'active' : ''}`}
                onClick={() => setAlbumsExpanded((v) => !v)}
              >
                <span className="ico">🗂</span>
                <span>{t('sidebar.albumsTitle')}</span>
                <span className="chev">{albumsExpanded ? '▾' : '▸'}</span>
              </button>

              {albumsExpanded && (
                <div className="subList">
                  <button className={`subItem ${selectedAlbum === 'all' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum('all'); }}>
                    {t('sidebar.all')}
                  </button>
                  {availableAlbums.length === 0 && <div className="subHint">{t('sidebar.noManualAlbums')}</div>}
                  {availableAlbums.map(([name, count]) => (
                    <button key={name} className={`subItem ${selectedAlbum === name ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('all'); setSelectedAlbum(name); }}>
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}

              <button className={`navItem ${tab === 'photos' && collectionView === 'recent' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('recent'); setSelectedAlbum('all'); }}>
                <span className="ico">🕒</span><span>{t('sidebar.recentlyAdded')}</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'images' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('images'); setSelectedAlbum('all'); }}>
                <span className="ico">🖼</span><span>{t('sidebar.imagesOnly')}</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'videos' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('videos'); setSelectedAlbum('all'); }}>
                <span className="ico">🎬</span><span>{t('sidebar.videosOnly')}</span>
              </button>
              <button className={`navItem ${tab === 'photos' && collectionView === 'trash' ? 'active' : ''}`} onClick={() => { setTab('photos'); setCollectionView('trash'); setSelectedAlbum('all'); }}>
                <span className="ico">🗑</span><span>{t('sidebar.trashBin')}</span><span className="count">{basePhotoAssets.filter((x) => x.isDeleted).length}</span>
              </button>
            </div>
          ) : (
            <div className="sectionBody sectionIn">
              <button className={`navItem ${tab === 'docs' && docCollectionView === 'all' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('all'); setSelectionMode(false); setSelectedIds([]); }}>
                <span className="ico">📄</span><span>{t('sidebar.docsActive')}</span><span className="count">{docs.length}</span>
              </button>
              <button className={`navItem ${tab === 'docs' && docCollectionView === 'trash' ? 'active' : ''}`} onClick={() => { setTab('docs'); setDocCollectionView('trash'); setSelectionMode(false); setSelectedIds([]); }}>
                <span className="ico">🗑</span><span>{t('sidebar.docsTrash')}</span><span className="count">{trashedDocs.length}</span>
              </button>

              <button className={`navItem ${docProjectsExpanded ? 'active' : ''}`} onClick={() => setDocProjectsExpanded((v) => !v)}>
                <span className="ico">📚</span><span>{t('sidebar.docProjectsTitle')}</span><span className="chev">{docProjectsExpanded ? '▾' : '▸'}</span>
              </button>
              {docProjectsExpanded && (
                <div className="subList">
                  <button className={`subItem ${selectedDocProject === 'all' ? 'active' : ''}`} onClick={() => setSelectedDocProject('all')}>{t('sidebar.allProjects')}</button>
                  {docProjects.length === 0 && <div className="subHint">{t('sidebar.noDocProjects')}</div>}
                  {docProjects.map((p) => (
                    <button key={p.name} className={`subItem ${selectedDocProject === p.name ? 'active' : ''}`} onClick={() => setSelectedDocProject(p.name)}>
                      {p.name} ({p.count})
                    </button>
                  ))}
                </div>
              )}

              <button className={`navItem ${docCategoryFilter === 'all' ? 'active' : ''}`} onClick={() => setDocCategoryFilter('all')}>
                <span className="ico">🧩</span><span>{t('sidebar.allDocTypes')}</span><span className="count">{docsBase.length}</span>
              </button>

              {['pdf', 'excel', 'word', 'markdown', 'text'].map((k) => (
                <button key={k} className={`navItem ${docCategoryFilter === k ? 'active' : ''}`} onClick={() => setDocCategoryFilter(k)}>
                  <span className="ico">{k === 'pdf' ? '📕' : k === 'excel' ? '📊' : k === 'word' ? '📝' : k === 'markdown' ? '🔤' : '📄'}</span>
                  <span>{t('categories.' + k)}</span>
                  <span className="count">{docCategoryCounts.get(k) || 0}</span>
                </button>
              ))}

              <button className={`navItem ${docTypeFilter === 'all' && docKindsExpanded ? 'active' : ''}`} onClick={() => setDocKindsExpanded((v) => !v)}>
                <span className="ico">🗂</span><span>{t('sidebar.showAllDocTypes')}</span><span className="chev">{docKindsExpanded ? '▾' : '▸'}</span>
              </button>

              {docKindsExpanded && (
                <div className="subList">
                  {docTypes.map((t) => (
                    <button key={t} className={`subItem ${docTypeFilter === t ? 'active' : ''}`} onClick={() => setDocTypeFilter(t)}>
                      {t}
                    </button>
                  ))}
                  <button className={`subItem ${docTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setDocTypeFilter('all')}>
                    {t('sidebar.clearSpecificFilter')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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

      <div className="profileSection" onClick={(e) => e.stopPropagation()}>
        <div className="profileBtn" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          <div className="profileAvatar">
            {user ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profileMeta">
            <div className="profileName">{user ? (user.role === 'admin' ? user.name : t('profile.hello', { name: user.name })) : t('sidebar.loading')}</div>
            <div className="profileRole">{user ? (user.role === 'admin' ? t('profile.admin') : t('profile.member')) : ''}</div>
          </div>
          <div className="profileChevron">▾</div>
        </div>
        
        {showProfileMenu && user && (
          <div className="profilePopover" onClick={(e) => e.stopPropagation()}>
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
            <hr className="popoverDivider" />
            <button className="popoverItem" onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}>
              <span className="popoverIcon"><Icons.Settings /></span>
              <span>{t('profile.settings')}</span>
            </button>
            <button className="popoverItem" onClick={() => { handleLogout(); setShowProfileMenu(false); }}>
              <span className="popoverIcon"><Icons.LogOut /></span>
              <span>{t('profile.logout')}</span>
            </button>
          </div>
        )}
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
        .profileSection {
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          position: relative;
          padding-top: 12px;
        }
        .profileBtn {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
        }
        .profileBtn:hover {
          background: var(--bg-item-hover);
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
        .profileChevron {
          color: var(--text-muted);
          font-size: 12px;
        }
        .profilePopover {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          width: 250px;
          background: var(--bg-popover);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.4);
          z-index: 100;
          padding: 20px 16px 12px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
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
      `}</style>
    </aside>
  );
}
