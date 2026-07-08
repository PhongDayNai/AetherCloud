'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from './LanguageContext';
import { useConfirm } from './ConfirmContext';
import { useToast } from './ToastContext';
import { User, Album, Tag, DocProject } from '../types';
import { getApiOrigin } from '../lib/utils';

interface WorkspaceContextType {
  api: string;
  stats: any;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  usage: any;
  setUsage: React.Dispatch<React.SetStateAction<any>>;
  activeWorkspace: { type: 'personal' } | { type: 'group'; id: string; name: string; role: 'owner' | 'admin' | 'member' } | { type: 'space'; id: string; name: string; spaceType: string; groupId?: string };
  setActiveWorkspace: React.Dispatch<React.SetStateAction<{ type: 'personal' } | { type: 'group'; id: string; name: string; role: 'owner' | 'admin' | 'member' } | { type: 'space'; id: string; name: string; spaceType: string; groupId?: string }>>;
  spaces: any[];
  setSpaces: React.Dispatch<React.SetStateAction<any[]>>;
  posts: any[];
  setPosts: React.Dispatch<React.SetStateAction<any[]>>;
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
  docProjects: DocProject[];
  setDocProjects: React.Dispatch<React.SetStateAction<DocProject[]>>;
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  albums: Album[];
  setAlbums: React.Dispatch<React.SetStateAction<Album[]>>;

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

  handleLogout: () => Promise<void>;
  handleCreateSpace: (name: string, type: 'journal' | 'collection' | 'project', description: string) => Promise<boolean>;
  handleUpdateSpace: (id: string, name: string, type: 'journal' | 'collection' | 'project', description: string) => Promise<boolean>;
  handleDeleteSpace: (id: string) => Promise<boolean>;
  handleRestoreSpace: (id: string) => Promise<boolean>;
  handlePurgeSpace: (id: string) => Promise<boolean>;
  deleteSelectedSpaces: (ids: string[]) => Promise<void>;
  restoreSelectedSpaces: (ids: string[]) => Promise<void>;
  purgeSelectedSpaces: (ids: string[]) => Promise<void>;
  handleCreateGroup: (name: string) => Promise<boolean>;
  loadData: (isBackground?: boolean) => Promise<void>;
  handleCreatePost: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const { language, t } = useLanguage();
  const confirm = useConfirm();
  const { addToast, setErr } = useToast();
  const api = useMemo(() => getApiOrigin(), []);

  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [postCaption, setPostCaption] = useState<string>('');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [processingVideoIds, setProcessingVideoIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [docProjects, setDocProjects] = useState<DocProject[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  const [activeWorkspace, setActiveWorkspace] = useState<{ type: 'personal' } | { type: 'group'; id: string; name: string; role: 'owner' | 'admin' | 'member' } | { type: 'space'; id: string; name: string; spaceType: string; groupId?: string }>({ type: 'personal' });

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
      addToast(t('spaces.creating') || "Đang tạo không gian con...", 'info');
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
      addToast(t('spaces.createSuccess') || "Đã tạo không gian con thành công!", 'info');
      return true;
    } catch (e: any) {
      setErr(e.message || t('spaces.createErr') || "Lỗi tạo không gian");
      throw e;
    }
  }

