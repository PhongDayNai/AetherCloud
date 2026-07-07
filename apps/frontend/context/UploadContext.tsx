'use client';

import React, { createContext, useContext } from 'react';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { useWorkspace } from './WorkspaceContext';
import { useAssets } from './AssetContext';
import { inferUploadKind, readErrorMessage } from '../lib/utils';

interface UploadContextType {
  uploadFiles: (files: File[]) => Promise<void>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { t } = useLanguage();
  const { addToast, setMsg, setErr } = useToast();
  const { api, activeWorkspace, saveToPersonalGroupUpload } = useWorkspace();
  const { invalidateCacheAndReload } = useAssets();

  async function uploadLargeFileByChunks(file: File, translateFn: (key: string, replacements?: Record<string, string | number>) => string) {
    const isGroup = activeWorkspace.type === 'group';
    const initBody: any = {
      fileName: file.name,
      mime: file.type || 'application/octet-stream',
      totalSize: file.size,
      lastModified: file.lastModified
    };
    if (isGroup) {
      initBody.groupId = activeWorkspace.id;
      initBody.saveToPersonal = saveToPersonalGroupUpload;
    }
    const init = await fetch(`${api}/api/assets/upload-chunk/init`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initBody),
    });
    if (!init.ok) {
      const detail = await readErrorMessage(init, translateFn);
      throw new Error(translateFn('messages.chunkUploadInitFailed', { status: init.status, detail }));
    }
    const initData = await init.json();
    const uploadId = initData.uploadId;

    const CHUNK = 8 * 1024 * 1024; // 8MB/chunk
    const totalChunks = Math.ceil(file.size / CHUNK);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK;
      const end = Math.min(file.size, start + CHUNK);
      const blob = file.slice(start, end);
      const fd = new FormData();
      fd.append('chunk', blob, `${file.name}.part`);
      fd.append('index', String(i));

      const r = await fetch(`${api}/api/assets/upload-chunk/${uploadId}`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!r.ok) {
        const detail = await readErrorMessage(r, translateFn);
        throw new Error(translateFn('messages.chunkUploadPartFailed', { index: i + 1, total: totalChunks, status: r.status, detail }));
      }
    }

    const done = await fetch(`${api}/api/assets/upload-chunk/${uploadId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!done.ok) {
      const detail = await readErrorMessage(done, translateFn);
      throw new Error(translateFn('messages.chunkUploadCompleteFailed', { status: done.status, detail }));
    }
    return done.json();
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;

    const failed = [];
    let done = 0;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const kindCode = inferUploadKind(file);
      const kind = kindCode === 'image' ? t('messages.kindImage') : kindCode === 'video' ? t('messages.kindVideo') : t('messages.kindDoc');
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const big = file.size > 90 * 1024 * 1024; // >90MB dùng chunk tránh Cloudflare limit

      try {
        setMsg(t('messages.uploadingDetail', {
          done,
          total: files.length,
          index: idx + 1,
          name: file.name,
          kind,
          size: sizeMb,
          mode: big ? t('messages.uploadModeChunk') : t('messages.uploadModeNormal')
        }));

        if (big) {
          await uploadLargeFileByChunks(file, t);
        } else {
          const form = new FormData();
          form.append('files', file);
          form.append('lastModified', String(file.lastModified));
          if (activeWorkspace.type === 'group') {
            form.append('groupId', activeWorkspace.id);
            form.append('saveToPersonal', String(saveToPersonalGroupUpload));
          }
          const r = await fetch(`${api}/api/assets/upload`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          });
          if (!r.ok) {
            const detail = await readErrorMessage(r, t);
            throw new Error(`Upload failed (HTTP ${r.status}): ${detail}`);
          }
          await r.json();
        }

        done += 1;
        setMsg(t('messages.uploadSuccessDetail', { name: file.name, kind, done, total: files.length }));
      } catch (ex: any) {
        const reason = ex?.message || 'unknown';
        failed.push({ index: idx + 1, name: file.name, kind, sizeMb, mode: big ? t('messages.uploadModeChunk') : t('messages.uploadModeNormal'), reason });
        setMsg(t('messages.uploadErrorDetail', { index: idx + 1, total: files.length, name: file.name, kind, reason }));
      }
    }

    await invalidateCacheAndReload();

    if (failed.length === 0) {
      setMsg(t('messages.uploadDone', { done, total: files.length }));
      return;
    }

    const lines = failed.map((f) => `- #${f.index} ${f.name} | ${f.kind} | ${f.sizeMb}MB | ${f.mode} | ${f.reason}`);
    setErr(`${t('messages.uploadHasErrors', { failed: failed.length, total: files.length })}:\n${lines.join('\n')}`);
    setMsg(t('messages.uploadDoneWithErrors', { done, total: files.length, failed: failed.length }));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
    e.target.value = '';
  }

  return (
    <UploadContext.Provider value={{ uploadFiles, onUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload(): UploadContextType {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
