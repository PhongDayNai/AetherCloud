'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { useConfirm } from './ConfirmContext';
import { useToast } from './ToastContext';
import { useWorkspace } from './WorkspaceContext';
import { Asset, Album, Tag, DocProject } from '../types';
import {
  docTypeOf,
  docCategoryOf,
  DOC_CATEGORY_LABELS,
  monthLabel,
  yearLabel
} from '../lib/utils';

interface AssetContextType {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  anchorAssetId: string | null;
  setAnchorAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  showScrollAnchorBtn: boolean;
  setShowScrollAnchorBtn: React.Dispatch<React.SetStateAction<boolean>>;
  scrollToAnchor: () => void;
  tab: 'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces';
  setTab: React.Dispatch<React.SetStateAction<'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces'>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  spaceAssetsFiltered: Asset[];
  setSpaceAssetsFiltered: React.Dispatch<React.SetStateAction<Asset[]>>;
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

  loadAlbums: () => Promise<void>;
  loadDocProjects: () => Promise<void>;
  loadTags: () => Promise<void>;
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
  invalidateCacheAndReload: () => Promise<void>;

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
  nextCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreAssets: () => Promise<void>;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { language, t } = useLanguage();
  const confirm = useConfirm();
  const { addToast, setMsg } = useToast();
  const {
    api,
    activeWorkspace,
    setActiveWorkspace,
    stats,
    setStats,
    spaces,
    setSpaces,
    posts,
    setPosts,
    processingVideoIds,
    setProcessingVideoIds,
    loadData,
    albums,
    setAlbums,
    docProjects,
    setDocProjects,
    tags,
    setTags
  } = useWorkspace();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [photosCache, setPhotosCache] = useState<Record<string, { items: Asset[]; nextCursor: string | null; hasMore: boolean }>>({});
  const usedPhotosKeysRef = useRef<string[]>([]);
  const [docsCache, setDocsCache] = useState<Record<string, { items: Asset[]; nextCursor: string | null; hasMore: boolean }>>({});
  const usedDocsKeysRef = useRef<string[]>([]);

  const [anchorAssetId, setAnchorAssetId] = useState<string | null>(null);
  const [showScrollAnchorBtn, setShowScrollAnchorBtn] = useState<boolean>(false);
  const [tab, setTab] = useState<'photos' | 'docs' | 'dashboard' | 'space' | 'space-all' | 'spaces'>('dashboard');
  const [search, setSearch] = useState<string>('');
  const [spaceAssetsFiltered, setSpaceAssetsFiltered] = useState<Asset[]>([]);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState<boolean>(false);
  const [albumQuery, setAlbumQuery] = useState<string>('');
  const [selectedAlbumsForActive, setSelectedAlbumsForActive] = useState<string[]>([]);
  const [showDocProjectPicker, setShowDocProjectPicker] = useState<boolean>(false);
  const [docProjectQuery, setDocProjectQuery] = useState<string>('');
  const [selectedDocProjectsForActive, setSelectedDocProjectsForActive] = useState<string[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [selectedTagsForActive, setSelectedTagsForActive] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState<boolean>(false);
  const [tagQuery, setTagQuery] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docCategoryFilter, setDocCategoryFilterState] = useState<string[]>(['all']);

  const setDocCategoryFilter = (val: string[] | string | ((prev: string[]) => string[])) => {
    setDocCategoryFilterState((prev) => {
      if (typeof val === 'function') return val(prev);
      if (Array.isArray(val)) return val;
      return [val];
    });
  };