  async function handleUpdateSpace(id: string, name: string, type: 'journal' | 'collection' | 'project', description: string): Promise<boolean> {
    try {
      addToast(t('spaces.updating') || "Đang cập nhật không gian con...", 'info');
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
      addToast(t('spaces.updateSuccess') || "Đã cập nhật không gian con thành công!", 'info');
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

  async function deleteSelectedSpaces(ids: string[]): Promise<void> {
    try {
      const results = await Promise.all(ids.map(id => fetch(`${api}/api/spaces/${id}`, { method: 'DELETE', credentials: 'include' })));
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(t('spaces.deleteSomeFailed') || 'Một số không gian con không xóa được');
      setSpaces(prev => prev.filter(s => !ids.includes(s.id)));
      addToast(t('spaces.deleteSuccess'), 'info');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  }

  async function restoreSelectedSpaces(ids: string[]): Promise<void> {
    try {
      const results = await Promise.all(ids.map(id => fetch(`${api}/api/spaces/${id}/restore`, { method: 'POST', credentials: 'include' })));
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(t('spaces.restoreSomeFailed') || 'Một số không gian con không khôi phục được');
      loadData(true);
      addToast(t('spaces.restoreSuccess'), 'info');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  }

  async function purgeSelectedSpaces(ids: string[]): Promise<void> {
    try {
      const results = await Promise.all(ids.map(id => fetch(`${api}/api/spaces/${id}/purge`, { method: 'DELETE', credentials: 'include' })));
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(t('spaces.purgeSomeFailed') || 'Một số không gian con không dọn sạch được');
      loadData(true);
      addToast(t('spaces.purgeSuccess'), 'info');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  }

  async function handleCreateGroup(name: string): Promise<boolean> {
    try {
      addToast(t('groups.creating') || 'Đang tạo nhóm...', 'info');
      const res = await fetch(`${api}/api/groups`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || t('groups.createFailed'));
      }
      const data = await res.json();
      setGroups(prev => [data.group, ...prev]);
      addToast(t('groups.createSuccess') || 'Đã tạo nhóm thành công!', 'info');
      return true;
    } catch (e: any) {
      setErr(e.message);
      return false;
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

      // Fetch groups
      const groupsRes = await fetch(`${api}/api/groups`, { credentials: 'include' });
      let groupsList = [];
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        groupsList = groupsData.groups || [];
        setGroups(groupsList);
      }

      // Sync active workspace role dynamically
      if (activeWorkspace.type === 'group') {
        const currentGroup = groupsList.find((g: any) => g.id === activeWorkspace.id);
        if (currentGroup) {
          if (currentGroup.role !== activeWorkspace.role) {
            setActiveWorkspace({
              type: 'group',
              id: currentGroup.id,
              name: currentGroup.name,
              role: currentGroup.role
            });
          }
        }
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
      if (statsRes.status === 403 || spacesRes.status === 403) {
        console.warn('[WorkspaceContext] Access forbidden to group resources. Reverting to personal workspace.');
        setActiveWorkspace({ type: 'personal' });
        window.location.href = '/cloud/dashboard';
        return;
      }
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
        if (postsRes.status === 403) {
          console.warn('[WorkspaceContext] Access forbidden to space. Reverting to personal workspace.');
          setActiveWorkspace({ type: 'personal' });
          window.location.href = '/cloud/dashboard';
          return;
        }
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        }
      }

      // Fetch processing videos
      const processingUrl = gId ? `${api}/api/assets/processing?groupId=${gId}` : `${api}/api/assets/processing`;
      const procRes = await fetch(processingUrl, { credentials: 'include' });
      if (procRes.status === 403) {
        console.warn('[WorkspaceContext] Access forbidden to processing videos. Reverting to personal workspace.');
        setActiveWorkspace({ type: 'personal' });
        window.location.href = '/cloud/dashboard';
        return;
      }
      if (procRes.ok) {
        const procData = await procRes.json();
        setProcessingVideoIds(procData.ids || []);
      }
    } catch (e: any) {
      setErr(e.message || t('messages.loadDataFailed'));
    }
  }

  async function handleCreatePost() {
    if (activeWorkspace.type !== 'space') return;
    try {
      setIsRefreshing(true);
      const formData = new FormData();
      formData.append('caption', postCaption.trim());
      postFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('saveToPersonal', String(saveToPersonalPost));

      const r = await fetch(`${api}/api/spaces/${activeWorkspace.id}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || t('posts.createFailed'));
      }
      setPostCaption('');
      setPostFiles([]);
      addToast(t('posts.createSuccess') || 'Đăng bài thành công!', 'info');
      await loadData(true);
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  }

  // Load initial profile & groups
  useEffect(() => {
    loadData();
  }, [activeWorkspace.type, activeWorkspace.type === 'group' ? (activeWorkspace as any).id : '', activeWorkspace.type === 'space' ? (activeWorkspace as any).id : '']);

  // Listen to group updates from socket server
  useEffect(() => {
    const handleGroupUpdate = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, metadata } = customEvent.detail || {};
      
      // Reload groups and workspace details
      await loadData(true);

      if (metadata && metadata.groupId) {
        const { groupId } = metadata;
        const isActiveGroup = 
          (activeWorkspace.type === 'group' && activeWorkspace.id === groupId) ||
          (activeWorkspace.type === 'space' && activeWorkspace.groupId === groupId);

        if (isActiveGroup) {
          // 1. Kick out of group: redirect immediately and show error toast
          if (type === 'group_kick') {
            addToast(t('groups.error.noPermission') || 'Bạn không còn quyền truy cập nhóm này.', 'error');
            setActiveWorkspace({ type: 'personal' });
            router.push('/cloud/dashboard');
          }
        }
      }
    };

    window.addEventListener('group-update', handleGroupUpdate);
    return () => {
      window.removeEventListener('group-update', handleGroupUpdate);
    };
  }, [activeWorkspace, loadData, addToast, t, router]);

  return (
    <WorkspaceContext.Provider value={{
      api, stats, setStats, usage, setUsage, activeWorkspace, setActiveWorkspace,
      spaces, setSpaces, posts, setPosts, postCaption, setPostCaption, postFiles, setPostFiles,
      saveToPersonalPost, setSaveToPersonalPost, groups, setGroups,
      saveToPersonalGroupUpload, setSaveToPersonalGroupUpload, processingVideoIds, setProcessingVideoIds,
      isRefreshing, setIsRefreshing, docProjects, setDocProjects, tags, setTags, albums, setAlbums,
      showProfileMenu, setShowProfileMenu, user, setUser, showSettingsModal, setShowSettingsModal,
      mustChangePassword, setMustChangePassword, showCreateSpaceModal, setShowCreateSpaceModal,
      showEditSpaceModal, setShowEditSpaceModal, editingSpace, setEditingSpace,
      showCreateGroupModal, setShowCreateGroupModal, showGroupSettingsModal, setShowGroupSettingsModal,
      showBulkShareModal, setShowBulkShareModal, showUploadModal, setShowUploadModal,
      handleLogout, handleCreateSpace, handleUpdateSpace, handleDeleteSpace, handleRestoreSpace,
      handlePurgeSpace, deleteSelectedSpaces, restoreSelectedSpaces, purgeSelectedSpaces,
      handleCreateGroup, loadData, handleCreatePost
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
