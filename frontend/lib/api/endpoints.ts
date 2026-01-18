/**
 * API 엔드포인트 정의
 * 
 * 도메인별로 API 호출 함수를 정의합니다.
 */

import { apiClient, getApiUrl } from './client';
import type {
  User,
  Workspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  MeetingSession,
  MeetingSummary,
  WorkspaceFile,
  FileListResponse,
  FileDownloadResponse,
  WorkspaceEvent,
} from '@/lib/types';

/**
 * 인증 API
 */
export const authApi = {
  /** 현재 사용자 정보 */
  me: () => apiClient.get<User>('/auth/me'),

  /** 로그아웃 */
  logout: () => apiClient.post<{ message: string }>('/auth/logout'),

  /** Google OAuth URL */
  getGoogleAuthUrl: () => getApiUrl('/api/auth/google'),
};

/**
 * 워크스페이스 API
 */
export const workspacesApi = {
  /** 워크스페이스 목록 */
  list: () => apiClient.get<Workspace[]>('/workspaces'),

  /** 워크스페이스 상세 */
  get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`),

  /** 워크스페이스 생성 */
  create: (data: CreateWorkspaceDto) =>
    apiClient.post<Workspace>('/workspaces', data),

  /** 워크스페이스 수정 */
  update: (id: string, data: UpdateWorkspaceDto) =>
    apiClient.patch<Workspace>(`/workspaces/${id}`, data),

  /** 워크스페이스 삭제 */
  delete: (id: string) => apiClient.delete<void>(`/workspaces/${id}`),

  /** 멤버 추방 */
  kickMember: (workspaceId: string, memberId: string) =>
    apiClient.delete<void>(`/workspaces/${workspaceId}/members/${memberId}`),

  /** 워크스페이스 나가기 */
  leave: (workspaceId: string) =>
    apiClient.post<void>(`/workspaces/${workspaceId}/leave`),
};

/**
 * 초대 API
 */
export const invitationsApi = {
  /** 초대 생성 */
  create: (workspaceId: string, userIds: string[], message?: string) =>
    apiClient.post<{ invitations: unknown[] }>(`/workspaces/${workspaceId}/invitations`, {
      userIds,
      message,
    }),

  /** 내 대기중인 초대 목록 */
  myPending: () => apiClient.get<unknown[]>('/invitations/me/pending'),

  /** 초대 응답 (수락/거절) */
  respond: (invitationId: string, accept: boolean) =>
    apiClient.post<{ message: string }>(`/invitations/${invitationId}/respond`, { accept }),

  /** 초대 취소 */
  cancel: (workspaceId: string, invitationId: string) =>
    apiClient.delete<void>(`/workspaces/${workspaceId}/invitations/${invitationId}`),
};

/**
 * 미팅/세션 API
 */
export const meetingsApi = {
  /** 내 캘린더 (전체 워크스페이스 일정) */
  getMyCalendar: () =>
    apiClient.get<WorkspaceEvent[]>('/meetings/my-calendar'),

  /** 내 아카이브 (전체 워크스페이스 종료된 미팅) */
  getMyArchives: () =>
    apiClient.get<MeetingSession[]>('/meetings/my-archives'),

  /** 세션 시작 */
  start: (workspaceId: string, title?: string) =>
    apiClient.post<{
      meeting: unknown;
      attendee: unknown;
      session: MeetingSession;
    }>(`/meetings/workspaces/${workspaceId}/sessions/start`, { title }),

  /** 세션 참가 */
  join: (sessionId: string) =>
    apiClient.post<{
      meeting: unknown;
      attendee: unknown;
      session: MeetingSession;
    }>(`/meetings/sessions/${sessionId}/join`),

  /** 세션 나가기 */
  leave: (sessionId: string) =>
    apiClient.post<void>(`/meetings/sessions/${sessionId}/leave`),

  /** 세션 종료 */
  end: (sessionId: string) =>
    apiClient.post<void>(`/meetings/sessions/${sessionId}/end`),

  /** 세션 정보 */
  getSession: (sessionId: string) =>
    apiClient.get<MeetingSession>(`/meetings/sessions/${sessionId}`),

  /** 활성 세션 */
  getActiveSession: (workspaceId: string) =>
    apiClient.get<MeetingSession | null>(`/meetings/workspaces/${workspaceId}/active-session`),

  /** 세션 히스토리 */
  getHistory: (workspaceId: string) =>
    apiClient.get<MeetingSession[]>(`/meetings/workspaces/${workspaceId}/sessions`),

  /** 참가자 목록 */
  getParticipants: (sessionId: string) =>
    apiClient.get<unknown[]>(`/meetings/sessions/${sessionId}/participants`),

  /** 요약 조회 */
  getSummary: (sessionId: string) =>
    apiClient.get<MeetingSummary>(`/meetings/sessions/${sessionId}/summary`),

  /** 요약 재생성 */
  regenerateSummary: (sessionId: string) =>
    apiClient.post<{ message: string }>(`/meetings/sessions/${sessionId}/summary/regenerate`),

  /** 트랜스크립션 저장 */
  saveTranscription: (sessionId: string, data: unknown) =>
    apiClient.post<void>(`/meetings/sessions/${sessionId}/transcriptions`, data),

  /** 트랜스크립션 일괄 저장 */
  saveTranscriptionBatch: (sessionId: string, items: unknown[]) =>
    apiClient.post<void>(`/meetings/sessions/${sessionId}/transcriptions/batch`, { items }),
};

/**
 * 파일 API
 */
export const filesApi = {
  /** 파일 목록 */
  list: (workspaceId: string, options?: { type?: string; cursor?: string; limit?: number }) =>
    apiClient.get<FileListResponse>(`/workspaces/${workspaceId}/files`, { params: options }),

  /** 파일 업로드 */
  upload: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<WorkspaceFile>(`/workspaces/${workspaceId}/files`, formData);
  },

  /** 파일 다운로드 URL */
  getDownloadUrl: (workspaceId: string, fileId: string) =>
    apiClient.get<FileDownloadResponse>(`/workspaces/${workspaceId}/files/${fileId}/download`),

  /** 파일 삭제 */
  delete: (workspaceId: string, fileId: string) =>
    apiClient.delete<void>(`/workspaces/${workspaceId}/files/${fileId}`),
};

/**
 * 사용자 검색 API
 */
export const usersApi = {
  /** 사용자 검색 */
  search: (query: string) =>
    apiClient.get<User[]>('/users/search', { params: { q: query } }),
};
