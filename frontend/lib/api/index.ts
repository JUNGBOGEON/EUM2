/**
 * API 모듈 중앙 진입점
 * 
 * @example
 * import { apiClient, authApi, workspacesApi } from '@/lib/api';
 * 
 * // 직접 API 호출
 * const user = await apiClient.get<User>('/auth/me');
 * 
 * // 도메인별 API 사용
 * const workspaces = await workspacesApi.list();
 */

// 클라이언트
export { apiClient, getApiUrl } from './client';
export type { ApiRequestOptions, ApiResponse } from './client';

// 도메인별 API
export {
  authApi,
  workspacesApi,
  invitationsApi,
  meetingsApi,
  filesApi,
  usersApi,
} from './endpoints';

// 하위 호환성을 위한 레거시 export
// @deprecated - 새 코드에서는 위의 모듈화된 API를 사용하세요
export { apiClient as default } from './client';
