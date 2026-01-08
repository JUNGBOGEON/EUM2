/**
 * 타임스탬프를 한국어 시간 형식으로 포맷팅
 */
export function formatTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
