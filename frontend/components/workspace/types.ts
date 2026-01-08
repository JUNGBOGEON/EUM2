// 워크스페이스 관련 타입 정의

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members?: WorkspaceMember[];
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  user?: UserInfo;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

export interface MeetingSession {
  id: string;
  title?: string;
  workspaceId: string;
  hostId: string;
  host?: UserInfo;
  status: 'active' | 'ended';
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  participantCount?: number;
  participants?: SessionParticipant[];
}

export interface SessionParticipant {
  id: string;
  userId: string;
  user?: UserInfo;
  joinedAt?: string;
  leftAt?: string;
  durationSec?: number;
}
