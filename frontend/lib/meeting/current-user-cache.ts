/**
 * 현재 사용자 정보를 동기적으로 저장하고 조회하기 위한 모듈 레벨 캐시
 * React state의 비동기 업데이트 문제를 해결하기 위해 사용
 */

interface CurrentUserInfo {
  attendeeId: string | null;
  name: string | null;
  profileImage: string | null;
}

// 모듈 레벨 변수 - 즉시 접근 가능
let currentUserCache: CurrentUserInfo = {
  attendeeId: null,
  name: null,
  profileImage: null,
};

/**
 * 현재 사용자 정보 설정 (동기적)
 */
export function setCurrentUserCache(info: Partial<CurrentUserInfo>): void {
  currentUserCache = {
    ...currentUserCache,
    ...info,
  };
  console.log('[CurrentUserCache] Updated:', currentUserCache);
}

/**
 * 현재 사용자 정보 가져오기 (동기적)
 */
export function getCurrentUserCache(): CurrentUserInfo {
  return currentUserCache;
}

/**
 * 현재 사용자 정보 초기화
 */
export function clearCurrentUserCache(): void {
  currentUserCache = {
    attendeeId: null,
    name: null,
    profileImage: null,
  };
  console.log('[CurrentUserCache] Cleared');
}

/**
 * attendeeId가 현재 사용자인지 확인
 */
export function isCurrentUser(attendeeId: string): boolean {
  return currentUserCache.attendeeId === attendeeId && currentUserCache.attendeeId !== null;
}
