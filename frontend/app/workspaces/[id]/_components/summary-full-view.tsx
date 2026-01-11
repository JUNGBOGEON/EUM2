'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Clock, Users, MessageSquare, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type {
  MeetingSession,
  StructuredSummary,
  SummarySection,
  TranscriptItem,
} from '../_lib/types';

interface SummaryFullViewProps {
  isOpen: boolean;
  onClose: () => void;
  session: MeetingSession;
  structuredSummary: StructuredSummary;
  transcripts: TranscriptItem[];
}

// 시간 포맷팅
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatDuration(startStr: string, endStr?: string): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0) {
    return `${hours}시간 ${mins}분`;
  }
  return `${mins}분`;
}

// 발화자별 통계 계산
interface SpeakerStats {
  name: string;
  profileImage?: string;
  messageCount: number;
  wordCount: number;
}

function calculateSpeakerStats(transcripts: TranscriptItem[]): SpeakerStats[] {
  const statsMap = new Map<string, SpeakerStats>();

  transcripts.forEach((t) => {
    const speakerName = t.speaker?.name || '참가자';
    const existing = statsMap.get(speakerName);
    const wordCount = t.originalText.split(/\s+/).length;

    if (existing) {
      existing.messageCount += 1;
      existing.wordCount += wordCount;
    } else {
      statsMap.set(speakerName, {
        name: speakerName,
        profileImage: t.speaker?.profileImage,
        messageCount: 1,
        wordCount,
      });
    }
  });

  return Array.from(statsMap.values()).sort((a, b) => b.wordCount - a.wordCount);
}

// 섹션별로 참조된 자막 찾기 (인덱스 기반 매칭)
function getReferencedTranscripts(
  section: SummarySection,
  transcripts: TranscriptItem[]
): TranscriptItem[] {
  return transcripts.filter((t, idx) => {
    const indexId = `t-${idx}`;
    return section.transcriptRefs.includes(indexId) || section.transcriptRefs.includes(t.resultId);
  });
}

