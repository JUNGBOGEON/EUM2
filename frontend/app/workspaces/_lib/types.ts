export interface WorkspaceMember {
  id: string;
  name: string;
  profileImage?: string;
}

export interface WorkspaceOwner {
  id: string;
  name: string;
  profileImage?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  owner?: WorkspaceOwner;
  members?: WorkspaceMember[];
  thumbnail?: string;
  icon?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}
