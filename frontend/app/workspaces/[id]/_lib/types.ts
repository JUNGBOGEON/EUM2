export interface Workspace {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  banner?: string;
  icon?: string;
  createdAt: string;
  updatedAt?: string;
  ownerId: string;
  owner?: WorkspaceOwner;
  members?: WorkspaceMember[];
}

export interface WorkspaceOwner {
  id: string;
  name: string;
  email?: string;
  profileImage?: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email?: string;
  profileImage?: string;
  isOnline?: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

export type SummaryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface MeetingSession {
  id: string;
  title: string;
  status: 'active' | 'ended';
  hostId: string;
  host?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  startedAt: string;
  endedAt?: string;
  participantCount?: number;
  summaryStatus?: SummaryStatus;
  summaryS3Key?: string;
}

export interface WorkspaceFile {
  id: string;
  filename: string;
  fileType: 'image' | 'document' | 'summary';
  mimeType: string;
  size: number;
  s3Key: string;
  createdAt: string;
  uploader?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}
