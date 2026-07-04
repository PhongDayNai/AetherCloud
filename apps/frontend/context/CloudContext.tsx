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

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'error';
}

interface CloudContextType {
  // Config & API
  api: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  language: string;
  
  // State variables
  stats: any;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  anchorAssetId: string | null;
  setAnchorAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  showScrollAnchorBtn: boolean;
  setShowScrollAnchorBtn: React.Dispatch<React.SetStateAction<boolean>>;
  scrollToAnchor: () => void;
  usage: any;
  setUsage: React.Dispatch<React.SetStateAction<any>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  msg: string;
  setMsg: React.Dispatch<React.SetStateAction<string>>;
  err: string;
  setErr: React.Dispatch<React.SetStateAction<string>>;
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  setTab: React.Dispatch<React.SetStateAction<'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces'>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  activeWorkspace: { type: 'personal' } | { type: 'group'; id: string; name: string; role: 'owner' | 'admin' | 'member' } | { type: 'space'; id: string; name: string; spaceType: string; groupId?: string };
  setActiveWorkspace: React.Dispatch<React.SetStateAction<{ type: 'personal' } | { type: 'group'; id: string; name: string; role: 'owner' | 'admin' | 'member' } | { type: 'space'; id: string; name: string; spaceType: string; groupId?: string }>>;
  spaces: any[];
  setSpaces: React.Dispatch<React.SetStateAction<any[]>>;
  posts: any[];
  setPosts: React.Dispatch<React.SetStateAction<any[]>>;
  spaceAssetsFiltered: Asset[];
  setSpaceAssetsFiltered: React.Dispatch<React.SetStateAction<Asset[]>>;
  postCaption: string;
  setPostCaption: React.Dispatch<React.SetStateAction<string>>;
  postFiles: File[];
  setPostFiles: React.Dispatch<React.SetStateAction<File[]>>;
  saveToPersonalPost: boolean;
  setSaveToPersonalPost: (val: boolean) => void;
  groups: any[];
  setGroups: React.Dispatch<React.SetStateAction<any[]>>;
  saveToPersonalGroupUpload: boolean;
  setSaveToPersonalGroupUpload: (val: boolean) => void;
  processingVideoIds: string[];
  setProcessingVideoIds: React.Dispatch<React.SetStateAction<string[]>>;
  isRefreshing: boolean;
  setIsRefreshing: React.Dispatch<React.SetStateAction<boolean>>;

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
  docCategoryFilter: string[];
  setDocCategoryFilter: (val: string[] | string | ((prev: string[]) => string[])) => void;
  docCollectionView: 'all' | 'recent' | 'trash';
  setDocCollectionView: React.Dispatch<React.SetStateAction<'all' | 'recent' | 'trash'>>;
  allFilesCollectionView: 'all' | 'recent' | 'trash';
  setAllFilesCollectionView: React.Dispatch<React.SetStateAction<'all' | 'recent' | 'trash'>>;
  docKindsExpanded: boolean;
  setDocKindsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  collectionView: 'all' | 'recent' | 'images' | 'videos' | 'trash';
  setCollectionView: React.Dispatch<React.SetStateAction<'all' | 'recent' | 'images' | 'videos' | 'trash'>>;
  spacesSubTab: 'active' | 'trash';
  setSpacesSubTab: React.Dispatch<React.SetStateAction<'active' | 'trash'>>;
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
  showEditSpaceModal: boolean;
  setShowEditSpaceModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingSpace: { id: string; name: string; type: 'journal' | 'collection' | 'project'; description: string } | null;
  setEditingSpace: React.Dispatch<React.SetStateAction<{ id: string; name: string; type: 'journal' | 'collection' | 'project'; description: string } | null>>;
  showCreateGroupModal: boolean;
  setShowCreateGroupModal: React.Dispatch<React.SetStateAction<boolean>>;
  showGroupSettingsModal: boolean;
  setShowGroupSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBulkShareModal: boolean;
  setShowBulkShareModal: React.Dispatch<React.SetStateAction<boolean>>;
  showUploadModal: boolean;
  setShowUploadModal: React.Dispatch<React.SetStateAction<boolean>>;
  uploadFiles: (files: File[]) => Promise<void>;

  // Operations
  handleLogout: () => Promise<void>;
  handleCreateSpace: (name: string, type: 'journal' | 'collection' | 'project', description: string) => Promise<boolean>;
  handleUpdateSpace: (id: string, name: string, type: 'journal' | 'collection' | 'project', description: string) => Promise<boolean>;
  handleCreatePost: () => Promise<void>;
  loadData: (isBackground?: boolean) => Promise<void>;
  loadAlbums: () => Promise<void>;
  loadDocProjects: () => Promise<void>;
  loadTags: () => Promise<void>;
  handleCreateGroup: (name: string) => Promise<boolean>;
  handleDeleteSpace: (id: string) => Promise<boolean>;
  handleRestoreSpace: (id: string) => Promise<boolean>;
  handlePurgeSpace: (id: string) => Promise<boolean>;
  deleteSelectedSpaces: (ids: string[]) => Promise<void>;
  restoreSelectedSpaces: (ids: string[]) => Promise<void>;
  purgeSelectedSpaces: (ids: string[]) => Promise<void>;
  
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
  toasts: ToastItem[];
  removeToast: (id: string) => void;
  addToast: (message: string, type?: 'info' | 'error') => void;
  nextCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreAssets: () => Promise<void>;
}

