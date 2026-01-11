/**
 * 타입 정의 중앙 관리
 * 
 * 모든 공통 타입은 이 디렉토리에서 관리합니다.
 * 각 도메인별로 파일을 분리하여 관리하며,
 * 이 index.ts에서 모든 타입을 re-export합니다.
 * 
 * 사용법:
 * import type { User, Workspace, MeetingSession } from '@/lib/types';
 */

// User 관련 타입
export type { User, UserInfo, WorkspaceOwner } from './user';

// Workspace 관련 타입
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceMemberRole,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from './workspace';

// Meeting 관련 타입
export type {
  MeetingSession,
  MeetingTranscription,
  MeetingSummary,
  MeetingInfo,
  SessionParticipant,
  SessionStatus,
  ParticipantRole,
  SummaryStatus,
  TranscriptItem,
  ParticipantInfo,
  DeviceState,
  TranscriptionState,
  TranslatedTranscript,
  TranslationState,
  ChimeRosterAttendee,
} from './meeting';

// File 관련 타입
export type {
  WorkspaceFile,
  WorkspaceFileType,
  FileListResponse,
  FileDownloadResponse,
} from './file';
