export interface Asset {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  owner: string;
  uploadedAt: string | null;
  takenAt: string | null;
  relPath: string;
  playRelPath: string | null;
  hlsRelPath: string | null;
  processingStatus: 'ready' | 'processing' | 'failed' | string;
  processingStartedAt: string | null;
  processingFinishedAt: string | null;
  ext: string;
  albumName: string | null;
  albumNames: string[];
  docProjectName: string | null;
  docProjectNames: string[];
  tags: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  type: 'image' | 'video' | 'file' | string;
  version?: number;
  lastModifiedById?: string | null;
  ownerId?: string;
  groupId?: string | null;
}

export interface User {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
  mustChangePassword: boolean;
  avatarUrl?: string;
}

export interface Invitation {
  id: string;
  token: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Album {
  name: string;
  count: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface DocProject {
  name: string;
  count: number;
}
