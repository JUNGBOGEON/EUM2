'use client';

import { useState } from 'react';
import { Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { MeetingSession } from '../../_lib/types';
import { SessionCard } from './session-card';
import { SessionDetailModal } from './session-detail-modal';

interface SessionHistoryProps {
  sessions: MeetingSession[];
  isLoading: boolean;
  onViewSession: (session: MeetingSession) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function SessionHistory({
  sessions,
  isLoading,
  onViewSession,
  onLoadMore,
  hasMore,
}: SessionHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<MeetingSession | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">회의 기록</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">회의 기록</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Play className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            아직 진행된 회의가 없습니다
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            새 회의를 시작해 보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">회의 기록</h2>
            <Badge variant="secondary">{sessions.length}개</Badge>
          </div>
        </div>

        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={setSelectedSession}
            />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <Button variant="ghost" className="w-full" onClick={onLoadMore}>
            더 보기
          </Button>
        )}
      </div>

      {/* Session Detail Modal */}
      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </>
  );
}