const CloudContext = createContext<CloudContextType | undefined>(undefined);

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { language, t } = useLanguage();
  const api = useMemo(() => getApiOrigin(), []);

  const [usage, setUsage] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Cache configuration
  const [photosCache, setPhotosCache] = useState<Record<string, {
    items: Asset[];
    nextCursor: string | null;
    hasMore: boolean;
  }>>({});
  const usedPhotosKeysRef = useRef<string[]>([]);

  const [docsCache, setDocsCache] = useState<Record<string, {
    items: Asset[];
    nextCursor: string | null;
    hasMore: boolean;
  }>>({});
  const usedDocsKeysRef = useRef<string[]>([]);

  // Scroll Anchor State
  const [anchorAssetId, setAnchorAssetId] = useState<string | null>(null);
  const [showScrollAnchorBtn, setShowScrollAnchorBtn] = useState<boolean>(false);

  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);

  const addToast = React.useCallback((message: string, type: 'info' | 'error' = 'info') => {
    const newToast: ToastItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      message,
      type
    };
    setToastQueue((prev) => [...prev, newToast]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toastQueue.length > 0 && toasts.length < 3) {
      const nextToast = toastQueue[0];
      setToastQueue((prev) => prev.slice(1));
      setToasts((prev) => [...prev, nextToast]);
    }
  }, [toastQueue, toasts]);

  useEffect(() => {
    if (msg) {
      addToast(msg, 'info');
      setMsg('');
    }
  }, [msg, addToast]);

  useEffect(() => {
    if (err) {
      addToast(err, 'error');
      setErr('');
    }
  }, [err, addToast]);

  const [tab, setTab] = useState<'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces'>('dashboard');
  const [search, setSearch] = useState<string>('');

  const [activeWorkspace, setActiveWorkspace] = useState<{ type: 'personal' } | { type: 'group'; id: string; name: string; role: 'owner' | 'admin' | 'member' } | { type: 'space'; id: string; name: string; spaceType: string; groupId?: string }>({ type: 'personal' });
  const [spaces, setSpaces] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [spaceAssetsFiltered, setSpaceAssetsFiltered] = useState<Asset[]>([]);
  const [postCaption, setPostCaption] = useState<string>('');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  
  const [saveToPersonalPost, setSaveToPersonalPostState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aethercloud_save_to_personal_post_upload');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const setSaveToPersonalPost = (val: boolean) => {
    setSaveToPersonalPostState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aethercloud_save_to_personal_post_upload', String(val));
    }
  };

  const [groups, setGroups] = useState<any[]>([]);
  const [saveToPersonalGroupUpload, setSaveToPersonalGroupUploadState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aethercloud_save_to_personal_group_upload');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const setSaveToPersonalGroupUpload = (val: boolean) => {
    setSaveToPersonalGroupUploadState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aethercloud_save_to_personal_group_upload', String(val));
    }
  };

  const [processingVideoIds, setProcessingVideoIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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
  const [docCategoryFilter, setDocCategoryFilterState] = useState<string[]>(['all']);

  const setDocCategoryFilter = (val: string[] | string | ((prev: string[]) => string[])) => {
    setDocCategoryFilterState(prev => {
      if (typeof val === 'function') {
        return val(prev);
      }
      if (Array.isArray(val)) {
        return val;
      }
      return [val];
    });
  };
  const [docCollectionView, setDocCollectionView] = useState<'all' | 'recent' | 'trash'>('all');
  const [allFilesCollectionView, setAllFilesCollectionView] = useState<'all' | 'recent' | 'trash'>('all');
  const [docKindsExpanded, setDocKindsExpanded] = useState<boolean>(false);
  const [collectionView, setCollectionView] = useState<'all' | 'recent' | 'images' | 'videos' | 'trash'>('all');
  const [spacesSubTab, setSpacesSubTab] = useState<'active' | 'trash'>('active');
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
  const [showEditSpaceModal, setShowEditSpaceModal] = useState<boolean>(false);
  const [editingSpace, setEditingSpace] = useState<{ id: string; name: string; type: 'journal' | 'collection' | 'project'; description: string } | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState<boolean>(false);
  const [showBulkShareModal, setShowBulkShareModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const suppressClickRef = useRef<string | null>(null);

  // Polling for processing videos
  useEffect(() => {
    if (processingVideoIds.length === 0) return;
    
    const interval = setInterval(async () => {
      try {
        const idsParam = processingVideoIds.join(',');
        const res = await fetch(`${api}/api/assets/status?ids=${idsParam}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const statusesList = Array.isArray(data.statuses) ? data.statuses : [];
          let hasChanges = false;
          let newIds = [...processingVideoIds];
          
          for (const item of statusesList) {
            const { id, processingStatus } = item;
            if (processingStatus === 'ready' || processingStatus === 'failed') {
              hasChanges = true;
              newIds = newIds.filter(x => x !== id);
              
              if (processingStatus === 'ready') {
                setAssets(prev => prev.map(a => a.id === id ? { ...a, processingStatus: 'ready' } : a));
              } else {
                addToast(t('viewer.videoOptimizeFailed') || `Tệp video ${id} bị transcode lỗi.`, 'error');
              }
            }
          }
          
          if (hasChanges) {
            setProcessingVideoIds(newIds);
            loadData(true);
          }
        }
      } catch (err) {
        console.error("Video processing polling error:", err);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [processingVideoIds, api]);

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
    if (docCategoryFilter && !docCategoryFilter.includes('all')) {
      list = list.filter((d) => docCategoryFilter.includes(docCategoryOf(d)));
    }
    if (docTypeFilter !== 'all') list = list.filter((d) => docTypeOf(d) === docTypeFilter);
    return list;
  }, [docsBase, selectedDocProject, docCategoryFilter, docTypeFilter]);

  const allActiveAssets = useMemo(() => {
    if (tab === 'dashboard') {
      const photos = stats?.recentPhotos || [];
      const docs = stats?.recentDocs ? (Object.values(stats.recentDocs).flat() as Asset[]) : [];
      return [...photos, ...docs];
    }
    if (allFilesCollectionView === 'trash') {
      return filteredAssets.filter((a) => a.isDeleted);
    }
    const active = filteredAssets.filter((a) => !a.isDeleted);
    if (allFilesCollectionView === 'recent') {
      return active.filter((a) => new Date(a.uploadedAt || 0).getTime() >= recentCutoff);
    }
    return active;
  }, [filteredAssets, allFilesCollectionView, recentCutoff, tab, stats]);

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
    if (stats?.docCategoryCounts) {
      Object.entries(stats.docCategoryCounts).forEach(([k, v]) => {
        m.set(k, Number(v));
      });
      return m;
    }
    for (const d of docsBase) {
      const c = docCategoryOf(d);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [docsBase, stats]);

  const docsGrouped = useMemo<[string, Asset[]][]>(() => {
    const isMultiCategory = docCategoryFilter.length > 1 && !docCategoryFilter.includes('all');

    if (isMultiCategory) {
      const m = new Map<string, Asset[]>();
      for (const d of docsFiltered) {
        const key = DOC_CATEGORY_LABELS[docCategoryOf(d)] || 'Khác';
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(d);
      }
      return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      if (!groupByTimeEnabled) return [['all', docsFiltered]];
      const m = new Map<string, Asset[]>();
      for (const d of docsFiltered) {
        const key = groupMode === 'year' 
          ? yearLabel(d.takenAt || d.uploadedAt) 
          : monthLabel(d.takenAt || d.uploadedAt, language);
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(d);
      }
      return Array.from(m.entries());
    }
  }, [docsFiltered, docCategoryFilter, groupByTimeEnabled, groupMode, language]);

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
            : tab === 'space-all'
              ? (spaceAssetsFiltered.length > 0 ? spaceAssetsFiltered[activeIndex] : spaceAssets[activeIndex])
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
      setMsg(t('spaces.creating') || "Đang tạo không gian con...");
      const body: any = { name: name.trim(), type: type.toLowerCase(), description: description.trim() };
      if (activeWorkspace.type === 'group') {
        body.groupId = activeWorkspace.id;
      }
      const r = await fetch(`${api}/api/spaces`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('spaces.creatingFailed') || "Tạo không gian thất bại");
      }
      const data = await r.json();
      setSpaces(prev => [data.space, ...prev]);
      setMsg(t('spaces.createSuccess') || "Đã tạo không gian con thành công!");
      return true;
    } catch (e: any) {
      setErr(e.message || t('spaces.createErr') || "Lỗi tạo không gian");
      throw e;
    }
  }

  async function handleUpdateSpace(id: string, name: string, type: 'journal' | 'collection' | 'project', description: string): Promise<boolean> {
    try {
      setMsg(t('spaces.updating') || "Đang cập nhật không gian con...");
      const r = await fetch(`${api}/api/spaces/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type: type.toLowerCase(), description: description.trim() }),
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('spaces.updatingFailed') || "Cập nhật không gian thất bại");
      }
      const data = await r.json();
      setSpaces(prev => prev.map(s => s.id === id ? data.space : s));
      setActiveWorkspace(prev => {
        if (prev.type === 'space' && prev.id === id) {
          return {
            type: 'space',
            id: id,
            name: data.space.name,
            spaceType: data.space.type,
            groupId: data.space.groupId
          };
        }
        return prev;
      });
      setMsg(t('spaces.updateSuccess') || "Đã cập nhật không gian con thành công!");
      return true;
    } catch (e: any) {
      setErr(e.message || t('spaces.updateErr') || "Lỗi cập nhật không gian");
      throw e;
    }
  }

  async function handleDeleteSpace(id: string): Promise<boolean> {
    try {
      const r = await fetch(`${api}/api/spaces/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('spaces.deleteFailed'));
      }
      setSpaces(prev => prev.filter(s => s.id !== id));
      addToast(t('spaces.deleteSuccess'), 'info');
      return true;
    } catch (e: any) {
      addToast(e.message || t('spaces.deleteFailed'), 'error');
      return false;
    }
  }

  async function handleRestoreSpace(id: string): Promise<boolean> {
    try {
      const r = await fetch(`${api}/api/spaces/${id}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('spaces.restoreFailed'));
      }
      const data = await r.json();
      setSpaces(prev => [data.space, ...prev]);
      addToast(t('spaces.restoreSuccess'), 'info');
      return true;
    } catch (e: any) {
      addToast(e.message || t('spaces.restoreFailed'), 'error');
      return false;
    }
  }

  async function handlePurgeSpace(id: string): Promise<boolean> {
    try {
      const r = await fetch(`${api}/api/spaces/${id}/purge`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('spaces.purgeFailed'));
      }
      addToast(t('spaces.purgeSuccess'), 'info');
      return true;
    } catch (e: any) {
      addToast(e.message || t('spaces.purgeFailed'), 'error');
      return false;
    }
  }

  async function deleteSelectedSpaces(ids: string[]) {
    if (ids.length === 0) return;
    try {
      const results = await Promise.all(ids.map(id => handleDeleteSpace(id)));
      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function restoreSelectedSpaces(ids: string[]) {
    if (ids.length === 0) return;
    try {
      const results = await Promise.all(ids.map(id => handleRestoreSpace(id)));
      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function purgeSelectedSpaces(ids: string[]) {
    if (ids.length === 0) return;
    try {
      const results = await Promise.all(ids.map(id => handlePurgeSpace(id)));
      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        await loadData(true);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateGroup(name: string): Promise<boolean> {
    try {
      const r = await fetch(`${api}/api/groups`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.message || "Tạo nhóm thất bại");
      }
      const data = await r.json();
      addToast(t('groups.createSuccess') || "Tạo nhóm thành công!", 'info');
      await loadData();
      return true;
    } catch (e: any) {
      addToast(e.message || "Lỗi tạo nhóm", 'error');
      return false;
    }
  }

  async function handleCreatePost() {
    if (!postCaption.trim() && postFiles.length === 0) return;
    if (postFiles.length > 20) {
      setErr(t('spaces.maxFilesExceeded', { max: 20 }));
      return;
    }
    try {
      setMsg(t('spaces.posting') || "Đang đăng bài viết...");
      const fd = new FormData();
      fd.append('caption', postCaption.trim());
      fd.append('saveToPersonal', String(saveToPersonalPost));

      const lastModifieds = postFiles.map(f => f.lastModified);
      fd.append('lastModifieds', JSON.stringify(lastModifieds));

      for (const f of postFiles) {
        fd.append('files', f);
      }
      const r = await fetch(`${api}/api/spaces/${(activeWorkspace as any).id}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('spaces.postingFailed') || "Đăng bài thất bại");
      }
      const data = await r.json();
      setPosts(prev => [data.post, ...prev]);
      setPostCaption('');
      setPostFiles([]);
      setMsg(t('spaces.postSuccess') || "Đăng bài viết thành công!");
      await loadData(true);
    } catch (e: any) {
      setErr(e.message || t('spaces.postErr') || "Lỗi đăng bài");
    }
  }

  // 1. Tính toán current key
  const currentPhotosKey = useMemo(() => {
    const prefix = activeWorkspace.type === 'group' 
      ? `group_${activeWorkspace.id}` 
      : activeWorkspace.type === 'space' 
      ? `space_${activeWorkspace.id}` 
      : 'personal';
    const sortedTags = selectedFilterTags.slice().sort().join(',');
    return `${prefix}::${collectionView}::${selectedAlbum}::${sortedTags}`;
  }, [collectionView, selectedAlbum, selectedFilterTags, activeWorkspace]);

  const currentDocsKey = useMemo(() => {
    const prefix = activeWorkspace.type === 'group' 
      ? `group_${activeWorkspace.id}` 
      : activeWorkspace.type === 'space' 
      ? `space_${activeWorkspace.id}` 
      : 'personal';
    const sortedTags = selectedFilterTags.slice().sort().join(',');
    const sortedCats = docCategoryFilter.slice().sort().join(',');
    return `${prefix}::${sortedCats}::${docTypeFilter}::${selectedDocProject}::${docCollectionView}::${sortedTags}`;
  }, [docCategoryFilter, docTypeFilter, selectedDocProject, docCollectionView, selectedFilterTags, activeWorkspace]);

  // 2. Tìm phần tử neo hiển thị đầu tiên trong viewport
  const findFirstVisibleAssetId = (): string | null => {
    const cards = document.querySelectorAll('.photoCard, .docCard, .tile');
    for (const card of Array.from(cards)) {
      const rect = card.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight) {
        const id = card.getAttribute('data-id');
        if (id) return id;
      }
    }
    return null;
  };

  // 3. Cuộn về neo và nháy sáng viền
  const scrollToAnchor = () => {
    if (!anchorAssetId) return;
    const card = document.querySelector(`[data-id="${anchorAssetId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('glowHighlight');
      setTimeout(() => {
        card.classList.remove('glowHighlight');
      }, 2500); // 3 lần nhấp nháy ~ 2.4s
    }
    setShowScrollAnchorBtn(false);
    setAnchorAssetId(null);
  };

  // 4. Background Sync Photos
  const syncPhotosInBackground = async (key: string) => {
    try {
      const parts = key.split('::');
      const [colView, album, tagsStr] = parts.length > 3 ? parts.slice(1) : parts;
      const params = new URLSearchParams();
      params.append('limit', '100');
      params.append('type', 'photos');
      if (activeWorkspace.type === 'group') {
        params.append('groupId', activeWorkspace.id);
      } else if (activeWorkspace.type === 'space' && activeWorkspace.groupId) {
        params.append('groupId', activeWorkspace.groupId);
      }
      if (colView === 'images') params.append('subType', 'image');
      if (colView === 'videos') params.append('subType', 'video');
      if (colView === 'trash') {
        params.append('onlyTrash', 'true');
      } else {
        params.append('includeTrash', 'false');
      }
      if (album && album !== 'all') params.append('album', album);
      if (tagsStr) {
        const firstTag = tagsStr.split(',')[0];
        if (firstTag) params.append('tag', firstTag);
      }

      const res = await fetch(`${api}/api/assets?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      handleLiveSync(key, 'photos', data.items || []);
    } catch (err) {
      console.error('Background sync photos failed:', err);
    }
  };

  // 5. Background Sync Docs
  const syncDocsInBackground = async (key: string) => {
    try {
      const parts = key.split('::');
      const [catFilter, typeFilter, project, docColView, tagsStr] = parts.length > 5 ? parts.slice(1) : parts;
      const params = new URLSearchParams();
      params.append('limit', '100');
      params.append('type', 'docs');
      if (activeWorkspace.type === 'group') {
        params.append('groupId', activeWorkspace.id);
      } else if (activeWorkspace.type === 'space' && activeWorkspace.groupId) {
        params.append('groupId', activeWorkspace.groupId);
      }
      if (docColView === 'trash') {
        params.append('onlyTrash', 'true');
      } else {
        params.append('includeTrash', 'false');
      }
      if (catFilter && catFilter !== 'all') params.append('category', catFilter);
      if (project && project !== 'all') params.append('docProject', project);
      if (tagsStr) {
        const firstTag = tagsStr.split(',')[0];
        if (firstTag) params.append('tag', firstTag);
      }

      const res = await fetch(`${api}/api/assets?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      handleLiveSync(key, 'docs', data.items || []);
    } catch (err) {
      console.error('Background sync docs failed:', err);
    }
  };

  // 6. Live Sync logic (Added, Updated, Deleted)
  const handleLiveSync = (key: string, type: 'photos' | 'docs', syncItems: Asset[]) => {
    const isCurrentKey = (type === 'photos' && key === currentPhotosKey) || (type === 'docs' && key === currentDocsKey);
    const setCache = type === 'photos' ? setPhotosCache : setDocsCache;
    
    setCache(prev => {
      if (!prev[key]) return prev;
      
      const oldItems = prev[key].items || [];
      const oldIds = new Set(oldItems.map(item => item.id));
      const addedItems = syncItems.filter(item => !oldIds.has(item.id));
      
      const syncItemMap = new Map(syncItems.map(item => [item.id, item]));
      let hasUpdates = false;
      
      const updatedItems = oldItems.map(oldItem => {
        const syncItem = syncItemMap.get(oldItem.id);
        if (!syncItem) return oldItem;
        
        const isChanged = 
          oldItem.originalName !== syncItem.originalName ||
          oldItem.albumName !== syncItem.albumName ||
          oldItem.docProjectName !== syncItem.docProjectName ||
          JSON.stringify(oldItem.albumNames) !== JSON.stringify(syncItem.albumNames) ||
          JSON.stringify(oldItem.docProjectNames) !== JSON.stringify(syncItem.docProjectNames) ||
          JSON.stringify(oldItem.tags) !== JSON.stringify(syncItem.tags) ||
          oldItem.isDeleted !== syncItem.isDeleted;
          
        if (isChanged) {
          hasUpdates = true;
          return syncItem;
        }
        return oldItem;
      });

      const oldPageOneIds = new Set(oldItems.slice(0, 100).map(item => item.id));
      const syncIds = new Set(syncItems.map(item => item.id));
      const deletedIds = Array.from(oldPageOneIds).filter(id => !syncIds.has(id));
      
      let nextItems = [...updatedItems];
      if (deletedIds.length > 0) {
        nextItems = nextItems.filter(item => !deletedIds.includes(item.id));
      }

      // Xử lý khi có tệp mới được thêm vào
      if (addedItems.length > 0) {
        if (isCurrentKey) {
          // Báo Toast bất đồng bộ bên ngoài updater
          setTimeout(() => {
            addToast(t('messages.liveSyncAdded', { count: addedItems.length }) || `Có ${addedItems.length} tệp tin mới vừa được cập nhật. Đang tiến hành đồng bộ ngầm...`, 'info');
          }, 0);
          
          // Ghi nhớ vị trí scroll của người dùng trước khi chèn
          const currentScrollY = window.scrollY || document.documentElement.scrollTop;
          if (currentScrollY > 150) {
            const visibleId = findFirstVisibleAssetId();
            if (visibleId) {
              setTimeout(() => {
                setAnchorAssetId(visibleId);
                setShowScrollAnchorBtn(true);
              }, 0);
            }
          }

          // Trì hoãn 1.5s mới chèn tệp mới vào đầu danh sách để tránh giật màn hình
          setTimeout(() => {
            setCache(currentCache => {
              if (!currentCache[key]) return currentCache;
              const currentItems = currentCache[key].items;
              const updatedCacheItems = [...addedItems, ...currentItems.filter(item => !addedItems.some(a => a.id === item.id))];
              return { ...currentCache, [key]: { ...currentCache[key], items: updatedCacheItems } };
            });
            
            setAssets(prevDisplay => {
              const updatedDisplayItems = [...addedItems, ...prevDisplay.filter(item => !addedItems.some(a => a.id === item.id))];
              return updatedDisplayItems;
            });
          }, 1500);
        } else {
          // Không phải key đang hiển thị, chèn vào cache ngay lập tức
          nextItems = [...addedItems, ...nextItems.filter(item => !addedItems.some(a => a.id === item.id))];
        }
      }

      const isChanged = hasUpdates || deletedIds.length > 0;
      if (isChanged && isCurrentKey) {
        setTimeout(() => {
          setAssets(nextItems);
        }, 0);
      }

      if (isChanged || (addedItems.length > 0 && !isCurrentKey)) {
        return {
          ...prev,
          [key]: { ...prev[key], items: nextItems }
        };
      }
      
      return prev;
    });
  };

  // 7. Fetch Photos from Server
  const fetchPhotosFromServer = async (key: string, cursor: string | null, isAppend = false) => {
    setIsLoadingMore(true);
    try {
      const parts = key.split('::');
      const [colView, album, tagsStr] = parts.length > 3 ? parts.slice(1) : parts;
      const params = new URLSearchParams();
      params.append('limit', '100');
      params.append('type', 'photos');
      if (activeWorkspace.type === 'group') {
        params.append('groupId', activeWorkspace.id);
      } else if (activeWorkspace.type === 'space' && activeWorkspace.groupId) {
        params.append('groupId', activeWorkspace.groupId);
      }
      if (colView === 'images') params.append('subType', 'image');
      if (colView === 'videos') params.append('subType', 'video');
      if (colView === 'trash') {
        params.append('onlyTrash', 'true');
      } else {
        params.append('includeTrash', 'false');
      }
      if (album && album !== 'all') params.append('album', album);
      if (tagsStr) {
        const firstTag = tagsStr.split(',')[0];
        if (firstTag) params.append('tag', firstTag);
      }
      if (cursor) params.append('cursor', cursor);

      const res = await fetch(`${api}/api/assets?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadDataFailed'));
      const data = await res.json();
      
      const fetchedItems = data.items || [];
      const newNextCursor = data.nextCursor || null;
      const newHasMore = !!data.nextCursor;

      setPhotosCache(prev => {
        const prevEntry = prev[key] || { items: [], nextCursor: null, hasMore: false };
        const newItems = isAppend ? [...prevEntry.items, ...fetchedItems] : fetchedItems;
        
        let nextCache = {
          ...prev,
          [key]: { items: newItems, nextCursor: newNextCursor, hasMore: newHasMore }
        };
        
        if (Object.keys(nextCache).length > 15) {
          const oldestKey = usedPhotosKeysRef.current.find(k => k !== key && prev[k]);
          if (oldestKey) {
            delete nextCache[oldestKey];
            usedPhotosKeysRef.current = usedPhotosKeysRef.current.filter(k => k !== oldestKey);
          }
        }
        return nextCache;
      });

      if (key === currentPhotosKey) {
        setAssets(prev => isAppend ? [...prev, ...fetchedItems] : fetchedItems);
        setNextCursor(newNextCursor);
        setHasMore(newHasMore);
      }
    } catch (e: any) {
      setErr(e.message || t('messages.loadDataFailed') || "Tải dữ liệu thất bại");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 8. Fetch Docs from Server
  const fetchDocsFromServer = async (key: string, cursor: string | null, isAppend = false) => {
    setIsLoadingMore(true);
    try {
      const parts = key.split('::');
      const [catFilter, typeFilter, project, docColView, tagsStr] = parts.length > 5 ? parts.slice(1) : parts;
      const params = new URLSearchParams();
      params.append('limit', '100');
      params.append('type', 'docs');
      if (activeWorkspace.type === 'group') {
        params.append('groupId', activeWorkspace.id);
      } else if (activeWorkspace.type === 'space' && activeWorkspace.groupId) {
        params.append('groupId', activeWorkspace.groupId);
      }
      if (docColView === 'trash') {
        params.append('onlyTrash', 'true');
      } else {
        params.append('includeTrash', 'false');
      }
      if (catFilter && catFilter !== 'all') params.append('category', catFilter);
      if (project && project !== 'all') params.append('docProject', project);
      if (tagsStr) {
        const firstTag = tagsStr.split(',')[0];
        if (firstTag) params.append('tag', firstTag);
      }
      if (cursor) params.append('cursor', cursor);

      const res = await fetch(`${api}/api/assets?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(t('messages.loadDataFailed'));
      const data = await res.json();
      
      const fetchedItems = data.items || [];
      const newNextCursor = data.nextCursor || null;
      const newHasMore = !!data.nextCursor;

      setDocsCache(prev => {
        const prevEntry = prev[key] || { items: [], nextCursor: null, hasMore: false };
        const newItems = isAppend ? [...prevEntry.items, ...fetchedItems] : fetchedItems;
        
        let nextCache = {
          ...prev,
          [key]: { items: newItems, nextCursor: newNextCursor, hasMore: newHasMore }
        };
        
        if (Object.keys(nextCache).length > 15) {
          const oldestKey = usedDocsKeysRef.current.find(k => k !== key && prev[k]);
          if (oldestKey) {
            delete nextCache[oldestKey];
            usedDocsKeysRef.current = usedDocsKeysRef.current.filter(k => k !== oldestKey);
          }
        }
        return nextCache;
      });

      if (key === currentDocsKey) {
        setAssets(prev => isAppend ? [...prev, ...fetchedItems] : fetchedItems);
        setNextCursor(newNextCursor);
        setHasMore(newHasMore);
      }
    } catch (e: any) {
      setErr(e.message || t('messages.loadDataFailed') || "Tải dữ liệu thất bại");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 9. Load Filter Photos Trigger
  const loadFilterPhotos = async (key: string) => {
    usedPhotosKeysRef.current = [
      ...usedPhotosKeysRef.current.filter(k => k !== key),
      key
    ];

    const cached = photosCache[key];
    if (cached) {
      setAssets(cached.items);
      setNextCursor(cached.nextCursor);
      setHasMore(cached.hasMore);
      syncPhotosInBackground(key);
    } else {
      await fetchPhotosFromServer(key, null);
    }
  };

  // 10. Load Filter Docs Trigger
  const loadFilterDocs = async (key: string) => {
    usedDocsKeysRef.current = [
      ...usedDocsKeysRef.current.filter(k => k !== key),
      key
    ];

    const cached = docsCache[key];
    if (cached) {
      setAssets(cached.items);
      setNextCursor(cached.nextCursor);
      setHasMore(cached.hasMore);
      syncDocsInBackground(key);
    } else {
      await fetchDocsFromServer(key, null);
    }
  };

  // 11. Trigger effects when tab or filters change
  useEffect(() => {
    if (tab === 'photos') {
      loadFilterPhotos(currentPhotosKey);
    }
  }, [currentPhotosKey, tab]);

  useEffect(() => {
    if (tab === 'docs') {
      loadFilterDocs(currentDocsKey);
    }
  }, [currentDocsKey, tab]);

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

      // Fetch groups
      const groupsRes = await fetch(`${api}/api/groups`, { credentials: 'include' });
      let groupsList = [];
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        groupsList = groupsData.groups || [];
        setGroups(groupsList);
      }

      let gId: string | null = null;
      if (activeWorkspace.type === 'group') {
        gId = activeWorkspace.id;
      } else if (activeWorkspace.type === 'space' && activeWorkspace.groupId) {
        gId = activeWorkspace.groupId;
      }

      const statsUrl = gId ? `${api}/api/assets/stats?groupId=${gId}` : `${api}/api/assets/stats`;
      const spacesUrl = gId ? `${api}/api/spaces?groupId=${gId}&includeTrash=true` : `${api}/api/spaces?includeTrash=true`;

      const [statsRes, spacesRes] = await Promise.all([
        fetch(statsUrl, { credentials: 'include' }),
        fetch(spacesUrl, { credentials: 'include' }),
      ]);
      if (!statsRes.ok || !spacesRes.ok) throw new Error(t('messages.apiErrorOrSessionExpired'));
      const statsData = await statsRes.json();
      const spacesData = await spacesRes.json();

      setStats(statsData);
      setUsage(statsData.storage);
      setDocProjects(statsData.docProjects || []);
      setTags(statsData.tags || []);
      setAlbums(statsData.albums || []);
      setSpaces(spacesData.spaces || []);

      if (activeWorkspace.type === 'space') {
        const postsRes = await fetch(`${api}/api/spaces/${activeWorkspace.id}/posts`, { credentials: 'include' });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        }
      }

      // Fetch processing videos
      const processingUrl = gId ? `${api}/api/assets/processing?groupId=${gId}` : `${api}/api/assets/processing`;
      const procRes = await fetch(processingUrl, { credentials: 'include' });
      if (procRes.ok) {
        const procData = await procRes.json();
        setProcessingVideoIds(procData.ids || []);
      }
    } catch (e: any) {
      setErr(e.message || t('messages.loadDataFailed'));
    }
  }

  async function loadMoreAssets() {
    if (!nextCursor || isLoadingMore) return;
    if (tab === 'photos') {
      await fetchPhotosFromServer(currentPhotosKey, nextCursor, true);
    } else if (tab === 'docs') {
      await fetchDocsFromServer(currentDocsKey, nextCursor, true);
    } else {
      setIsLoadingMore(true);
      try {
        const res = await fetch(`${api}/api/assets?limit=100&includeTrash=true&cursor=${nextCursor}`, { credentials: 'include' });
        if (!res.ok) throw new Error(t('messages.loadDataFailed'));
        const data = await res.json();
        setAssets((prev) => [...prev, ...(data.items || [])]);
        setNextCursor(data.nextCursor || null);
        setHasMore(!!data.nextCursor);
      } catch (e: any) {
        setErr(e.message || t('messages.loadMoreFailed') || "Tải thêm dữ liệu thất bại");
      } finally {
        setIsLoadingMore(false);
      }
    }
  }

  async function loadAlbums() {
    try {
      const gId = activeWorkspace.type === 'group' ? activeWorkspace.id : (activeWorkspace.type === 'space' && activeWorkspace.groupId ? activeWorkspace.groupId : null);
      const url = gId ? `${api}/api/assets/albums?groupId=${gId}` : `${api}/api/assets/albums`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.errorLoadAlbum'));
      const data = await r.json();
      setAlbums(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDocProjects() {
    try {
      const gId = activeWorkspace.type === 'group' ? activeWorkspace.id : (activeWorkspace.type === 'space' && activeWorkspace.groupId ? activeWorkspace.groupId : null);
      const url = gId ? `${api}/api/assets/doc-projects?groupId=${gId}` : `${api}/api/assets/doc-projects`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.errorLoadDocProjects'));
      const data = await r.json();
      setDocProjects(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTags() {
    try {
      const gId = activeWorkspace.type === 'group' ? activeWorkspace.id : (activeWorkspace.type === 'space' && activeWorkspace.groupId ? activeWorkspace.groupId : null);
      const url = gId ? `${api}/api/assets/tags?groupId=${gId}` : `${api}/api/assets/tags`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(t('viewer.tagsLoadFailed'));
      const data = await r.json();
      setTags(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

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

  async function invalidateCacheAndReload() {
    setPhotosCache({});
    setDocsCache({});
    usedPhotosKeysRef.current = [];
    usedDocsKeysRef.current = [];
    
    await loadData(true);
    
    if (tab === 'photos') {
      await fetchPhotosFromServer(currentPhotosKey, null);
    } else if (tab === 'docs') {
      await fetchDocsFromServer(currentDocsKey, null);
    }
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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
      await invalidateCacheAndReload();
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

  // Tự động đóng viewer (reset activeIndex) khi đổi bộ lọc hoặc tab
  useEffect(() => {
    setActiveIndex(-1);
  }, [tab, collectionView, selectedAlbum, docCollectionView, docCategoryFilter, selectedDocProject, selectedFilterTags]);

  // Load data when activeWorkspace or tab changes
  useEffect(() => {
    loadData(true);
  }, [activeWorkspace, tab]);

  return (
    <CloudContext.Provider value={{
      api, t, language,
      usage, setUsage,
      assets, setAssets,
      stats, setStats,
      anchorAssetId, setAnchorAssetId,
      showScrollAnchorBtn, setShowScrollAnchorBtn,
      scrollToAnchor,
      msg, setMsg,
      err, setErr,
      tab, setTab,
      search, setSearch,
      activeWorkspace, setActiveWorkspace,
      spaces, setSpaces,
      posts, setPosts,
      spaceAssetsFiltered, setSpaceAssetsFiltered,
      postCaption, setPostCaption,
      postFiles, setPostFiles,
      saveToPersonalPost, setSaveToPersonalPost,
      groups, setGroups,
      saveToPersonalGroupUpload, setSaveToPersonalGroupUpload,
      processingVideoIds, setProcessingVideoIds,
      isRefreshing, setIsRefreshing,
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
      spacesSubTab, setSpacesSubTab,
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
      showEditSpaceModal, setShowEditSpaceModal,
      editingSpace, setEditingSpace,
      showCreateGroupModal, setShowCreateGroupModal,
      showGroupSettingsModal, setShowGroupSettingsModal,
      showBulkShareModal, setShowBulkShareModal,
      showUploadModal, setShowUploadModal,
      
      // operations
      handleLogout,
      handleCreateSpace,
      handleUpdateSpace,
      handleCreatePost,
      uploadFiles,
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
      handleCreateGroup,
      handleDeleteSpace,
      handleRestoreSpace,
      handlePurgeSpace,
      deleteSelectedSpaces,
      restoreSelectedSpaces,
      purgeSelectedSpaces,

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
      active,
      toasts,
      removeToast,
      addToast,
      nextCursor,
      hasMore,
      isLoadingMore,
      loadMoreAssets
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
