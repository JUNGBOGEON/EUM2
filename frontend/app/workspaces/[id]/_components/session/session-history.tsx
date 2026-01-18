'use client';

import { useState } from 'react';
import { Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { MeetingSession } from '../../_lib/types';
import { SessionCard } from './session-card';
import { SessionDetailModal } from './session-detail-modal';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <h2 className="text-sm font-medium text-neutral-400">{t('history.title')}</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-transparent">
              <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px] bg-white/5" />
                <Skeleton className="h-3 w-[150px] bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <h2 className="text-sm font-medium text-neutral-400">{t('history.title')}</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-neutral-500">
            <Clock className="h-6 w-6" />
          </div>
          <p className="text-neutral-500 font-medium">
            {t('history.empty')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
          <h2 className="text-sm font-medium text-neutral-400">{t('history.title')}</h2>
          <span className="text-xs text-neutral-500">{sessions.length} recorded</span>
        </div>

        <div className="space-y-1">
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
          <Button
            variant="ghost"
            className="w-full mt-4 text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5"
            onClick={onLoadMore}
          >
            {t('history.load_more')}
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
