'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './LanguageContext';
import { Asset, User, Album, Tag, DocProject } from '../types';
import {
  getApiOrigin,
  fmtBytes,
  docTypeOf,
  docCategoryOf,
  DOC_CATEGORY_LABELS,
  monthLabel,
  yearLabel,
  inferUploadKind,
  readErrorMessage,
  docIconOf
} from '../lib/utils';

interface CloudContextType {
  // Config & API
  api: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: string;
  
  // State variables
  usage: any;
  setUsage: React.Dispatch<React.SetStateAction<any>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  msg: string;
  setMsg: React.Dispatch<React.SetStateAction<string>>;
  err: string;
  setErr: React.Dispatch<React.SetStateAction<string>>;
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'spaces';
  setTab: React.Dispatch<React.SetStateAction<'photos' | 'docs' | 'dashboard' | 'space' | 'spaces'>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  activeWorkspace: { type: 'personal' } | { type: 'space'; id: string; name: string; spaceType: string };
  setActiveWorkspace: React.Dispatch<React.SetStateAction<{ type: 'personal' } | { type: 'space'; id: string; name: string; spaceType: string }>>;
  spaces: any[];
  setSpaces: React.Dispatch<React.SetStateAction<any[]>>;
  posts: any[];
  setPosts: React.Dispatch<React.SetStateAction<any[]>>;
  postCaption: string;
  setPostCaption: React.Dispatch<React.SetStateAction<string>>;
  postFiles: File[];
  setPostFiles: React.Dispatch<React.SetStateAction<File[]>>;

  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;

  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  showInfo: boolean;
  setShowInfo: React.Dispatch<React.SetStateAction<boolean>>;
  showAlbumPicker: boolean;
  setShowAlbumPicker: React.Dispatch<React.SetStateAction<boolean>>;
  albums: Album[];
  setAlbums: React.Dispatch<React.SetStateAction<Album[]>>;
  albumQuery: string;
  setAlbumQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedAlbumsForActive: string[];
  setSelectedAlbumsForActive: React.Dispatch<React.SetStateAction<string[]>>;
  showDocProjectPicker: boolean;
  setShowDocProjectPicker: React.Dispatch<React.SetStateAction<boolean>>;
  docProjectQuery: string;
  setDocProjectQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedDocProjectsForActive: string[];
  setSelectedDocProjectsForActive: React.Dispatch<React.SetStateAction<string[]>>;
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  selectedFilterTags: string[];
  setSelectedFilterTags: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTagsForActive: string[];
  setSelectedTagsForActive: React.Dispatch<React.SetStateAction<string[]>>;
  showTagPicker: boolean;
  setShowTagPicker: React.Dispatch<React.SetStateAction<boolean>>;
  tagQuery: string;
  setTagQuery: React.Dispatch<React.SetStateAction<string>>;
  docTypeFilter: string;
  setDocTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  docCategoryFilter: string;
  setDocCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  docCollectionView: 'all' | 'recent' | 'trash';
  setDocCollectionView: React.Dispatch<React.SetStateAction<'all' | 'recent' | 'trash'>>;
  allFilesCollectionView: 'all' | 'recent' | 'trash';
  setAllFilesCollectionView: React.Dispatch<React.SetStateAction<'all' | 'recent' | 'trash'>>;
  docKindsExpanded: boolean;
  setDocKindsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  collectionView: 'all' | 'recent' | 'images' | 'videos' | 'trash';
  setCollectionView: React.Dispatch<React.SetStateAction<'all' | 'recent' | 'images' | 'videos' | 'trash'>>;
  albumsExpanded: boolean;
  setAlbumsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  docProjects: DocProject[];
  setDocProjects: React.Dispatch<React.SetStateAction<DocProject[]>>;
  docProjectsExpanded: boolean;
  setDocProjectsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDocProject: string;
  setSelectedDocProject: React.Dispatch<React.SetStateAction<string>>;
  groupByTimeEnabled: boolean;
  setGroupByTimeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  groupMode: 'month' | 'year';
  setGroupMode: React.Dispatch<React.SetStateAction<'month' | 'year'>>;
  expandedGroups: Record<string, boolean>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  activeMediaFit: 'contain-wide' | 'contain-tall';
  setActiveMediaFit: React.Dispatch<React.SetStateAction<'contain-wide' | 'contain-tall'>>;