  const [docCollectionView, setDocCollectionView] = useState<'all' | 'recent' | 'trash'>('all');
  const [allFilesCollectionView, setAllFilesCollectionView] = useState<'all' | 'recent' | 'trash'>('all');
  const [docKindsExpanded, setDocKindsExpanded] = useState<boolean>(false);
  const [collectionView, setCollectionView] = useState<'all' | 'recent' | 'images' | 'videos' | 'trash'>('all');
  const [spacesSubTab, setSpacesSubTab] = useState<'active' | 'trash'>('active');
  const [albumsExpanded, setAlbumsExpanded] = useState<boolean>(false);
  const [docProjectsExpanded, setDocProjectsExpanded] = useState<boolean>(false);
  const [selectedDocProject, setSelectedDocProject] = useState<string>('all');
  const [groupByTimeEnabled, setGroupByTimeEnabled] = useState<boolean>(true);
  const [groupMode, setGroupMode] = useState<'month' | 'year'>('month');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeMediaFit, setActiveMediaFit] = useState<'contain-wide' | 'contain-tall'>('contain-wide');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const currentPhotosKey = useMemo(() => {
    const prefix = activeWorkspace.type === 'group' ? `group_${activeWorkspace.id}` : activeWorkspace.type === 'space' ? `space_${activeWorkspace.id}` : 'personal';
    const sortedTags = selectedFilterTags.slice().sort().join(',');
    return `${prefix}::${collectionView}::${selectedAlbum}::${sortedTags}`;
  }, [collectionView, selectedAlbum, selectedFilterTags, activeWorkspace]);

  const currentDocsKey = useMemo(() => {
    const prefix = activeWorkspace.type === 'group' ? `group_${activeWorkspace.id}` : activeWorkspace.type === 'space' ? `space_${activeWorkspace.id}` : 'personal';
    const sortedTags = selectedFilterTags.slice().sort().join(',');
    const sortedCats = docCategoryFilter.slice().sort().join(',');
    return `${prefix}::${sortedCats}::${docTypeFilter}::${selectedDocProject}::${docCollectionView}::${sortedTags}`;
  }, [docCategoryFilter, docTypeFilter, selectedDocProject, docCollectionView, selectedFilterTags, activeWorkspace]);

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

  const scrollToAnchor = () => {
    if (!anchorAssetId) return;
    const card = document.querySelector(`[data-id="${anchorAssetId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('glowHighlight');
      setTimeout(() => {
        card.classList.remove('glowHighlight');
      }, 2500);
    }
    setShowScrollAnchorBtn(false);
    setAnchorAssetId(null);
  };

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

  const handleLiveSync = (key: string, type: 'photos' | 'docs', syncItems: Asset[]) => {
    const isCurrentKey = (type === 'photos' && key === currentPhotosKey) || (type === 'docs' && key === currentDocsKey);
    const setCache = type === 'photos' ? setPhotosCache : setDocsCache;

    setCache((prev) => {
      if (!prev[key]) return prev;

      const oldItems = prev[key].items || [];
      const oldIds = new Set(oldItems.map((item) => item.id));
      const addedItems = syncItems.filter((item) => !oldIds.has(item.id));

      const syncItemMap = new Map(syncItems.map((item) => [item.id, item]));
      let hasUpdates = false;

      const updatedItems = oldItems.map((oldItem) => {
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

      const oldPageOneIds = new Set(oldItems.slice(0, 100).map((item) => item.id));
      const syncIds = new Set(syncItems.map((item) => item.id));
      const deletedIds = Array.from(oldPageOneIds).filter((id) => !syncIds.has(id));

      let nextItems = [...updatedItems];
      if (deletedIds.length > 0) {
        nextItems = nextItems.filter((item) => !deletedIds.includes(item.id));
      }

      if (addedItems.length > 0) {
        if (isCurrentKey) {
          setTimeout(() => {
            addToast(t('messages.liveSyncAdded', { count: addedItems.length }) || `Có ${addedItems.length} tệp tin mới vừa được cập nhật. Đang tiến hành đồng bộ ngầm...`, 'info');
          }, 0);

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

          setTimeout(() => {
            setCache((currentCache) => {
              if (!currentCache[key]) return currentCache;
              const currentItems = currentCache[key].items;
              const updatedCacheItems = [...addedItems, ...currentItems.filter((item) => !addedItems.some((a) => a.id === item.id))];
              return { ...currentCache, [key]: { ...currentCache[key], items: updatedCacheItems } };
            });

            setAssets((prevDisplay) => {
              const updatedDisplayItems = [...addedItems, ...prevDisplay.filter((item) => !addedItems.some((a) => a.id === item.id))];
              return updatedDisplayItems;
            });
          }, 1500);
        } else {
          nextItems = [...addedItems, ...nextItems.filter((item) => !addedItems.some((a) => a.id === item.id))];
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
      if (res.status === 403) {
        console.warn('[AssetContext] Access forbidden to group photos. Reverting to personal workspace.');
        setActiveWorkspace({ type: 'personal' });
        window.location.href = '/cloud/dashboard';
        return;
      }
      if (!res.ok) throw new Error(t('messages.loadDataFailed'));
      const data = await res.json();

      const fetchedItems = data.items || [];
      const newNextCursor = data.nextCursor || null;
      const newHasMore = !!data.nextCursor;

      setPhotosCache((prev) => {
        const prevEntry = prev[key] || { items: [], nextCursor: null, hasMore: false };
        const newItems = isAppend ? [...prevEntry.items, ...fetchedItems] : fetchedItems;

        let nextCache = {
          ...prev,
          [key]: { items: newItems, nextCursor: newNextCursor, hasMore: newHasMore }
        };

        if (Object.keys(nextCache).length > 15) {
          const oldestKey = usedPhotosKeysRef.current.find((k) => k !== key && prev[k]);
          if (oldestKey) {
            delete nextCache[oldestKey];
            usedPhotosKeysRef.current = usedPhotosKeysRef.current.filter((k) => k !== oldestKey);
          }
        }
        return nextCache;
      });

      if (key === currentPhotosKey) {
        setAssets((prev) => (isAppend ? [...prev, ...fetchedItems] : fetchedItems));
        setNextCursor(newNextCursor);
        setHasMore(newHasMore);
      }
    } catch (e: any) {
      addToast(e.message || t('messages.loadDataFailed') || "Tải dữ liệu thất bại", 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

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
      if (res.status === 403) {
        console.warn('[AssetContext] Access forbidden to group docs. Reverting to personal workspace.');
        setActiveWorkspace({ type: 'personal' });
        window.location.href = '/cloud/dashboard';
        return;
      }
      if (!res.ok) throw new Error(t('messages.loadDataFailed'));
      const data = await res.json();

      const fetchedItems = data.items || [];
      const newNextCursor = data.nextCursor || null;
      const newHasMore = !!data.nextCursor;

      setDocsCache((prev) => {
        const prevEntry = prev[key] || { items: [], nextCursor: null, hasMore: false };
        const newItems = isAppend ? [...prevEntry.items, ...fetchedItems] : fetchedItems;

        let nextCache = {
          ...prev,
          [key]: { items: newItems, nextCursor: newNextCursor, hasMore: newHasMore }
        };

        if (Object.keys(nextCache).length > 15) {
          const oldestKey = usedDocsKeysRef.current.find((k) => k !== key && prev[k]);
          if (oldestKey) {
            delete nextCache[oldestKey];
            usedDocsKeysRef.current = usedDocsKeysRef.current.filter((k) => k !== oldestKey);
          }
        }
        return nextCache;
      });

      if (key === currentDocsKey) {
        setAssets((prev) => (isAppend ? [...prev, ...fetchedItems] : fetchedItems));
        setNextCursor(newNextCursor);
        setHasMore(newHasMore);
      }
    } catch (e: any) {
      addToast(e.message || t('messages.loadDataFailed') || "Tải dữ liệu thất bại", 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadFilterPhotos = async (key: string) => {
    usedPhotosKeysRef.current = [...usedPhotosKeysRef.current.filter((k) => k !== key), key];
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

  const loadFilterDocs = async (key: string) => {
    usedDocsKeysRef.current = [...usedDocsKeysRef.current.filter((k) => k !== key), key];
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

  const loadMoreAssets = async () => {
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
        addToast(e.message || t('messages.loadMoreFailed') || "Tải thêm dữ liệu thất bại", 'error');
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const loadAlbums = async () => {
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
  };

  const loadDocProjects = async () => {
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
  };

  const loadTags = async () => {
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
  };

  const invalidateCacheAndReload = async () => {
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
  };

  const moveSelectedToTrash = async () => {
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
  };

  const restoreSelectedFromTrash = async () => {
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
  };

  const purgeSelectedForever = async () => {
    if (!selectedIds.length) return;
    const ok = await confirm(t('dialogs.deleteForeverConfirm', { count: selectedIds.length }), { isDanger: true });
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
  };

  const addSelectedToAlbum = async () => {
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
  };

  const addSelectedToDocProject = async () => {
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
  };

  const toggleAlbumSelection = (name: string) => {
    setSelectedAlbumsForActive((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const createNewAlbumInSelection = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setSelectedAlbumsForActive((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setAlbums((prev) => {
      if (prev.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  };

  const saveActiveAlbums = async () => {
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
  };

  const toggleDocProjectSelection = (name: string) => {
    setSelectedDocProjectsForActive((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const createNewDocProjectInSelection = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setSelectedDocProjectsForActive((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setDocProjects((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  };

  const saveActiveDocProjects = async () => {
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
  };

  const toggleTagSelection = (name: string) => {
    setSelectedTagsForActive((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const createNewTagInSelection = (name: string) => {
    const trimmed = (name || '').trim().toLowerCase();
    if (!trimmed) return;
    setSelectedTagsForActive((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setTags((prev) => {
      if (prev.some((tVal) => tVal.name.toLowerCase() === trimmed)) return prev;
      return [...prev, { name: trimmed, count: 0 }];
    });
  };

  const saveActiveTags = async () => {
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
  };

  const toggleFilterTag = (name: string) => {
    setSelectedFilterTags((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  // derived memos
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
    const activeFiles = filteredAssets.filter((a) => !a.isDeleted);
    if (allFilesCollectionView === 'recent') {
      return activeFiles.filter((a) => new Date(a.uploadedAt || 0).getTime() >= recentCutoff);
    }
    return activeFiles;
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
              newIds = newIds.filter((x) => x !== id);

              if (processingStatus === 'ready') {
                setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, processingStatus: 'ready' } : a)));
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

  // Lắng nghe event group-update để reload dữ liệu realtime
  useEffect(() => {
    const handleGroupUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, metadata } = customEvent.detail || {};

      if ((type === 'group_kick' || type === 'group_delete') && metadata && metadata.groupId) {
        const isCurrentGroup =
          (activeWorkspace && activeWorkspace.type === 'group' && activeWorkspace.id === metadata.groupId) ||
          (activeWorkspace && activeWorkspace.type === 'space' && activeWorkspace.groupId === metadata.groupId);

        if (isCurrentGroup) {
          console.log('[AssetContext] Group disbanded or user kicked, reverting to personal workspace');
          setActiveWorkspace({ type: 'personal' });
          window.location.href = '/cloud/dashboard';
          return;
        }
      }

      loadData(true);
    };
    window.addEventListener('group-update', handleGroupUpdate);
    return () => {
      window.removeEventListener('group-update', handleGroupUpdate);
    };
  }, [activeWorkspace, loadData]);

  return (
    <AssetContext.Provider value={{
      assets, setAssets, anchorAssetId, setAnchorAssetId, showScrollAnchorBtn, setShowScrollAnchorBtn,
      scrollToAnchor, tab, setTab, search, setSearch, spaceAssetsFiltered, setSpaceAssetsFiltered,
      selectionMode, setSelectionMode, selectedIds, setSelectedIds, activeIndex, setActiveIndex,
      showInfo, setShowInfo, showAlbumPicker, setShowAlbumPicker, albumQuery, setAlbumQuery,
      selectedAlbumsForActive, setSelectedAlbumsForActive, showDocProjectPicker, setShowDocProjectPicker,
      docProjectQuery, setDocProjectQuery, selectedDocProjectsForActive, setSelectedDocProjectsForActive,
      selectedFilterTags, setSelectedFilterTags, selectedTagsForActive, setSelectedTagsForActive,
      showTagPicker, setShowTagPicker, tagQuery, setTagQuery, docTypeFilter, setDocTypeFilter,
      docCategoryFilter, setDocCategoryFilter, docCollectionView, setDocCollectionView,
      allFilesCollectionView, setAllFilesCollectionView, docKindsExpanded, setDocKindsExpanded,
      collectionView, setCollectionView, spacesSubTab, setSpacesSubTab, albumsExpanded, setAlbumsExpanded,
      docProjectsExpanded, setDocProjectsExpanded, selectedDocProject, setSelectedDocProject,
      groupByTimeEnabled, setGroupByTimeEnabled, groupMode, setGroupMode, expandedGroups, setExpandedGroups,
      activeMediaFit, setActiveMediaFit,

      loadAlbums, loadDocProjects, loadTags, moveSelectedToTrash, restoreSelectedFromTrash,
      purgeSelectedForever, addSelectedToAlbum, addSelectedToDocProject, toggleAlbumSelection,
      createNewAlbumInSelection, saveActiveAlbums, toggleDocProjectSelection, createNewDocProjectInSelection,
      saveActiveDocProjects, toggleTagSelection, createNewTagInSelection, saveActiveTags, toggleFilterTag,
      invalidateCacheAndReload,

      filteredAssets, basePhotoAssets, recentCutoff, photoAssets, docs, trashedDocs, docsBase,
      docTypes, docsFiltered, allActiveAssets, allActiveAssetsGrouped, spaceAssets, spaceAssetsGrouped,
      docCategoryCounts, docsGrouped, selectedAlbum, setSelectedAlbum, availableAlbums,
      albumFilteredPhotos, photoGroups, active, nextCursor, hasMore, isLoadingMore, loadMoreAssets
    }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets(): AssetContextType {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
}
