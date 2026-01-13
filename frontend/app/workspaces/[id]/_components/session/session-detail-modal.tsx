'use client';

import { useState } from 'react';
import { Users, Download, Eye, Calendar, Timer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MeetingSession } from '../../_lib/types';
import { SummarySection } from './summary-section';
import { TranscriptSection } from './transcript-section';
import { SummaryFullView } from '../summary-full-view';
import { useSessionData, type SessionDetail, type SummaryData, type LocalTranscriptItem } from './hooks/use-session-data';

interface SessionDetailModalProps {
  session: MeetingSession | null;
  onClose: () => void;
}

// ... imports
import { useLanguage } from '@/contexts/LanguageContext';

const formatFullDate = (dateStr: string, locale: string = 'ko-KR') => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const { language, t } = useLanguage();

  // Map language code to locale for date formatting
  const getLocale = (lang: string) => {
    switch (lang) {
      case 'en': return 'en-US';
      case 'ja': return 'ja-JP';
      case 'zh-CN': return 'zh-CN';
      default: return 'ko-KR';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return t('summary.duration_hours')
        .replace('{hours}', hours.toString())
        .replace('{minutes}', (minutes % 60).toString());
    }
    return t('summary.duration_minutes')
      .replace('{minutes}', minutes.toString());
  };

  const {
    sessionDetail,
    transcripts,
    summaryData,
    isLoadingTranscripts,
    isLoadingSummary,
    isRegeneratingSummary,
    handleRegenerateSummary,
  } = useSessionData({ session });

  if (!session) return null;

  return (
    <>
      <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="!max-w-5xl w-[95vw] h-[85vh] p-0 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border flex-shrink-0">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl">
                {session.title || t('meeting.enter_title')}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {formatFullDate(session.startedAt, getLocale(language))}
              </DialogDescription>
            </DialogHeader>

            {/* Meeting Stats - Horizontal */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatDuration(session.startedAt, session.endedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {sessionDetail?.participants?.length || session.participantCount || 1}{t('sidebar.members')}
                </span>
              </div>
              {summaryData?.status === 'completed' && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">
                  {t('summary.completed')}
                </Badge>
              )}
              {(summaryData?.status === 'pending' || summaryData?.status === 'processing') && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {t('summary.creating')}
                </Badge>
              )}
              {summaryData?.status === 'failed' && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-none">
                  {t('summary.failed')}
                </Badge>
              )}
              {transcripts.length > 0 && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none">
                  {t('history.title')} {transcripts.length}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Tabs defaultValue="summary" className="h-full flex flex-col">
              <div className="px-6 pt-4 flex-shrink-0">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="summary">{t('meeting.title')}</TabsTrigger>
                  <TabsTrigger value="transcript">{t('summary.full_content')}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="summary" className="flex-1 min-h-0 mt-0 px-6 pb-6 overflow-hidden">
                <ScrollArea className="h-full">
                  <SummarySection
                    summaryData={summaryData}
                    transcriptCount={transcripts.length}
                    isLoading={isLoadingSummary}
                    isRegenerating={isRegeneratingSummary}
                    onRegenerate={handleRegenerateSummary}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transcript" className="flex-1 min-h-0 mt-0 px-6 pb-6 overflow-hidden">
                <ScrollArea className="h-full">
                  <TranscriptSection
                    transcripts={transcripts}
                    sessionStartedAt={session.startedAt}
                    isLoading={isLoadingTranscripts}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border bg-muted/30 flex-shrink-0">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {t('summary.download')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setIsFullViewOpen(true)}
                disabled={!summaryData?.structuredSummary}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('summary.view_all')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Full View Modal */}
      {isFullViewOpen && summaryData?.structuredSummary && (
        <SummaryFullView
          isOpen={isFullViewOpen}
          onClose={() => setIsFullViewOpen(false)}
          session={session}
          structuredSummary={summaryData.structuredSummary}
          transcripts={transcripts.map((t, idx) => ({
            id: t.id,
            resultId: t.resultId || `t-${idx}`,
            originalText: t.originalText,
            relativeStartSec: t.relativeStartSec,
            speaker: t.speaker,
          }))}
        />
      )}
    </>
  );
}