  showProfileMenu: boolean;
  setShowProfileMenu: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  showSettingsModal: boolean;
  setShowSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  mustChangePassword: boolean;
  setMustChangePassword: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateSpaceModal: boolean;
  setShowCreateSpaceModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Operations
  handleLogout: () => Promise<void>;
  handleCreateSpace: (name: string, type: 'journal' | 'collection' | 'project', description: string) => Promise<boolean>;
  handleCreatePost: () => Promise<void>;
  loadData: (isBackground?: boolean) => Promise<void>;
  loadAlbums: () => Promise<void>;
  loadDocProjects: () => Promise<void>;
  loadTags: () => Promise<void>;
  
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  moveSelectedToTrash: () => Promise<void>;
  restoreSelectedFromTrash: () => Promise<void>;
  purgeSelectedForever: () => Promise<void>;
  addSelectedToAlbum: () => Promise<void>;
  addSelectedToDocProject: () => Promise<void>;
  toggleAlbumSelection: (name: string) => void;
  createNewAlbumInSelection: (name: string) => void;
  saveActiveAlbums: () => Promise<void>;
  toggleDocProjectSelection: (name: string) => void;
  createNewDocProjectInSelection: (name: string) => void;
  saveActiveDocProjects: () => Promise<void>;
  toggleTagSelection: (name: string) => void;
  createNewTagInSelection: (name: string) => void;
  saveActiveTags: () => Promise<void>;
  toggleFilterTag: (name: string) => void;

  // Derived memos
  filteredAssets: Asset[];
  basePhotoAssets: Asset[];
  recentCutoff: number;
  photoAssets: Asset[];
  docs: Asset[];
  trashedDocs: Asset[];
  docsBase: Asset[];
  docTypes: string[];
  docsFiltered: Asset[];
  allActiveAssets: Asset[];
  allActiveAssetsGrouped: [string, Asset[]][];
  spaceAssets: Asset[];
  spaceAssetsGrouped: [string, Asset[]][];
  docCategoryCounts: Map<string, number>;
  docsGrouped: [string, Asset[]][];
  selectedAlbum: string;
  setSelectedAlbum: React.Dispatch<React.SetStateAction<string>>;
  availableAlbums: [string, number][];
  albumFilteredPhotos: Asset[];
  photoGroups: [string, Asset[]][];
  active: Asset | null;
}

