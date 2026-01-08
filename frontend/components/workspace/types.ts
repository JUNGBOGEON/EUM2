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
  summaryStatus?: SummaryStatus;
  summaryS3Key?: string;
}

export interface SessionParticipant {
  id: string;
  userId: string;
  user?: UserInfo;
  role?: 'HOST' | 'PARTICIPANT';
  joinedAt?: string;
  leftAt?: string;
  durationSec?: number;
}

// 발화 스크립트 (트랜스크립션) 타입
export interface MeetingTranscription {
  id: string;
  speakerId?: string;
  speaker?: UserInfo;
  chimeAttendeeId?: string;
  originalText: string;
  startTimeMs: number;
  endTimeMs: number;
  relativeStartSec?: number;
  languageCode?: string;
  confidence?: number;
}

// 요약 상태 타입
export type SummaryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

// 회의 요약 타입
export interface MeetingSummary {
  status: SummaryStatus;
  content: string | null;
  presignedUrl: string | null;
}
