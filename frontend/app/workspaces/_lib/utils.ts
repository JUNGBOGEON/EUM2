export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '방금 전';

  // Parse the date - handle both ISO format and other formats
  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return '방금 전';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Handle negative diff (future dates or timezone issues)
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
