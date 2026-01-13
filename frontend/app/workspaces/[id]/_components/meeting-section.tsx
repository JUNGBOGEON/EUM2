'use client';

import { useState } from 'react';
import { Video, Users, ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MeetingSession } from '../_lib/types';

interface MeetingSectionProps {
  activeSessions: MeetingSession[];
  onStartMeeting: (title?: string) => void;
  onJoinSession: (sessionId: string) => void;
  isStarting: boolean;
  isJoining: boolean;
}

import { useLanguage } from '@/contexts/LanguageContext';

export function MeetingSection({
  activeSessions,
  onStartMeeting,
  onJoinSession,
  isStarting,
  isJoining,
}: MeetingSectionProps) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const { t } = useLanguage();

  const handleStart = () => {
    onStartMeeting(meetingTitle.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isStarting) {
      handleStart();
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (hours > 0) {
      return t('meeting.duration_format')
        .replace('{hours}', hours.toString())
        .replace('{minutes}', minutes.toString());
    }
    return t('meeting.duration_format_min')
      .replace('{minutes}', minutes.toString());
  };

  return (
    <div className="space-y-8">
      {/* Active Sessions List */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('meeting.active_title')} ({activeSessions.length})
            </h3>
          </div>

          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 p-5 group hover:border-green-500/40 transition-colors"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Video className="h-6 w-6 text-green-500" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {session.title || t('meeting.active_title')}
                        </h4>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-none flex-shrink-0">
                          {t('meeting.live')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {session.participantCount || 1}
                        </span>
                        <span className="text-border">•</span>
                        <span>{formatDuration(session.startedAt)}</span>
                        {session.host && (
                          <>
                            <span className="text-border">•</span>
                            <span className="truncate">{t('sidebar.host')}: {session.host.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => onJoinSession(session.id)}
                    disabled={isJoining}
                    className="bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25 flex-shrink-0"
                  >
                    {isJoining ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {t('meeting.participating')}
                      </>
                    ) : (
                      <>
                        {t('meeting.join_btn')}
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start New Meeting */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('meeting.start_new')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('meeting.start_desc')}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Input
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('meeting.enter_title')}
            className="flex-1 h-12 text-base"
          />
          <Button
            size="lg"
            onClick={handleStart}
            disabled={isStarting}
            className="h-12 px-6"
          >
            {isStarting ? (
              <>
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                {t('meeting.starting')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('meeting.start_btn')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
