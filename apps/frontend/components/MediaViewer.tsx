'use client';
// Refactored MediaViewer component

import React from 'react';
import { Asset, Album, Tag } from '../types';
import { fmtBytes, docIconOf } from '../lib/utils';
import SmartVideo from './SmartVideo';

interface MediaViewerProps {
  active: Asset | null;
  tab: 'photos' | 'docs' | 'all' | 'space' | 'spaces';
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
  activeMediaFit: 'contain-wide' | 'contain-tall';
  setActiveMediaFit: React.Dispatch<React.SetStateAction<'contain-wide' | 'contain-tall'>>;
  albumQuery: string;
  setAlbumQuery: (query: string) => void;
  tagQuery: string;
  setTagQuery: (query: string) => void;
  albums: Album[];
  tags: Tag[];
  selectedAlbumsForActive: string[];
  selectedTagsForActive: string[];
  toggleAlbumSelection: (name: string) => void;
  toggleTagSelection: (name: string) => void;
  saveActiveAlbums: () => void;
  saveActiveTags: () => void;
  createNewAlbumInSelection: (name: string) => void;
  createNewTagInSelection: (name: string) => void;
  loadAlbums: () => Promise<void>;
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
  activeMediaFit,
  setActiveMediaFit,
  albumQuery,
  setAlbumQuery,
  tagQuery,
  setTagQuery,
  albums,
  tags,
  selectedAlbumsForActive,
  selectedTagsForActive,
  toggleAlbumSelection,
  toggleTagSelection,
  saveActiveAlbums,
  saveActiveTags,
  createNewAlbumInSelection,
  createNewTagInSelection,
  loadAlbums,
  loadTags,
  setMsg,
  api,
  t
}: MediaViewerProps): React.JSX.Element | null {
  if (!active) return null;

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
  };

  const onAlbumBtnClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await loadAlbums();
      if (!showAlbumPicker) {
        const current = active.albumNames || (active.albumName ? [active.albumName] : []);
        // Set initial select state
        // (Note: selectedAlbumsForActive state management is in parent page.tsx)
      }
      setShowAlbumPicker((v) => !v);
      setShowTagPicker(false);
    } catch (er) {
      setMsg(t('viewer.errorLoadAlbum'));
    }
  };

  const onTagBtnClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await loadTags();
      setShowTagPicker((v) => !v);
      setShowAlbumPicker(false);
    } catch (er) {
      setMsg(t('viewer.errorLoadTags'));
    }
  };

  return (
    <div className="viewer" onClick={handleClose}>
      <button className="nav left" onClick={handlePrev}>‹</button>
      <div className={`stage ${activeMediaFit === 'contain-tall' ? 'stageTall' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="stageTitle">{active.originalName}</div>
        {active.type === 'image' && (
          <img key={active.id} src={`${api}/api/assets/_media/original/${active.id}`} alt={active.originalName} className={`full mediaEnter ${activeMediaFit}`} />
        )}
        {active.type === 'video' && (
          active.processingStatus === 'processing' ? (
            <div className="videoProcessingOverlay mediaEnter">
              <div className="loadingSpinner" />
              <div className="overlayTitle">{t('viewer.videoOptimizing')}</div>
              <div className="overlayDesc">{t('viewer.videoOptimizingDesc')}</div>
              <a href={`${api}/api/assets/_media/original/${active.id}`} download={active.originalName} className="downloadOriginalBtn" onClick={(e) => e.stopPropagation()}>
                <span>{t('viewer.downloadOriginal')}</span>
                <span>↓</span>
              </a>
            </div>
          ) : (
            <SmartVideo
              key={active.id}
              hlsSrc={`${api}/api/assets/_media/hls/${active.id}/master.m3u8?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
              mp4Src={`${api}/api/assets/_media/play/${active.id}?v=${encodeURIComponent(active.processingFinishedAt || active.uploadedAt || active.id)}`}
              controls
              autoPlay
              className={`full mediaEnter ${activeMediaFit}`}
              preload="auto"
              active
              onMeta={({ w, h }) => setActiveMediaFit(h > w ? 'contain-tall' : 'contain-wide')}
            />
          )
        )}
        {active.type !== 'image' && active.type !== 'video' && (
          <div className="docPreviewBlock mediaEnter">
            <div className="docIcon">{docIconOf(active)}</div>
            <div className="docName">{active.originalName}</div>
            <a href={`${api}/api/assets/_media/original/${active.id}`} target="_blank" rel="noreferrer" className="ghost" style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('viewer.openDoc')}</span>
              <span>↗</span>
            </a>
          </div>
        )}
      </div>
      <button className="nav right" onClick={handleNext}>›</button>
      <button className="topBtn infoBtn" onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}>i</button>
      {active.type !== 'file' && (
        <button className="topBtn albumBtn" onClick={onAlbumBtnClick}>＋</button>
      )}
      <button className="topBtn tagBtn" onClick={onTagBtnClick}>🏷</button>
      <button className="close" onClick={handleClose}>✕</button>

      {showInfo && (
        <div className="infoPanel" onClick={(e) => e.stopPropagation()}>
          <div><b>{active.originalName}</b></div>
          <div>{t('details.format')}: {active.mime}</div>
          <div>{t('details.size')}: {fmtBytes(active.size)}</div>
          <div>{t('details.createdAt')}: {active.takenAt || '-'}</div>
          <div>Upload: {active.uploadedAt || '-'}</div>
          {active.type !== 'file' && <div>Album: {(active.albumNames || []).join(', ') || '-'}</div>}
          <div>Tags: {(active.tags || []).map(tVal => `#${tVal}`).join(', ') || '-'}</div>
        </div>
      )}

      {showAlbumPicker && (
        <div className="albumPanel" onClick={(e) => e.stopPropagation()}>
          <input className="albumSearch" placeholder={t('viewer.searchAlbumPlaceholder')} value={albumQuery} onChange={(e) => setAlbumQuery(e.target.value)} />
          <button className="albumCreate" onClick={() => createNewAlbumInSelection(albumQuery || window.prompt(t('viewer.newAlbumPrompt')) || '')}>+ {t('viewer.createNewAlbum')}</button>
          <div className="albumList">
            {albums.filter((a) => a.name.toLowerCase().includes(albumQuery.toLowerCase())).map((a) => {
              const isSelected = selectedAlbumsForActive.includes(a.name);
              return (
                <button key={a.name} className={`albumItem ${isSelected ? 'selected' : ''}`} onClick={() => toggleAlbumSelection(a.name)}>
                  <span className="chk">{isSelected ? '✓' : ''}</span>
                  <span>{a.name}</span>
                  <span className="cnt">({a.count})</span>
                </button>
              );
            })}
          </div>
          <div className="albumActions">
            <button className="albumBtnSave" onClick={saveActiveAlbums}>{t('actions.save')}</button>
            <button className="albumBtnCancel" onClick={() => setShowAlbumPicker(false)}>{t('actions.cancel')}</button>
          </div>
        </div>
      )}

      {showTagPicker && (
        <div className="tagPanel" onClick={(e) => e.stopPropagation()}>
          <input className="tagSearch" placeholder={t('viewer.searchOrCreateTagPlaceholder')} value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
          <button className="tagCreate" onClick={() => createNewTagInSelection(tagQuery || window.prompt(t('viewer.newTagPrompt')) || '')}>+ {t('viewer.createNewTag')}</button>
          <div className="tagList">
            {tags.filter((tVal) => tVal.name.toLowerCase().includes(tagQuery.toLowerCase())).map((tVal) => {
              const isSelected = selectedTagsForActive.includes(tVal.name);
              return (
                <button key={tVal.name} className={`tagItem ${isSelected ? 'selected' : ''}`} onClick={() => toggleTagSelection(tVal.name)}>
                  <span className="chk">{isSelected ? '✓' : ''}</span>
                  <span>#{tVal.name}</span>
                  <span className="cnt">({tVal.count})</span>
                </button>
              );
            })}
          </div>
          <div className="tagActions">
            <button className="tagBtnSave" onClick={saveActiveTags}>{t('actions.save')}</button>
            <button className="tagBtnCancel" onClick={() => setShowTagPicker(false)}>{t('actions.cancel')}</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .viewer {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 12, 0.98);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: viewerFadeIn 0.2s ease-out forwards;
        }
        .stage {
          width: calc(100vw - 160px);
          height: calc(100vh - 120px);
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }
        .stageTall::before,
        .stageTall::after {
          content: '';
          position: absolute;
          top: 40px;
          bottom: 12px;
          width: clamp(40px, 10vw, 160px);
          pointer-events: none;
          z-index: 1;
          filter: blur(16px);
          opacity: 0.35;
          border-radius: 18px;
        }
        .stageTall::before {
          left: 0;
          background: linear-gradient(90deg, rgba(255,255,255,.10), rgba(255,255,255,0));
        }
        .stageTall::after {
          right: 0;
          background: linear-gradient(270deg, rgba(255,255,255,.10), rgba(255,255,255,0));
        }
        .stageTitle, .full {
          position: relative;
          z-index: 2;
        }
        .mediaEnter {
          animation: mediaFadeIn .3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stageTitle {
          margin-bottom: 6px;
          font-weight: 600;
          color: #ffffff;
          font-size: 15px;
        }
        .full {
          display: block;
          max-width: 100%;
          max-height: calc(100% - 36px);
          width: auto;
          height: auto;
          object-fit: contain;
          background: transparent;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }
        .full.contain-tall { height: calc(100% - 36px); width: auto; max-width: 100%; max-height: calc(100% - 36px); }
        .full.contain-wide { width: 100%; height: auto; max-width: 100%; max-height: calc(100% - 36px); }
        video.full,
        video.full.contain-tall,
        video.full.contain-wide {
          width: auto !important;
          height: calc(100% - 36px) !important;
          min-width: 0 !important;
          max-width: 100% !important;
          max-height: calc(100% - 36px) !important;
          object-fit: contain !important;
          aspect-ratio: auto !important;
          margin: 0 auto;
          display: block;
        }
        img.full { max-width: 100%; max-height: calc(100% - 36px); }
        .nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 24px;
          color: white;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
        }
        .nav:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%) scale(1.05);
        }
        .left { left: 24px; }
        .right { right: 24px; }
        .topBtn {
          position: absolute;
          top: 24px;
          width: 40px;
          height: 40px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
        }
        .topBtn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .infoBtn { right: 120px; }
        .albumBtn { right: 72px; }
        .tagBtn { right: 168px; }
        .close {
          position: absolute;
          right: 24px;
          top: 24px;
          width: 40px;
          height: 40px;
          border-radius: 99px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
        }
        .close:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .infoPanel {
          position: absolute;
          right: 24px;
          top: 76px;
          width: 300px;
          background: rgba(15, 15, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 8px;
          font-size: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          color: #a1a1aa;
          animation: panelEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .infoPanel b {
          color: #ffffff;
          font-size: 13px;
          word-break: break-all;
        }
        .albumPanel {
          position: absolute;
          right: 24px;
          top: 76px;
          width: min(300px, calc(100vw - 48px));
          box-sizing: border-box;
          max-height: 60vh;
          overflow-y: auto;
          background: rgba(15, 15, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          animation: panelEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .albumPanel * {
          box-sizing: border-box;
        }
        .albumSearch {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .albumSearch:focus {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .albumCreate {
          width: 100%;
          background: #ffffff;
          border: 0;
          color: #09090b;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .albumCreate:hover {
          background: #f4f4f5;
        }
        .albumList {
          display: grid;
          gap: 4px;
        }
        .albumItem {
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        .albumItem span:nth-child(2) {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .albumItem:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .albumItem.selected {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
        .albumItem .chk {
          width: 14px;
          height: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          display: grid;
          place-items: center;
          font-size: 10px;
          color: #09090b;
          background: transparent;
          transition: all 0.2s ease;
        }
        .albumItem.selected .chk {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
        }
        .albumItem .cnt {
          margin-left: auto;
          font-size: 11px;
          color: #71717a;
        }
        .albumActions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .albumBtnSave {
          flex: 1;
          background: #ffffff;
          color: #09090b;
          border: 0;
          border-radius: 8px;
          padding: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .albumBtnSave:hover {
          background: #f4f4f5;
        }
        .albumBtnCancel {
          background: rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .albumBtnCancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .tagPanel {
          position: absolute;
          right: 24px;
          top: 76px;
          width: 300px;
          max-height: 60vh;
          overflow-y: auto;
          background: rgba(15, 15, 18, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          animation: panelEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .tagSearch {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .tagSearch:focus {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .tagCreate {
          width: 100%;
          background: #ffffff;
          border: 0;
          color: #09090b;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .tagCreate:hover {
          background: #f4f4f5;
        }
        .tagList {
          display: grid;
          gap: 4px;
        }
        .tagItem {
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tagItem:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .tagItem.selected {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
        .tagItem .chk {
          width: 14px;
          height: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          display: grid;
          place-items: center;
          font-size: 10px;
          color: #09090b;
          background: transparent;
          transition: all 0.2s ease;
        }
        .tagItem.selected .chk {
          background: #ffffff;
          border-color: #ffffff;
          color: #09090b;
        }
        .tagItem .cnt {
          margin-left: auto;
          font-size: 11px;
          color: #71717a;
        }
        .tagActions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .tagBtnSave {
          flex: 1;
          background: #ffffff;
          color: #09090b;
          border: 0;
          border-radius: 8px;
          padding: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .tagBtnSave:hover {
          background: #f4f4f5;
        }
        .tagBtnCancel {
          background: rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .tagBtnCancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .docPreviewBlock {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 40px;
          width: 320px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .docPreviewBlock .docIcon {
          font-size: 64px;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
        }
        .docPreviewBlock .docName {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.4;
          word-break: break-all;
        }
        .videoProcessingOverlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: rgba(15, 15, 18, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 40px 24px;
          width: 320px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 10px 35px rgba(0,0,0,0.5);
        }
        .loadingSpinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top: 4px solid #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .overlayTitle {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 8px;
        }
        .overlayDesc {
          font-size: 12px;
          color: #71717a;
          line-height: 1.5;
        }
        .downloadOriginalBtn {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          color: #09090b;
          text-decoration: none;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          transition: background 0.15s ease;
        }
        .downloadOriginalBtn:hover {
          background: #f4f4f5;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes mediaFadeIn {
          from { opacity: 0; transform: scale(.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes viewerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes panelEnter {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