// 자막 카드
function TranscriptCard({ transcript, isCompact = false }: { transcript: TranscriptItem; isCompact?: boolean }) {
  return (
    <div className={cn(
      "group flex gap-3 rounded-lg hover:bg-[#2f2f2f] transition-colors",
      isCompact ? "p-2" : "p-3"
    )}>
      <div className="flex-shrink-0">
        {transcript.speaker?.profileImage ? (
          <Image
            src={transcript.speaker.profileImage}
            alt={transcript.speaker.name}
            width={isCompact ? 24 : 28}
            height={isCompact ? 24 : 28}
            className="rounded-full"
          />
        ) : (
          <div className={cn(
            "rounded-full bg-[#373737] flex items-center justify-center",
            isCompact ? "w-6 h-6" : "w-7 h-7"
          )}>
            <span className={cn(
              "font-medium text-[#9b9a97]",
              isCompact ? "text-[10px]" : "text-xs"
            )}>
              {(transcript.speaker?.name || '?')[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "font-medium text-[#ffffffcf]",
            isCompact ? "text-xs" : "text-sm"
          )}>
            {transcript.speaker?.name || '참가자'}
          </span>
          {transcript.relativeStartSec !== undefined && (
            <span className="text-[10px] text-[#9b9a97]">
              {Math.floor(transcript.relativeStartSec / 60)}:
              {Math.floor(transcript.relativeStartSec % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        <p className={cn(
          "text-[#ffffffcf] leading-relaxed",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {transcript.originalText}
        </p>
      </div>
    </div>
  );
}

// 토글 섹션
function SummarySectionToggle({
  section,
  transcripts,
}: {
  section: SummarySection;
  transcripts: TranscriptItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const referencedTranscripts = getReferencedTranscripts(section, transcripts);
  const hasRefs = referencedTranscripts.length > 0;

  // 제목 섹션은 토글 없이 표시
  if (section.type === 'title') {
    return (
      <div className="mb-8">
        <div className="prose prose-lg max-w-none prose-invert prose-headings:text-[#ffffffcf] prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {/* 클릭 가능한 섹션 헤더 */}
      <div
        className={cn(
          'group flex items-start gap-1 p-3 -ml-3 rounded-lg transition-all',
          hasRefs && 'cursor-pointer hover:bg-[#252525]',
          isOpen && hasRefs && 'bg-[#252525]'
        )}
        onClick={() => hasRefs && setIsOpen(!isOpen)}
      >
        {/* 토글 아이콘 */}
        {hasRefs && (
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
            <ChevronRight
              className={cn(
                'w-4 h-4 text-[#9b9a97] transition-transform duration-200',
                isOpen && 'rotate-90'
              )}
            />
          </div>
        )}

        {/* 섹션 내용 */}
        <div className={cn("flex-1 min-w-0", !hasRefs && "ml-5")}>
          <div className="summary-content prose prose-base max-w-none prose-invert prose-headings:text-[#ffffffcf] prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg prose-p:text-[#ffffffcf] prose-p:text-[15px] prose-p:leading-relaxed prose-li:text-[#ffffffcf] prose-li:text-[15px] prose-li:leading-relaxed prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-table:text-[#ffffffcf] prose-strong:text-[#4a9eff] prose-strong:font-semibold prose-th:text-[#9b9a97] prose-th:text-sm prose-td:text-[#ffffffcf] prose-td:text-sm prose-em:text-[#f59e0b] prose-em:not-italic prose-em:bg-[#f59e0b]/10 prose-em:px-1 prose-em:rounded">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
          </div>

          {/* 참조 힌트 */}
          {hasRefs && !isOpen && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2f2f2f] text-xs text-[#9b9a97] hover:bg-[#373737] transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              {referencedTranscripts.length}개 대화 참조
            </div>
          )}
        </div>
      </div>

      {/* 참조된 자막 목록 (토글) */}
      {hasRefs && isOpen && (
        <div className="ml-5 mt-2 mb-5 pl-4 border-l-2 border-[#4a9eff]/40 bg-[#1e1e1e] rounded-r-lg">
          <div className="py-3">
            <div className="text-xs font-medium text-[#4a9eff] mb-3 px-2 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              참조된 대화 ({referencedTranscripts.length})
            </div>
            <div className="space-y-1">
              {referencedTranscripts.map((transcript) => (
                <TranscriptCard key={transcript.id} transcript={transcript} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 참여자 통계 (컴팩트)
function ParticipantStatsCompact({ speakerStats }: { speakerStats: SpeakerStats[] }) {
  const totalWords = speakerStats.reduce((sum, s) => sum + s.wordCount, 0);

  return (
    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2f2f2f]">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#4a9eff]" />
        <span className="text-xs font-medium text-[#ffffffcf]">
          참여자 ({speakerStats.length}명)
        </span>
      </div>
      <div className="space-y-2.5">
        {speakerStats.map((speaker, idx) => {
          const percentage = totalWords > 0 ? Math.round((speaker.wordCount / totalWords) * 100) : 0;
          return (
            <div key={speaker.name} className="flex items-center gap-2">
              {speaker.profileImage ? (
                <Image
                  src={speaker.profileImage}
                  alt={speaker.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#373737] flex items-center justify-center">
                  <span className="text-[9px] font-medium text-[#9b9a97]">
                    {speaker.name[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#ffffffcf] truncate">{speaker.name}</span>
                  <span className="text-[10px] text-[#9b9a97] ml-2">{percentage}%</span>
                </div>
                <div className="h-1 bg-[#2f2f2f] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: idx === 0 ? '#4a9eff' : idx === 1 ? '#34d399' : '#9b9a97'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SummaryFullView({
  isOpen,
  onClose,
  session,
  structuredSummary,
  transcripts,
}: SummaryFullViewProps) {
  // 발화자 통계 계산
  const speakerStats = useMemo(() => calculateSpeakerStats(transcripts), [transcripts]);
  const totalWords = speakerStats.reduce((sum, s) => sum + s.wordCount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="!max-w-[100vw] !w-screen !h-screen !max-h-screen p-0 rounded-none flex flex-col overflow-hidden bg-[#191919] [&>button]:hidden"
      >
        <VisuallyHidden>
          <DialogTitle>{session.title} - 전체 보기</DialogTitle>
          <DialogDescription>회의 요약과 자막을 함께 볼 수 있습니다</DialogDescription>
        </VisuallyHidden>

        {/* 헤더 - 컴팩트 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#2f2f2f] flex-shrink-0 bg-[#191919]">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#ffffffcf]">
              {session.title}
            </h1>
            {/* 인라인 통계 */}
            <div className="hidden md:flex items-center gap-4 text-xs text-[#9b9a97]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(session.startedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDuration(session.startedAt, session.endedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{speakerStats.length}명</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{transcripts.length}개 발언</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#9b9a97] hover:text-[#ffffffcf] hover:bg-[#2f2f2f] h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 메인 컨텐츠 - 2열 레이아웃 */}
        <div className="flex flex-1 min-h-0">
          {/* 왼쪽: 요약 (65%) */}
          <div className="w-[65%] border-r border-[#2f2f2f] flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 py-6">
                {structuredSummary.sections.map((section) => (
                  <SummarySectionToggle
                    key={section.id}
                    section={section}
                    transcripts={transcripts}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 자막 + 통계 (35%) */}
          <div className="w-[35%] flex flex-col min-h-0 bg-[#1e1e1e]">
            {/* 자막 헤더 */}
            <div className="px-4 py-3 border-b border-[#2f2f2f] flex-shrink-0 bg-[#1a1a1a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#ffffffcf]">
                  전체 자막
                </span>
                <span className="text-[10px] text-[#9b9a97] bg-[#2f2f2f] px-2 py-0.5 rounded-full">
                  {transcripts.length}개
                </span>
              </div>
            </div>

            {/* 자막 목록 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-0.5">
                {transcripts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-xs text-[#9b9a97]">
                      자막 기록이 없습니다
                    </p>
                  </div>
                ) : (
                  transcripts.map((transcript) => (
                    <TranscriptCard key={transcript.id} transcript={transcript} />
                  ))
                )}
              </div>
            </div>

            {/* 참여자 통계 (하단 고정) */}
            <div className="flex-shrink-0 p-3 border-t border-[#2f2f2f]">
              <ParticipantStatsCompact speakerStats={speakerStats} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
