/**
 * API 클라이언트
 * 
 * 중앙화된 HTTP 클라이언트로 모든 API 요청을 처리합니다.
 * - 일관된 에러 핸들링
 * - 자동 인증 토큰 처리
 * - 요청/응답 인터셉터
 */

import { ApiError, NetworkError } from '@/lib/utils/error';
import { API_URL, config } from '@/lib/config';

/**
 * API 요청 옵션
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON 바디 (자동으로 직렬화됨) */
  body?: unknown;
  /** URL 쿼리 파라미터 */
  params?: Record<string, string | number | boolean | undefined>;
  /** 인증 건너뛰기 */
  skipAuth?: boolean;
  /** 타임아웃 (ms) */
  timeout?: number;
}

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
}

/**
 * 쿼리 파라미터를 URL에 추가
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_URL}/api${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * API 요청 실행
 */
async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    body,
    params,
    skipAuth = false,
    timeout = 30000,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  const url = buildUrl(endpoint, params);

  // 헤더 구성
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // 요청 구성
  const config: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: skipAuth ? 'omit' : 'include',
  };

  // 바디 처리
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  // 타임아웃 처리
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // 에러 응답 처리
    if (!response.ok) {
      let errorData: { message?: string; code?: string; details?: Record<string, unknown> } = {};
      
      try {
        errorData = await response.json();
      } catch {
        // JSON 파싱 실패 시 무시
      }

      throw new ApiError(
        errorData.message || `API Error: ${response.status}`,
        response.status,
        errorData.code,
        errorData.details
      );
    }

    // 204 No Content 처리
    if (response.status === 204) {
      return undefined as T;
    }

    // JSON 응답 파싱
    const data = await response.json();
    return data as T;

  } catch (error) {
    clearTimeout(timeoutId);

    // 이미 ApiError인 경우 그대로 throw
    if (error instanceof ApiError) {
      throw error;
    }

    // 타임아웃 에러
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('요청 시간이 초과되었습니다.');
    }

    // 네트워크 에러
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError();
    }

    // 기타 에러
    throw error;
  }
}

/**
 * API 클라이언트
 * 
 * @example
 * // GET 요청
 * const user = await apiClient.get<User>('/auth/me');
 * 
 * // POST 요청
 * const workspace = await apiClient.post<Workspace>('/workspaces', { name: 'My Workspace' });
 * 
 * // 쿼리 파라미터와 함께
 * const files = await apiClient.get<FileListResponse>('/files', { params: { type: 'image', limit: 10 } });
 */
export const apiClient = {
  /**
   * GET 요청
   */
  get<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST 요청
   */
  post<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  /**
   * PUT 요청
   */
  put<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  /**
   * PATCH 요청
   */
  patch<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  /**
   * DELETE 요청
   */
  delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * 파일 업로드 (multipart/form-data)
   */
  async upload<T>(endpoint: string, formData: FormData, options?: Omit<ApiRequestOptions, 'method' | 'body' | 'headers'>): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Content-Type은 자동으로 설정됨 (boundary 포함)
    });

    if (!response.ok) {
      let errorData: { message?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // ignore
      }
      throw new ApiError(
        errorData.message || `Upload Error: ${response.status}`,
        response.status
      );
    }

    return response.json();
  },
};

/**
 * API URL 가져오기 (외부 링크용)
 */
export function getApiUrl(path = ''): string {
  return `${API_URL}${path}`;
}

export default apiClient;
