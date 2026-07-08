'use client';
// Refactored MediaViewer component

import { Asset, Album, Tag, DocProject } from '../types';
import { fmtBytes, docCategoryOf, formatDateTime } from '../lib/utils';
import SmartVideo from './SmartVideo';
import * as Icons from './Icons';
import { useCloud } from '../context/CloudContext';
import QuantumLoader from './QuantumLoader';
import styles from './MediaViewer.module.css';

interface MediaViewerProps {
  active: Asset | null;
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  albumFilteredPhotos: Asset[];
  docsFiltered: Asset[];
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  showInfo: boolean;
  setShowInfo: React.Dispatch<React.SetStateAction<boolean>>;
  showAlbumPicker: boolean;
  setShowAlbumPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showTagPicker: boolean;
  setShowTagPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showDocProjectPicker: boolean;
  setShowDocProjectPicker: React.Dispatch<React.SetStateAction<boolean>>;
  activeMediaFit: 'contain-wide' | 'contain-tall';
  setActiveMediaFit: React.Dispatch<React.SetStateAction<'contain-wide' | 'contain-tall'>>;
  albumQuery: string;
  setAlbumQuery: (query: string) => void;
  docProjectQuery: string;
  setDocProjectQuery: (query: string) => void;
  tagQuery: string;
  setTagQuery: (query: string) => void;
  albums: Album[];
  docProjects: DocProject[];
  tags: Tag[];
  selectedAlbumsForActive: string[];
  selectedDocProjectsForActive: string[];
  selectedTagsForActive: string[];
  toggleAlbumSelection: (name: string) => void;
  toggleDocProjectSelection: (name: string) => void;
  toggleTagSelection: (name: string) => void;
  saveActiveAlbums: () => void;
  saveActiveDocProjects: () => void;
  saveActiveTags: () => void;
  createNewAlbumInSelection: (name: string) => void;
  createNewDocProjectInSelection: (name: string) => void;
  createNewTagInSelection: (name: string) => void;
  loadAlbums: () => Promise<void>;
  loadDocProjects: () => Promise<void>;
  loadTags: () => Promise<void>;
  setMsg: (msg: string) => void;
  api: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function MediaViewer({
  active,
  tab,
  albumFilteredPhotos,
  docsFiltered,
  activeIndex,
  setActiveIndex,
  showInfo,
  setShowInfo,
  showAlbumPicker,
  setShowAlbumPicker,
  showTagPicker,
  setShowTagPicker,
  showDocProjectPicker,
  setShowDocProjectPicker,
  activeMediaFit,
  setActiveMediaFit,
  albumQuery,
  setAlbumQuery,
  docProjectQuery,
  setDocProjectQuery,
  tagQuery,
  setTagQuery,
  albums,
  docProjects,
  tags,
  selectedAlbumsForActive,
  selectedDocProjectsForActive,
  selectedTagsForActive,
  toggleAlbumSelection,
  toggleDocProjectSelection,
  toggleTagSelection,
  saveActiveAlbums,
  saveActiveDocProjects,
  saveActiveTags,
  createNewAlbumInSelection,
  createNewDocProjectInSelection,
  createNewTagInSelection,
  loadAlbums,
  loadDocProjects,
  loadTags,
  setMsg,
  api,
  t
}: MediaViewerProps): React.JSX.Element | null {
  if (!active) return null;

  const { activeWorkspace, groups, language, selectedDocProject, posts } = useCloud();
  
  let userRole: string | null = null;
  if (activeWorkspace?.type === 'group') {
    userRole = activeWorkspace.role;
  } else if (activeWorkspace?.type === 'space' && activeWorkspace.groupId) {
    userRole = groups.find(g => g.id === activeWorkspace.groupId)?.role || 'member';
  }

  const getDocViewerUrl = () => {
    if (!active) return '';
    let url = `/doc-viewer?id=${active.id}`;
    if (tab) {
      url += `&tab=${tab}`;
    }
    
    // Find if the asset belongs to a specific post in the current active space
    // Only apply post context when viewing the space timeline tab ('space')
    if (tab === 'space' && posts && posts.length > 0) {
      const activePost = posts.find((p: any) => 
        p.assets && p.assets.some((a: any) => a.id === active.id)
      );
      if (activePost) {
        url += `&postId=${activePost.id}`;
        if (activePost.spaceId) {
          url += `&spaceId=${activePost.spaceId}`;
        }
      }
    }
    
    // If not set by post, but we are inside a space
    if (!url.includes('&spaceId=') && activeWorkspace?.type === 'space') {
      url += `&spaceId=${activeWorkspace.id}`;
    }
    
    if (selectedDocProject && selectedDocProject !== 'all') {
      url += `&docProject=${encodeURIComponent(selectedDocProject)}`;
    }
    
    return url;
  };
  
  const isReadOnly = (activeWorkspace?.type === 'group' || (activeWorkspace?.type === 'space' && activeWorkspace?.groupId)) && userRole === 'member';

  const currentList = tab === 'photos' ? albumFilteredPhotos : docsFiltered;



  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentList.length > 0) {
      setActiveIndex((i) => (i <= 0 ? currentList.length - 1 : i - 1));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentList.length > 0) {
      setActiveIndex((i) => (i >= currentList.length - 1 ? 0 : i + 1));
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex(-1);
    setShowInfo(false);
    setShowAlbumPicker(false);
    setShowTagPicker(false);
    setShowDocProjectPicker(false);
  };

