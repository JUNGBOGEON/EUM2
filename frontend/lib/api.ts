/**
 * API 모듈 진입점
 * 
 * 이 파일은 @/lib/api로 import할 때의 진입점입니다.
 * 새로운 API 클라이언트와 도메인별 API를 제공합니다.
 * 
 * @example
 * // 새로운 방식 (권장)
 * import { apiClient, authApi, workspacesApi, meetingsApi, filesApi } from '@/lib/api';
 * 
 * const workspaces = await workspacesApi.list();
 * const summary = await meetingsApi.getSummary(sessionId);
 */

// 새 API 모듈에서 re-export
export { apiClient, getApiUrl } from './api/client';
export type { ApiRequestOptions, ApiResponse } from './api/client';

// 도메인별 API
export {
  authApi,
  workspacesApi,
  invitationsApi,
  meetingsApi,
  filesApi,
  usersApi,
} from './api/endpoints';

// 레거시 타입 re-export
export type { User, Workspace, CreateWorkspaceDto } from './types';

// 레거시 fetchApi 함수 (하위 호환)
import { API_URL } from './config';

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// 레거시 api 객체 (하위 호환)
export const api = {
  auth: {
    me: () => fetchApi<import('./types').User>('/auth/me'),
    logout: () => fetchApi<{ message: string }>('/auth/logout'),
    getGoogleAuthUrl: () => `${API_URL}/api/auth/google`,
  },
  workspaces: {
    list: () => fetchApi<import('./types').Workspace[]>('/workspaces'),
    create: (data: import('./types').CreateWorkspaceDto) =>
      fetchApi<import('./types').Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => fetchApi<import('./types').Workspace>(`/workspaces/${id}`),
    delete: (id: string) =>
      fetchApi<void>(`/workspaces/${id}`, {
        method: 'DELETE',
      }),
  },
};
