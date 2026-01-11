/**
 * 날짜 포맷팅 유틸리티
 * 여러 컴포넌트에서 중복 사용되는 날짜 관련 함수들을 통합
 */

/**
 * 상대적 시간 표시 (예: "방금 전", "5분 전", "3시간 전")
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '방금 전';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '방금 전';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 0) return '방금 전';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (weeks < 4) return `${weeks}주 전`;

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/**
 * 날짜 포맷팅 (예: "1월 8일")
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 날짜+시간 포맷팅 (예: "1월 8일 오후 3:45")
 */
export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * 전체 날짜 포맷팅 (예: "2024년 1월 8일")
 */
export function formatFullDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 짧은 날짜 포맷팅 (예: "1월 8일")
 */
export function formatShortDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 오늘인지 확인하고 시간 또는 날짜 반환
 * 오늘이면 "오후 3:45", 아니면 "1월 8일"
 */
export function formatSmartDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * datetime-local input용 포맷 (예: "2024-01-08T15:45")
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 회의 시간 포맷팅 (mm:ss)
 */
export function formatTranscriptTime(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 회의 소요 시간 계산 (예: "1시간 30분", "45분")
 */
export function formatDuration(startedAt?: string, endedAt?: string): string {
  if (!startedAt || !endedAt) return '-';

  const start = new Date(startedAt);
  const end = new Date(endedAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';

  const diff = end.getTime() - start.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0
      ? `${hours}시간 ${remainingMinutes}분`
      : `${hours}시간`;
  }
  return `${minutes}분`;
}

/**
 * 진행 중인 회의 소요 시간 (예: "진행 중 (45분)")
 */
export function formatOngoingDuration(startedAt?: string): string {
  if (!startedAt) return '-';

  const start = new Date(startedAt);
  if (isNaN(start.getTime())) return '-';

  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  return `${minutes}분`;
}
