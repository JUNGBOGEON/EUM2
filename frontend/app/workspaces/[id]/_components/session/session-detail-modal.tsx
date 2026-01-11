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

const formatDuration = (start: string, end?: string) => {
  if (!end) return '-';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`;
  }
  return `${minutes}분`;
};

const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
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
                {session.title || '제목 없는 회의'}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {formatFullDate(session.startedAt)}
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
                  {sessionDetail?.participants?.length || session.participantCount || 1}명 참가
                </span>
              </div>
              {summaryData?.status === 'completed' && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">
                  요약 완료
                </Badge>
              )}
              {(summaryData?.status === 'pending' || summaryData?.status === 'processing') && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  요약 생성 중
                </Badge>
              )}
              {summaryData?.status === 'failed' && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-none">
                  요약 실패
                </Badge>
              )}
              {transcripts.length > 0 && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none">
                  자막 {transcripts.length}개
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Tabs defaultValue="summary" className="h-full flex flex-col">
              <div className="px-6 pt-4 flex-shrink-0">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="summary">회의 요약</TabsTrigger>
                  <TabsTrigger value="transcript">전체 내용</TabsTrigger>
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
                다운로드
              </Button>
              <Button
                className="flex-1"
                onClick={() => setIsFullViewOpen(true)}
                disabled={!summaryData?.structuredSummary}
              >
                <Eye className="h-4 w-4 mr-2" />
                전체 보기
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