  const onAlbumBtnClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await loadAlbums();
      setShowAlbumPicker((v) => !v);
      setShowTagPicker(false);
      setShowDocProjectPicker(false);
    } catch (er) {
      setMsg(t('viewer.errorLoadAlbum'));
    }
  };

  const onDocProjectBtnClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await loadDocProjects();
      setShowDocProjectPicker((v) => !v);
      setShowAlbumPicker(false);
      setShowTagPicker(false);
    } catch (er) {
      setMsg(t('viewer.errorLoadDocProjects') || 'Không tải được nhóm dự án tài liệu');
    }
  };

  const onTagBtnClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await loadTags();
      setShowTagPicker((v) => !v);
      setShowAlbumPicker(false);
      setShowDocProjectPicker(false);
    } catch (er) {
      setMsg(t('viewer.errorLoadTags'));
    }
  };

  return (
    <div className={styles.viewer} onClick={handleClose}>
      <button className={`${styles.nav} ${styles.left}`} onClick={handlePrev}><Icons.ChevronLeft size={24} /></button>
      <div className={`${styles.stage} ${activeMediaFit === 'contain-tall' ? styles.stageTall : ''}`}>
        <div className={styles.stageTitle}>{active.originalName}</div>
        {active.type === 'image' && (
          <img key={active.id} src={`${api}/api/assets/_media/original/${active.id}`} alt={active.originalName} className={`${styles.full} ${styles.mediaEnter} ${activeMediaFit === 'contain-tall' ? styles.containTall : styles.containWide}`} onClick={(e) => e.stopPropagation()} />
        )}
        {active.type === 'video' && (
          active.processingStatus === 'processing' ? (
            <div className={`${styles.videoProcessingOverlay} ${styles.mediaEnter}`} onClick={(e) => e.stopPropagation()}>
              <QuantumLoader size="medium" />
              <div className={styles.overlayTitle}>{t('viewer.videoOptimizing')}</div>
              <div className={styles.overlayDesc}>{t('viewer.videoOptimizingDesc')}</div>
              <a href={`${api}/api/assets/_media/original/${active.id}`} download={active.originalName} className={styles.downloadOriginalBtn} onClick={(e) => e.stopPropagation()}>
                <span>{t('viewer.downloadOriginal')}</span>
                <span>↓</span>
              </a>
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'contents' }}>
              <SmartVideo
                key={active.id}
                hlsSrc={`${api}/api/assets/_media/hls/${active.id}/master.m3u8?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
                mp4Src={`${api}/api/assets/_media/play/${active.id}?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
                controls
                autoPlay
                className={`${styles.full} ${styles.mediaEnter} ${activeMediaFit === 'contain-tall' ? styles.containTall : styles.containWide}`}
                preload="auto"
                active
                onMeta={({ w, h }) => setActiveMediaFit(h > w ? 'contain-tall' : 'contain-wide')}
              />
            </div>
          )
        )}
        {active.type !== 'image' && active.type !== 'video' && (
          <div className={`${styles.docPreviewBlock} ${styles.mediaEnter}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.docIcon}><Icons.DocIcon item={active} size={64} /></div>
            <div className={styles.docTypeMeta} style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '10px', fontWeight: 500 }}>
              {t('categories.' + docCategoryOf(active)) || docCategoryOf(active).toUpperCase()} · {fmtBytes(active.size)}
            </div>
            <a href={getDocViewerUrl()} target="_blank" rel="noreferrer" className={styles.openDocBtn}>
              <span>{t('viewer.openDoc')}</span>
              <span>↗</span>
            </a>
            <a href={`${api}/api/assets/_media/original/${active.id}`} download={active.originalName} className={styles.downloadDocBtn}>
              <span>{t('details.download') || 'Tải xuống'}</span>
              <span>↓</span>
            </a>
          </div>
        )}
      </div>
      <button className={`${styles.nav} ${styles.right}`} onClick={handleNext}><Icons.ChevronRight size={24} /></button>
      <button className={`${styles.topBtn} ${styles.infoBtn}`} onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }} title={t('details.title')}><Icons.Info size={18} /></button>
      {!isReadOnly && (
        active.type !== 'file' ? (
          <button className={`${styles.topBtn} ${styles.albumBtn}`} onClick={onAlbumBtnClick} title={t('viewer.createNewAlbum')}><Icons.Plus size={18} /></button>
        ) : (
          <button className={`${styles.topBtn} ${styles.albumBtn}`} onClick={onDocProjectBtnClick} title={t('viewer.createNewProject') || 'Tạo tập tài liệu mới'}><Icons.Plus size={18} /></button>
        )
      )}
      {!isReadOnly && (
        <button className={`${styles.topBtn} ${styles.tagBtn}`} onClick={onTagBtnClick} title={t('sidebar.tagsTitle')}><Icons.Tag size={18} /></button>
      )}
      <button className={styles.close} onClick={handleClose} title={t('actions.cancel')}><Icons.Close size={18} /></button>

      {showInfo && (
        <div className={styles.infoPanel} onClick={(e) => e.stopPropagation()}>
          <div><b>{active.originalName}</b></div>
          <div>{t('details.format')}: {active.mime ? (active.originalName.includes('.') ? active.originalName.split('.').pop()?.toUpperCase() : active.mime.split('/').pop()?.toUpperCase()) : '-'}</div>
          <div>{t('details.size')}: {fmtBytes(active.size)}</div>
          <div>{t('details.createdAt')}: {formatDateTime(active.takenAt, language)}</div>
          <div>Upload: {formatDateTime(active.uploadedAt, language)}</div>
          {active.type !== 'file' ? (
            <div>Album: {(active.albumNames || []).join(', ') || '-'}</div>
          ) : (
            <div>{t('sidebar.docProjectsTitle') || 'Tập tài liệu'}: {(active.docProjectNames || []).join(', ') || '-'}</div>
          )}
          <div>Tags: {(active.tags || []).map(tVal => `#${tVal}`).join(', ') || '-'}</div>
        </div>
      )}

      {showAlbumPicker && (
        <div className={styles.albumPanel} onClick={(e) => e.stopPropagation()}>
          <input className={styles.albumSearch} placeholder={t('viewer.searchAlbumPlaceholder')} value={albumQuery} onChange={(e) => setAlbumQuery(e.target.value)} />
          <button className={styles.albumCreate} onClick={() => createNewAlbumInSelection(albumQuery || window.prompt(t('viewer.newAlbumPrompt')) || '')}>+ {t('viewer.createNewAlbum')}</button>
          <div className={styles.albumList}>
            {albums.filter((a) => a.name.toLowerCase().includes(albumQuery.toLowerCase())).map((a) => {
              const isSelected = selectedAlbumsForActive.includes(a.name);
              return (
                <button key={a.name} className={`${styles.albumItem} ${isSelected ? styles.selected : ''}`} onClick={() => toggleAlbumSelection(a.name)}>
                  <span className={styles.chk}>{isSelected ? '✓' : ''}</span>
                  <span>{a.name}</span>
                  <span className={styles.cnt}>({a.count})</span>
                </button>
              );
            })}
          </div>
          <div className={styles.albumActions}>
            <button className={styles.albumBtnSave} onClick={saveActiveAlbums}>{t('actions.save')}</button>
            <button className={styles.albumBtnCancel} onClick={() => setShowAlbumPicker(false)}>{t('actions.cancel')}</button>
          </div>
        </div>
      )}

      {showTagPicker && (
        <div className={styles.tagPanel} onClick={(e) => e.stopPropagation()}>
          <input className={styles.tagSearch} placeholder={t('viewer.searchOrCreateTagPlaceholder')} value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
          <button className={styles.tagCreate} onClick={() => createNewTagInSelection(tagQuery || window.prompt(t('viewer.newTagPrompt')) || '')}>+ {t('viewer.createNewTag')}</button>
          <div className={styles.tagList}>
            {tags.filter((tVal) => tVal.name.toLowerCase().includes(tagQuery.toLowerCase())).map((tVal) => {
              const isSelected = selectedTagsForActive.includes(tVal.name);
              return (
                <button key={tVal.name} className={`${styles.tagItem} ${isSelected ? styles.selected : ''}`} onClick={() => toggleTagSelection(tVal.name)}>
                  <span className={styles.chk}>{isSelected ? '✓' : ''}</span>
                  <span>#{tVal.name}</span>
                  <span className={styles.cnt}>({tVal.count})</span>
                </button>
              );
            })}
          </div>
          <div className={styles.tagActions}>
            <button className={styles.tagBtnSave} onClick={saveActiveTags}>{t('actions.save')}</button>
            <button className={styles.tagBtnCancel} onClick={() => setShowTagPicker(false)}>{t('actions.cancel')}</button>
          </div>
        </div>
      )}

      {showDocProjectPicker && (
        <div className={styles.albumPanel} onClick={(e) => e.stopPropagation()}>
          <input className={styles.albumSearch} placeholder={t('viewer.searchProjectPlaceholder') || 'Tìm tập tài liệu...'} value={docProjectQuery} onChange={(e) => setDocProjectQuery(e.target.value)} />
          <button className={styles.albumCreate} onClick={() => createNewDocProjectInSelection(docProjectQuery || window.prompt(t('messages.projectPrompt')) || '')}>+ {t('viewer.createNewProject') || 'Tạo tập tài liệu mới'}</button>
          <div className={styles.albumList}>
            {docProjects.filter((p) => p.name.toLowerCase().includes(docProjectQuery.toLowerCase())).map((p) => {
              const isSelected = selectedDocProjectsForActive.includes(p.name);
              return (
                <button key={p.name} className={`${styles.albumItem} ${isSelected ? styles.selected : ''}`} onClick={() => toggleDocProjectSelection(p.name)}>
                  <span className={styles.chk}>{isSelected ? '✓' : ''}</span>
                  <span>{p.name}</span>
                  <span className={styles.cnt}>({p.count})</span>
                </button>
              );
            })}
          </div>
          <div className={styles.albumActions}>
            <button className={styles.albumBtnSave} onClick={saveActiveDocProjects}>{t('actions.save')}</button>
            <button className={styles.albumBtnCancel} onClick={() => setShowDocProjectPicker(false)}>{t('actions.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
