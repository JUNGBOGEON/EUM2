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
  roleId?: string;
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
  category?: string;
  maxParticipants?: number;
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
  participants?: {
    id: string;
    userId: string;
    user?: {
      id: string;
      name: string;
      profileImage?: string;
    };
  }[];
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

// AI 요약 구조화 타입
export interface StructuredSummary {
  markdown: string;
  sections: SummarySection[];
}

export interface SummarySection {
  id: string;
  type: 'title' | 'summary' | 'agenda' | 'decision' | 'action_item' | 'note' | 'unresolved' | 'data';
  content: string;
  transcriptRefs: string[];
}

// 자막/발화 기록 타입
export interface TranscriptItem {
  id: string;
  resultId: string;
  originalText: string;
  relativeStartSec?: number;
  speaker?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

// 요약 응답 타입
export interface SummaryResponse {
  status: SummaryStatus;
  content: string | null;
  structuredSummary: StructuredSummary | null;
  presignedUrl: string | null;
}

// 반복 타입
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

// 워크스페이스 이벤트 타입 (커스텀 가능)
export interface WorkspaceEventType {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  icon?: string;
  isDefault: boolean;
  order: number;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 워크스페이스 이벤트
export interface WorkspaceEvent {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  eventTypeId?: string;
  eventType?: WorkspaceEventType;
  color?: string;
  startTime: string;
  endTime?: string;
  isAllDay: boolean;
  recurrence: RecurrenceType;
  recurrenceEndDate?: string;
  reminderMinutes?: number;
  meetingSessionId?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 이벤트 생성 DTO
export interface CreateEventDto {
  title: string;
  description?: string;
  eventTypeId?: string;
  color?: string;
  startTime: string;
  endTime?: string;
  isAllDay?: boolean;
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string;
  reminderMinutes?: number;
  meetingSessionId?: string;
}

// 이벤트 수정 DTO
export interface UpdateEventDto extends Partial<CreateEventDto> { }

// 이벤트 타입 생성 DTO
export interface CreateEventTypeDto {
  name: string;
  color: string;
  icon?: string;
}

// 이벤트 타입 수정 DTO
export interface UpdateEventTypeDto {
  name?: string;
  color?: string;
  icon?: string;
  order?: number;
}
