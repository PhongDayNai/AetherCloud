'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { alignAndDiffThreeWay } from '../lib/diffUtils';
import MergePane from './merge-editor/MergePane';
import MergeGutterActions from './merge-editor/MergeGutterActions';

interface MergeEditorProps {
  serverContent: string;
  localContent: string;
  onApply: (mergedContent: string) => void;
  onCancel: () => void;
}

interface ExtendedMergeBlock {
  serverLine: string;
  localLine: string;
  mergedLine: string;
  type: 'normal' | 'modified-server' | 'modified-local' | 'conflict';
  serverStatus: 'pending' | 'accepted' | 'rejected' | 'none';
  localStatus: 'pending' | 'accepted' | 'rejected' | 'none';
}

export default function MergeEditor({
  serverContent,
  localContent,
  onApply,
  onCancel
}: MergeEditorProps) {
  const { t } = useLanguage();
  const [blocks, setBlocks] = useState<ExtendedMergeBlock[]>([]);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [history, setHistory] = useState<ExtendedMergeBlock[][]>([]);
  const [future, setFuture] = useState<ExtendedMergeBlock[][]>([]);

  const serverScrollRef = useRef<HTMLDivElement>(null);
  const mergedScrollRef = useRef<HTMLDivElement>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);
  const gutter1ScrollRef = useRef<HTMLDivElement>(null);
  const gutter2ScrollRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = useRef<'server' | 'merged' | 'local' | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const historyRef = useRef<ExtendedMergeBlock[][]>([]);
  const futureRef = useRef<ExtendedMergeBlock[][]>([]);
  const blocksRef = useRef<ExtendedMergeBlock[]>([]);

  // Synchronize refs for the global event listener
  useEffect(() => {
    historyRef.current = history;
    futureRef.current = future;
    blocksRef.current = blocks;
  }, [history, future, blocks]);

  // Helper to update blocks state and save history
  const pushStateToHistory = (newBlocks: ExtendedMergeBlock[]) => {
    setHistory(prev => [...prev, blocks]);
    setFuture([]);
    setBlocks(newBlocks);
  };

  // Keyboard shortcut listener for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            // Redo
            if (futureRef.current.length === 0) return;
            const next = futureRef.current[0];
            setFuture(prev => prev.slice(1));
            setHistory(prev => [...prev, blocksRef.current]);
            setBlocks(next);
          } else {
            // Undo
            if (historyRef.current.length === 0) return;
            const prev = historyRef.current[historyRef.current.length - 1];
            setHistory(prev => prev.slice(0, -1));
            setFuture(prev => [blocksRef.current, ...prev]);
            setBlocks(prev);
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          // Redo
          if (futureRef.current.length === 0) return;
          const next = futureRef.current[0];
          setFuture(prev => prev.slice(1));
          setHistory(prev => [...prev, blocksRef.current]);
          setBlocks(next);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize aligned three-way merge blocks
  useEffect(() => {
    const aligned = alignAndDiffThreeWay(serverContent, localContent);
    const initialized = aligned.map(block => {
      let serverStatus: 'pending' | 'accepted' | 'rejected' | 'none' = 'none';
      let localStatus: 'pending' | 'accepted' | 'rejected' | 'none' = 'none';
      let mergedLine = '';

      if (block.type === 'normal') {
        mergedLine = block.serverLine;
      } else if (block.type === 'modified-server') {
        serverStatus = 'accepted'; // Auto-merge non-conflicting server change
        mergedLine = block.serverLine;
      } else if (block.type === 'modified-local') {
        localStatus = 'accepted'; // Auto-merge non-conflicting local change
        mergedLine = block.localLine;
      } else if (block.type === 'conflict') {
        serverStatus = 'pending';
        localStatus = 'pending';
        mergedLine = '';
      }

      return {
        serverLine: block.serverLine,
        localLine: block.localLine,
        mergedLine,
        type: block.type as 'normal' | 'modified-server' | 'modified-local' | 'conflict',
        serverStatus,
        localStatus
      };
    });
    setBlocks(initialized);
    setHistory([]);
    setFuture([]);
  }, [serverContent, localContent]);

  const resetAndAutoMerge = () => {
    const initialized = blocks.map(block => {
      let serverStatus: 'pending' | 'accepted' | 'rejected' | 'none' = 'none';
      let localStatus: 'pending' | 'accepted' | 'rejected' | 'none' = 'none';
      let mergedLine = '';

      if (block.type === 'normal') {
        mergedLine = block.serverLine;
      } else if (block.type === 'modified-server') {
        serverStatus = 'accepted';
        mergedLine = block.serverLine;
      } else if (block.type === 'modified-local') {
        localStatus = 'accepted';
        mergedLine = block.localLine;
      } else if (block.type === 'conflict') {
        serverStatus = 'pending';
        localStatus = 'pending';
        mergedLine = '';
      }

      return {
        ...block,
        mergedLine,
        serverStatus,
        localStatus
      };
    });
    pushStateToHistory(initialized);
  };

  // Screen width monitoring
  useEffect(() => {
    const checkWidth = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Scroll Sync with event loop protection
  const handleScroll = (source: 'server' | 'merged' | 'local') => (e: React.UIEvent<HTMLDivElement>) => {
    if (activeScrollRef.current && activeScrollRef.current !== source) return;

    activeScrollRef.current = source;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const scrollTop = e.currentTarget.scrollTop;

    if (source !== 'server' && serverScrollRef.current) {
      serverScrollRef.current.scrollTop = scrollTop;
    }
    if (source !== 'merged' && mergedScrollRef.current) {
      mergedScrollRef.current.scrollTop = scrollTop;
    }
    if (source !== 'local' && localScrollRef.current) {
      localScrollRef.current.scrollTop = scrollTop;
    }
    if (gutter1ScrollRef.current) {
      gutter1ScrollRef.current.scrollTop = scrollTop;
    }
    if (gutter2ScrollRef.current) {
      gutter2ScrollRef.current.scrollTop = scrollTop;
    }

    scrollTimeoutRef.current = setTimeout(() => {
      activeScrollRef.current = null;
    }, 50);
  };

  const handleLineChange = (index: number, val: string) => {
    const updated = [...blocks];
    updated[index] = {
      ...updated[index],
      mergedLine: val,
      serverStatus: 'rejected',
      localStatus: 'rejected'
    };
    pushStateToHistory(updated);
  };

  const copyFromServer = (index: number) => {
    const updated = [...blocks];
    const block = updated[index];
    const newMergedLine = block.localStatus === 'accepted'
      ? (block.mergedLine ? block.mergedLine + '\n' + block.serverLine : block.serverLine)
      : block.serverLine;

    updated[index] = {
      ...block,
      mergedLine: newMergedLine,
      serverStatus: 'accepted'
    };
    pushStateToHistory(updated);
  };

  const copyFromLocal = (index: number) => {
    const updated = [...blocks];
    const block = updated[index];
    const newMergedLine = block.serverStatus === 'accepted'
      ? (block.mergedLine ? block.mergedLine + '\n' + block.localLine : block.localLine)
      : block.localLine;

    updated[index] = {
      ...block,
      mergedLine: newMergedLine,
      localStatus: 'accepted'
    };
    pushStateToHistory(updated);
  };

  const discardServerLine = (index: number) => {
    const updated = [...blocks];
    const block = updated[index];
    const newMergedLine = block.localStatus === 'accepted'
      ? block.localLine
      : '';

    updated[index] = {
      ...block,
      mergedLine: newMergedLine,
      serverStatus: 'rejected'
    };
    pushStateToHistory(updated);
  };

  const discardLocalLine = (index: number) => {
    const updated = [...blocks];
    const block = updated[index];
    const newMergedLine = block.serverStatus === 'accepted'
      ? block.serverLine
      : '';

    updated[index] = {
      ...block,
      mergedLine: newMergedLine,
      localStatus: 'rejected'
    };
    pushStateToHistory(updated);
  };

  const getLineCountOfRow = (block: ExtendedMergeBlock) => {
    const serverCount = block.serverLine ? block.serverLine.split('\n').length : 1;
    const localCount = block.localLine ? block.localLine.split('\n').length : 1;
    const mergedCount = block.mergedLine ? block.mergedLine.split('\n').length : 1;
    return Math.max(1, serverCount, localCount, mergedCount);
  };

  const resetServerLine = (index: number) => {
    const updated = [...blocks];
    const block = updated[index];
    const newMergedLine = block.localStatus === 'accepted' ? block.localLine : '';

    updated[index] = {
      ...block,
      mergedLine: newMergedLine,
      serverStatus: 'pending'
    };
    pushStateToHistory(updated);
  };

  const resetLocalLine = (index: number) => {
    const updated = [...blocks];
    const block = updated[index];
    const newMergedLine = block.serverStatus === 'accepted' ? block.serverLine : '';

    updated[index] = {
      ...block,
      mergedLine: newMergedLine,
      localStatus: 'pending'
    };
    pushStateToHistory(updated);
  };

  const handleSave = () => {
    const hasUnresolved = blocks.some(
      b => b.type === 'conflict' && (b.serverStatus === 'pending' || b.localStatus === 'pending')
    );
    if (hasUnresolved) {
      alert(t('merge.unresolved') || 'Vui lòng giải quyết toàn bộ các dòng xung đột trước khi lưu.');
      return;
    }
    const finalContent = blocks.map(b => b.mergedLine).join('\n');
    onApply(finalContent);
  };

  // Calculate unresolved counts
  const unresolvedConflicts = blocks.filter(
    b => b.type === 'conflict' && (b.serverStatus === 'pending' || b.localStatus === 'pending')
  ).length;

  const unresolvedChanges = blocks.filter(
    b => (b.type === 'modified-server' || b.type === 'modified-local') &&
         (b.serverStatus === 'pending' || b.localStatus === 'pending')
  ).length;

  if (!isLargeScreen) {
    return (
      <div className="mergeScreenWarningOverlay">
        <div className="warningCard">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            className="mb-4"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3>{t('dialogs.warning')}</h3>
          <p>{t('merge.screenTooSmall')}</p>
          <button type="button" className="btnCancel" onClick={onCancel}>
            {t('actions.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mergeEditorOverlay">
      <div className="mergeHeader">
        <div className="mergeHeaderInfo">
          <h2 className="mergeTitle">{t('merge.title')}</h2>
          <div className="mergeStatusRow">
            {unresolvedChanges > 0 && (
              <span className="mergeStatusBadge changes">
                {t('merge.changesPending', { count: unresolvedChanges, plural: unresolvedChanges === 1 ? '' : 's' })}
              </span>
            )}
            {unresolvedConflicts > 0 && (
              <span className="mergeStatusBadge conflicts active">
                {t('merge.conflictsRemaining', { count: unresolvedConflicts, plural: unresolvedConflicts === 1 ? '' : 's' })}
              </span>
            )}
          </div>
        </div>
        <div className="mergeHeaderActions">
          <button type="button" className="btnCancel" onClick={onCancel}>
            {t('merge.cancel')}
          </button>
          <button type="button" className="btnApply" onClick={handleSave}>
            {t('merge.apply')}
          </button>
        </div>
      </div>

      <div className="mergePanelsContainer">
        {/* Panel 1: Server */}
        <MergePane
          title={t('merge.server')}
          type="server"
          blocks={blocks}
          scrollRef={serverScrollRef}
          onScroll={handleScroll('server')}
          getLineCountOfRow={getLineCountOfRow}
          t={t}
        />

        {/* Gutter 1: Server Actions */}
        <MergeGutterActions
          side="server"
          blocks={blocks}
          getLineCountOfRow={getLineCountOfRow}
          onAccept={copyFromServer}
          onDiscard={discardServerLine}
          onReset={resetServerLine}
          scrollRef={gutter1ScrollRef}
        />

        {/* Panel 2: Merged */}
        <MergePane
          title={t('merge.result')}
          type="merged"
          blocks={blocks}
          scrollRef={mergedScrollRef}
          onScroll={handleScroll('merged')}
          getLineCountOfRow={getLineCountOfRow}
          handleLineChange={handleLineChange}
          resetAndAutoMerge={resetAndAutoMerge}
          t={t}
        />

        {/* Gutter 2: Local Actions */}
        <MergeGutterActions
          side="local"
          blocks={blocks}
          getLineCountOfRow={getLineCountOfRow}
          onAccept={copyFromLocal}
          onDiscard={discardLocalLine}
          onReset={resetLocalLine}
          scrollRef={gutter2ScrollRef}
        />

        {/* Panel 3: Local */}
        <MergePane
          title={t('merge.local')}
          type="local"
          blocks={blocks}
          scrollRef={localScrollRef}
          onScroll={handleScroll('local')}
          getLineCountOfRow={getLineCountOfRow}
          t={t}
        />
      </div>
    </div>
  );
}