const CloudContext = createContext<CloudContextType | undefined>(undefined);

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { language, t } = useLanguage();
  const api = useMemo(() => getApiOrigin(), []);

  const [usage, setUsage] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const [tab, setTab] = useState<'photos' | 'docs' | 'dashboard' | 'space' | 'spaces'>('dashboard');
  const [search, setSearch] = useState<string>('');

  const [activeWorkspace, setActiveWorkspace] = useState<{ type: 'personal' } | { type: 'space'; id: string; name: string; spaceType: string }>({ type: 'personal' });
  const [spaces, setSpaces] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [postCaption, setPostCaption] = useState<string>('');
  const [postFiles, setPostFiles] = useState<File[]>([]);

  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState<boolean>(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumQuery, setAlbumQuery] = useState<string>('');
  const [selectedAlbumsForActive, setSelectedAlbumsForActive] = useState<string[]>([]);
  const [showDocProjectPicker, setShowDocProjectPicker] = useState<boolean>(false);
  const [docProjectQuery, setDocProjectQuery] = useState<string>('');
  const [selectedDocProjectsForActive, setSelectedDocProjectsForActive] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [selectedTagsForActive, setSelectedTagsForActive] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState<boolean>(false);
  const [tagQuery, setTagQuery] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');
  const [docCollectionView, setDocCollectionView] = useState<'all' | 'recent' | 'trash'>('all');
  const [allFilesCollectionView, setAllFilesCollectionView] = useState<'all' | 'recent' | 'trash'>('all');
  const [docKindsExpanded, setDocKindsExpanded] = useState<boolean>(false);
  const [collectionView, setCollectionView] = useState<'all' | 'recent' | 'images' | 'videos' | 'trash'>('all');
  const [albumsExpanded, setAlbumsExpanded] = useState<boolean>(false);
  const [docProjects, setDocProjects] = useState<DocProject[]>([]);
  const [docProjectsExpanded, setDocProjectsExpanded] = useState<boolean>(false);
  const [selectedDocProject, setSelectedDocProject] = useState<string>('all');
  const [groupByTimeEnabled, setGroupByTimeEnabled] = useState<boolean>(true);
  const [groupMode, setGroupMode] = useState<'month' | 'year'>('month');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeMediaFit, setActiveMediaFit] = useState<'contain-wide' | 'contain-tall'>('contain-wide');

  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState<boolean>(false);

  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const suppressClickRef = useRef<string | null>(null);

  // Derived memos
  const filteredAssets = useMemo(() => {
    let list = assets;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => (a.originalName || '').toLowerCase().includes(q) || (a.tags || []).some(tVal => tVal.toLowerCase().includes(q)));
    }
    if (selectedFilterTags.length > 0) {
      list = list.filter((a) => selectedFilterTags.every((tVal) => (a.tags || []).includes(tVal)));
    }
    return list;
  }, [assets, search, selectedFilterTags]);

  const basePhotoAssets = useMemo(
    () => filteredAssets.filter((a) => a.type === 'image' || a.type === 'video'),
    [filteredAssets]
  );

  const recentCutoff = useMemo(() => Date.now() - 14 * 24 * 60 * 60 * 1000, []);

  const photoAssets = useMemo(() => {
    const activePhotos = basePhotoAssets.filter((a) => !a.isDeleted);
    const trashedPhotos = basePhotoAssets.filter((a) => a.isDeleted);

    if (collectionView === 'recent') {
      return activePhotos.filter((a) => new Date(a.uploadedAt || 0).getTime() >= recentCutoff);
    }
    if (collectionView === 'images') return activePhotos.filter((a) => a.type === 'image');
    if (collectionView === 'videos') return activePhotos.filter((a) => a.type === 'video');
    if (collectionView === 'trash') return trashedPhotos;
    return activePhotos;
  }, [basePhotoAssets, collectionView, recentCutoff]);

  const docs = useMemo(
    () => filteredAssets.filter((a) => a.type !== 'image' && a.type !== 'video' && !a.isDeleted),
    [filteredAssets]
  );

  const trashedDocs = useMemo(
    () => filteredAssets.filter((a) => a.type !== 'image' && a.type !== 'video' && a.isDeleted),
    [filteredAssets]
  );

  const docsBase = useMemo(() => {
    if (docCollectionView === 'trash') return trashedDocs;
    if (docCollectionView === 'recent') {
      return docs.filter((d) => new Date(d.uploadedAt || 0).getTime() >= recentCutoff);
    }
    return docs;
  }, [docCollectionView, docs, trashedDocs, recentCutoff]);

  const docTypes = useMemo(() => Array.from(new Set(docsBase.map(docTypeOf))).sort(), [docsBase]);

  const docsFiltered = useMemo(() => {
    let list = docsBase;
    if (selectedDocProject !== 'all') {
      list = list.filter((d) => (d.docProjectNames || []).includes(selectedDocProject) || d.docProjectName === selectedDocProject);
    }
    if (docCategoryFilter !== 'all') list = list.filter((d) => docCategoryOf(d) === docCategoryFilter);
    if (docTypeFilter !== 'all') list = list.filter((d) => docTypeOf(d) === docTypeFilter);
    return list;
  }, [docsBase, selectedDocProject, docCategoryFilter, docTypeFilter]);

  const allActiveAssets = useMemo(() => {
    if (allFilesCollectionView === 'trash') {
      return filteredAssets.filter((a) => a.isDeleted);
    }
    const active = filteredAssets.filter((a) => !a.isDeleted);
    if (allFilesCollectionView === 'recent') {
      return active.filter((a) => new Date(a.uploadedAt || 0).getTime() >= recentCutoff);
    }
    return active;
  }, [filteredAssets, allFilesCollectionView, recentCutoff]);

  const allActiveAssetsGrouped = useMemo(() => {
    const m = new Map<string, Asset[]>();
    for (const d of allActiveAssets) {
      let key = 'Khác';
      if (d.type === 'image' || d.type === 'video') {
        key = 'Ảnh & Video';
      } else {
        key = DOC_CATEGORY_LABELS[docCategoryOf(d)] || 'Tài liệu khác';
      }
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === 'Ảnh & Video') return -1;
      if (b[0] === 'Ảnh & Video') return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [allActiveAssets]);

  const spaceAssets = useMemo(() => {
    const list: Asset[] = [];
    for (const post of posts) {
      if (post.assets) {
        list.push(...post.assets);
      }
    }
    return list;
  }, [posts]);

  const spaceAssetsGrouped = useMemo(() => {
    const m = new Map<string, Asset[]>();
    for (const d of spaceAssets) {
      let key = 'Khác';
      if (d.type === 'image' || d.type === 'video') {
        key = 'Ảnh & Video';
      } else {
        key = DOC_CATEGORY_LABELS[docCategoryOf(d)] || 'Tài liệu khác';
      }
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === 'Ảnh & Video') return -1;
      if (b[0] === 'Ảnh & Video') return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [spaceAssets]);

  const docCategoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docsBase) {
      const c = docCategoryOf(d);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [docsBase]);

  const docsGrouped = useMemo(() => {
    const m = new Map<string, Asset[]>();
    for (const d of docsFiltered) {
      const key = DOC_CATEGORY_LABELS[docCategoryOf(d)] || 'Khác';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docsFiltered]);

  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');

  const availableAlbums = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of photoAssets) {
      if (!p.albumName) continue;
      m.set(p.albumName, (m.get(p.albumName) || 0) + 1);
    }
    return Array.from(m.entries());
  }, [photoAssets]);

  const albumFilteredPhotos = useMemo(() => {
    if (selectedAlbum === 'all') return photoAssets;
    return photoAssets.filter((p) => p.albumName === selectedAlbum);
  }, [photoAssets, selectedAlbum]);

  const photoGroups = useMemo<[string, Asset[]][]>(() => {
    if (!groupByTimeEnabled) return [['all', albumFilteredPhotos]];
    const m = new Map<string, Asset[]>();
    for (const p of albumFilteredPhotos) {
      const key = groupMode === 'year' ? yearLabel(p.takenAt || p.uploadedAt) : monthLabel(p.takenAt || p.uploadedAt, language);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return Array.from(m.entries());
  }, [albumFilteredPhotos, groupMode, groupByTimeEnabled, language]);

  const activeIndexInScope = activeIndex >= 0;
  const active = activeIndexInScope
    ? (tab === 'photos' 
        ? albumFilteredPhotos[activeIndex] 
        : tab === 'dashboard'
          ? allActiveAssets[activeIndex]
          : tab === 'space'
            ? spaceAssets[activeIndex]
            : docsFiltered[activeIndex])
    : null;

  async function handleLogout() {
    try {
      await fetch(`${api}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.href = '/login';
    } catch (e) {
      setErr(t('messages.logoutFailed'));
    }
  }

  async function handleCreateSpace(name: string, type: 'journal' | 'collection' | 'project', description: string): Promise<boolean> {
    try {
      setMsg("Đang tạo không gian con...");
      const r = await fetch(`${api}/api/spaces`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type: type.toLowerCase(), description: description.trim() }),
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || "Tạo không gian thất bại");
      }
      const data = await r.json();
      setSpaces(prev => [data.space, ...prev]);
      setMsg("Đã tạo không gian con thành công!");
      return true;
    } catch (e: any) {
      setErr(e.message || "Lỗi tạo không gian");
      throw e;
    }
  }

  async function handleCreatePost() {
    if (!postCaption.trim() && postFiles.length === 0) return;
    try {
      setMsg("Đang đăng bài viết...");
      const fd = new FormData();
      fd.append('caption', postCaption.trim());
      for (const f of postFiles) {
        fd.append('files', f);
      }
      const r = await fetch(`${api}/api/spaces/${(activeWorkspace as any).id}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      if (!r.ok) throw new Error("Đăng bài thất bại");
      const data = await r.json();
      setPosts(prev => [data.post, ...prev]);
      setPostCaption('');
      setPostFiles([]);
      setMsg("Đăng bài viết thành công!");
      await loadData(true);
    } catch (e: any) {
      setErr(e.message || "Lỗi đăng bài");
    }
  }

  async function loadData(isBackground = false) {
    try {
      if (!isBackground) {
        setErr('');
      }

      const me = await fetch(`${api}/api/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        window.location.href = '/login';
        return;
      }
      const meData = await me.json();
      setUser(meData?.user);
      if (meData?.user?.mustChangePassword) {
        setMustChangePassword(true);
        setShowSettingsModal(true);
      }

      const [usageRes, assetsRes, projectsRes, tagsRes, spacesRes] = await Promise.all([
        fetch(`${api}/api/storage/usage`, { credentials: 'include' }),
        fetch(`${api}/api/assets?limit=1500&includeTrash=true`, { credentials: 'include' }),
        fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' }),
        fetch(`${api}/api/assets/tags`, { credentials: 'include' }),
        fetch(`${api}/api/spaces`, { credentials: 'include' }),
      ]);
      if (!usageRes.ok || !assetsRes.ok || !projectsRes.ok || !tagsRes.ok || !spacesRes.ok) throw new Error(t('messages.apiErrorOrSessionExpired'));
      const usageData = await usageRes.json();
      const assetsData = await assetsRes.json();
      const projectsData = await projectsRes.json();
      const tagsData = await tagsRes.json();
      const spacesData = await spacesRes.json();

      setUsage(usageData);
      setAssets(assetsData.items || []);
      setDocProjects(projectsData.items || []);
      setTags(tagsData.items || []);
      setSpaces(spacesData.spaces || []);

      if (activeWorkspace.type === 'space') {
        const postsRes = await fetch(`${api}/api/spaces/${activeWorkspace.id}/posts`, { credentials: 'include' });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        }
      }
    } catch (e: any) {
      setErr(e.message || t('messages.loadDataFailed'));
    }
  }

  async function loadAlbums() {
    try {
      const r = await fetch(`${api}/api/assets/albums`, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.errorLoadAlbum'));
      const data = await r.json();
      setAlbums(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDocProjects() {
    try {
      const r = await fetch(`${api}/api/assets/doc-projects`, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.errorLoadDocProjects'));
      const data = await r.json();
      setDocProjects(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTags() {
    try {
      const r = await fetch(`${api}/api/assets/tags`, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.tagsLoadFailed'));
      const data = await r.json();
      setTags(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function uploadLargeFileByChunks(file: File, translateFn: (key: string, replacements?: Record<string, string | number>) => string) {
    const init = await fetch(`${api}/api/assets/upload-chunk/init`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, mime: file.type || 'application/octet-stream', totalSize: file.size, lastModified: file.lastModified }),
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

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
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

    await loadData(true);
    e.target.value = '';

    if (failed.length === 0) {
      setMsg(t('messages.uploadDone', { done, total: files.length }));
      return;
    }

    const lines = failed.map((f) => `- #${f.index} ${f.name} | ${f.kind} | ${f.sizeMb}MB | ${f.mode} | ${f.reason}`);
    setErr(`${t('messages.uploadHasErrors', { failed: failed.length, total: files.length })}:\n${lines.join('\n')}`);
    setMsg(t('messages.uploadDoneWithErrors', { done, total: files.length, failed: failed.length }));
  }

  async function moveSelectedToTrash() {
    if (!selectedIds.length) return;
    try {
      const r = await fetch(`${api}/api/assets/bulk/trash`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error(t('messages.deleteFailed'));
      const data = await r.json();
      setMsg(t('messages.trashedCount', { count: data.updated || 0 }));
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData(true);
    } catch (e: any) {
      setMsg(t('messages.deleteError', { error: e.message || 'unknown' }));
    }
  }

  async function restoreSelectedFromTrash() {
    if (!selectedIds.length) return;
    try {
      const r = await fetch(`${api}/api/assets/bulk/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error(t('messages.restoreFailed'));
      const data = await r.json();
      setMsg(t('messages.restoredCount', { count: data.updated || 0 }));
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData(true);
    } catch (e: any) {
      setMsg(t('messages.restoreError', { error: e.message || 'unknown' }));
    }
  }

  async function purgeSelectedForever() {
    if (!selectedIds.length) return;
    const ok = window.confirm(t('dialogs.deleteForeverConfirm', { count: selectedIds.length }));
    if (!ok) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/purge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!r.ok) throw new Error(t('messages.purgeFailed'));
      const data = await r.json();
      setMsg(t('messages.purgedCount', { count: data.removed || 0 }));
      setSelectedIds([]);
      setSelectionMode(false);
      await loadData(true);
    } catch (e: any) {
      setMsg(t('messages.purgeError', { error: e.message || 'unknown' }));
    }
  }

  async function addSelectedToAlbum() {
    if (!selectedIds.length) return;
    const name = window.prompt(t('viewer.newAlbumPrompt'));
    if (!name || !name.trim()) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/album`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, albumName: name.trim() }),
      });
      if (!r.ok) throw new Error(t('messages.albumAddFailed'));
      const data = await r.json();
      setMsg(t('messages.addedToAlbumCount', { count: data.updated || 0, name: name.trim() }));
      await loadData(true);
    } catch (e: any) {
      setMsg(t('messages.albumError', { error: e.message || 'unknown' }));
    }
  }

  async function addSelectedToDocProject() {
    if (!selectedIds.length) return;
    const name = window.prompt(t('messages.projectPrompt'));
    if (!name || !name.trim()) return;

    try {
      const r = await fetch(`${api}/api/assets/bulk/doc-project`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, projectName: name.trim() }),
      });
      if (!r.ok) throw new Error(t('messages.projectAddFailed'));
      const data = await r.json();
      setMsg(t('messages.addedToProjectCount', { count: data.updated || 0, name: name.trim() }));
      await loadData(true);
      await loadDocProjects();
    } catch (e: any) {
      setMsg(t('messages.projectError', { error: e.message || 'unknown' }));
    }
  }

  function toggleAlbumSelection(name: string) {
    setSelectedAlbumsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewAlbumInSelection(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setSelectedAlbumsForActive((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setAlbums((prev) => {
      if (prev.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  }

  async function saveActiveAlbums() {
    if (!active?.id) return;
    try {
      const r = await fetch(`${api}/api/assets/${active.id}/albums`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumNames: selectedAlbumsForActive }),
      });
      if (!r.ok) throw new Error(t('viewer.albumUpdateFailed'));
      await loadData(true);
      await loadAlbums();
      setShowAlbumPicker(false);
      setMsg(t('viewer.albumUpdateSuccess'));
    } catch (e: any) {
      setMsg(t('viewer.albumSaveError', { error: e.message }));
    }
  }

  function toggleDocProjectSelection(name: string) {
    setSelectedDocProjectsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewDocProjectInSelection(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setSelectedDocProjectsForActive((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setDocProjects((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  }

  async function saveActiveDocProjects() {
    if (!active?.id) return;
    try {
      const r = await fetch(`${api}/api/assets/${active.id}/doc-projects`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectNames: selectedDocProjectsForActive }),
      });
      if (!r.ok) throw new Error(t('viewer.projectUpdateFailed') || 'Cập nhật tập tài liệu thất bại');
      await loadData(true);
      await loadDocProjects();
      setShowDocProjectPicker(false);
      setMsg(t('viewer.projectUpdateSuccess') || 'Đã cập nhật tập tài liệu của file thành công!');
    } catch (e: any) {
      setMsg(t('viewer.projectSaveError', { error: e.message }) || `Lỗi lưu tập tài liệu: ${e.message}`);
    }
  }

  function toggleTagSelection(name: string) {
    setSelectedTagsForActive((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function createNewTagInSelection(name: string) {
    const trimmed = (name || '').trim().toLowerCase();
    if (!trimmed) return;
    setSelectedTagsForActive((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setTags((prev) => {
      if (prev.some((tVal) => tVal.name.toLowerCase() === trimmed)) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  }

  async function saveActiveTags() {
    if (!active?.id) return;
    try {
      const r = await fetch(`${api}/api/assets/${active.id}/tags`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: selectedTagsForActive }),
      });
      if (!r.ok) throw new Error(t('viewer.tagsUpdateFailed'));
      await loadData(true);
      await loadTags();
      setShowTagPicker(false);
      setMsg(t('viewer.tagsUpdateSuccess'));
    } catch (e: any) {
      setMsg(t('viewer.tagsSaveError', { error: e.message }));
    }
  }

  function toggleFilterTag(name: string) {
    setSelectedFilterTags((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  // Sync active asset's relationships on active change
  useEffect(() => {
    if (active) {
      setSelectedAlbumsForActive(active.albumNames || (active.albumName ? [active.albumName] : []));
      setSelectedTagsForActive(active.tags || []);
      setSelectedDocProjectsForActive(active.docProjectNames || (active.docProjectName ? [active.docProjectName] : []));
    } else {
      setSelectedAlbumsForActive([]);
      setSelectedTagsForActive([]);
      setSelectedDocProjectsForActive([]);
    }
  }, [active]);

  // Initial load
  useEffect(() => {
    loadData();
    loadAlbums();
    loadDocProjects();
  }, [activeWorkspace]);

  return (
    <CloudContext.Provider value={{
      api, t, language,
      usage, setUsage,
      assets, setAssets,
      msg, setMsg,
      err, setErr,
      tab, setTab,
      search, setSearch,
      activeWorkspace, setActiveWorkspace,
      spaces, setSpaces,
      posts, setPosts,
      postCaption, setPostCaption,
      postFiles, setPostFiles,
      selectionMode, setSelectionMode,
      selectedIds, setSelectedIds,
      activeIndex, setActiveIndex,
      showInfo, setShowInfo,
      showAlbumPicker, setShowAlbumPicker,
      albums, setAlbums,
      albumQuery, setAlbumQuery,
      selectedAlbumsForActive, setSelectedAlbumsForActive,
      showDocProjectPicker, setShowDocProjectPicker,
      docProjectQuery, setDocProjectQuery,
      selectedDocProjectsForActive, setSelectedDocProjectsForActive,
      tags, setTags,
      selectedFilterTags, setSelectedFilterTags,
      selectedTagsForActive, setSelectedTagsForActive,
      showTagPicker, setShowTagPicker,
      tagQuery, setTagQuery,
      docTypeFilter, setDocTypeFilter,
      docCategoryFilter, setDocCategoryFilter,
      docCollectionView, setDocCollectionView,
      allFilesCollectionView, setAllFilesCollectionView,
      docKindsExpanded, setDocKindsExpanded,
      collectionView, setCollectionView,
      albumsExpanded, setAlbumsExpanded,
      docProjects, setDocProjects,
      docProjectsExpanded, setDocProjectsExpanded,
      selectedDocProject, setSelectedDocProject,
      groupByTimeEnabled, setGroupByTimeEnabled,
      groupMode, setGroupMode,
      expandedGroups, setExpandedGroups,
      activeMediaFit, setActiveMediaFit,
      showProfileMenu, setShowProfileMenu,
      user, setUser,
      showSettingsModal, setShowSettingsModal,
      mustChangePassword, setMustChangePassword,
      showCreateSpaceModal, setShowCreateSpaceModal,
      
      // operations
      handleLogout,
      handleCreateSpace,
      handleCreatePost,
      loadData,
      loadAlbums,
      loadDocProjects,
      loadTags,
      onUpload,
      moveSelectedToTrash,
      restoreSelectedFromTrash,
      purgeSelectedForever,
      addSelectedToAlbum,
      addSelectedToDocProject,
      toggleAlbumSelection,
      createNewAlbumInSelection,
      saveActiveAlbums,
      toggleDocProjectSelection,
      createNewDocProjectInSelection,
      saveActiveDocProjects,
      toggleTagSelection,
      createNewTagInSelection,
      saveActiveTags,
      toggleFilterTag,

      // derived
      filteredAssets,
      basePhotoAssets,
      recentCutoff,
      photoAssets,
      docs,
      trashedDocs,
      docsBase,
      docTypes,
      docsFiltered,
      allActiveAssets,
      allActiveAssetsGrouped,
      spaceAssets,
      spaceAssetsGrouped,
      docCategoryCounts,
      docsGrouped,
      selectedAlbum,
      setSelectedAlbum,
      availableAlbums,
      albumFilteredPhotos,
      photoGroups,
      active
    }}>
      {children}
    </CloudContext.Provider>
  );
}

export function useCloud() {
  const context = useContext(CloudContext);
  if (context === undefined) {
    throw new Error('useCloud must be used within a CloudProvider');
  }
  return context;
}
