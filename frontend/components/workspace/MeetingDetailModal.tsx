'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useMeetingDetail, useMeetingSummary } from '@/hooks/workspace';
import { SummaryCard } from './SummaryCard';
import type { SessionParticipant, MeetingTranscription, MeetingSummary, SummaryStatus } from './types';

interface MeetingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

// 날짜+시간 포맷팅: "1월 8일 오후 3:45"
function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// 시간만 포맷팅: "오후 3:45"
function formatTime(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// 소요시간 포맷팅: "1시간 30분" or "45분"
function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

// 상대시간 포맷팅 (mm:ss)
function formatRelativeTime(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

type TabType = 'summary' | 'details' | 'transcript';

export function MeetingDetailModal({
  isOpen,
  onClose,
  sessionId,
}: MeetingDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  
  const { data, isLoading, error, refetch } = useMeetingDetail(
    isOpen ? sessionId : null
  );
  const { session, participants, transcriptions } = data;

  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    regenerate,
    isRegenerating,
  } = useMeetingSummary(isOpen ? sessionId : null, session?.workspaceId);

  // ESC 키로 모달 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setActiveTab('summary'); // 모달 열릴 때 요약 탭으로 초기화
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // 배경 클릭으로 모달 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e3e2e080]">
          <h2 className="text-[18px] font-semibold text-[#37352f]">
            {session?.title || '회의 상세'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#37352f99] hover:text-[#37352f] transition-colors p-1"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-[#e3e2e080] px-6">
          <TabButton
            label="AI 요약"
            isActive={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            badge={summary?.status === 'processing' ? 'loading' : undefined}
          />
          <TabButton
            label="회의 정보"
            isActive={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <TabButton
            label="발화 기록"
            isActive={activeTab === 'transcript'}
            onClick={() => setActiveTab('transcript')}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            badge={transcriptions.length > 0 ? transcriptions.length.toString() : undefined}
          />
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <>
              {activeTab === 'summary' && (
                <SummarySection
                  summary={summary}
                  isLoading={isSummaryLoading}
                  error={summaryError}
                  onRegenerate={regenerate}
                  isRegenerating={isRegenerating}
                  sessionTitle={session?.title}
                  sessionDate={session?.startedAt}
                  participantCount={participants.length}
                  duration={formatDuration(session?.durationSec)}
                />
              )}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <SessionInfoSection
                    startedAt={session?.startedAt}
                    endedAt={session?.endedAt}
                    durationSec={session?.durationSec}
                  />
                  <ParticipantsSection
                    participants={participants}
                    hostId={session?.hostId}
                  />
                </div>
              )}
              {activeTab === 'transcript' && (
                <TranscriptionSection transcriptions={transcriptions} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 탭 버튼 컴포넌트
function TabButton({
  label,
  isActive,
  onClick,
  icon,
  badge,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
        isActive
          ? 'text-blue-600 border-blue-600'
          : 'text-[#37352f99] border-transparent hover:text-[#37352f] hover:border-[#e3e2e0]'
      }`}
    >
      {icon}
      {label}
      {badge === 'loading' ? (
        <span className="ml-1 w-4 h-4">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </span>
      ) : badge ? (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#37352f15] text-[#37352f99] rounded-full">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// 요약 섹션
function SummarySection({
  summary,
  isLoading,
  error,
  onRegenerate,
  isRegenerating,
  sessionTitle,
  sessionDate,
  participantCount,
  duration,
}: {
  summary: MeetingSummary | null;
  isLoading: boolean;
  error: string | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
  sessionTitle?: string;
  sessionDate?: string;
  participantCount?: number;
  duration?: string;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-[14px] text-[#37352f99]">요약 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-[14px] text-[#37352f99] mb-3">{error}</p>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="px-4 py-2 text-[13px] text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-lg transition-colors"
        >
          {isRegenerating ? '재생성 중...' : '요약 생성하기'}
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-[14px] text-[#37352f99]">요약 정보가 없습니다.</p>
      </div>
    );
  }

  // 상태에 따른 UI 렌더링
  return (
    <div className="space-y-4">
      {/* 상태 표시 */}
      <SummaryStatusBadge status={summary.status} />

      {/* 요약 내용 */}
      {summary.status === 'completed' && summary.content ? (
        <div className="space-y-4">
          {/* 이미지 카드 내보내기 */}
          <SummaryCard
            content={summary.content}
            sessionTitle={sessionTitle}
            sessionDate={sessionDate}
            participantCount={participantCount}
            duration={duration}
          />

          {/* 재생성 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-[#37352f99] hover:text-[#37352f] hover:bg-[#37352f08] rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRegenerating ? '재생성 중...' : '재생성'}
            </button>
          </div>

          {/* 마크다운 렌더링 */}
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={summary.content} />
          </div>
        </div>
      ) : summary.status === 'processing' || summary.status === 'pending' ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[#f7f6f3] rounded-lg">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[14px] font-medium text-[#37352f] mb-1">AI가 회의 내용을 분석하고 있습니다</p>
          <p className="text-[13px] text-[#37352f99]">잠시만 기다려주세요...</p>
        </div>
      ) : summary.status === 'failed' ? (
        <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-lg">
          <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[14px] font-medium text-red-600 mb-1">요약 생성에 실패했습니다</p>
          <p className="text-[13px] text-red-500 mb-4">다시 시도해주세요</p>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 text-[13px] text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors"
          >
            {isRegenerating ? '재생성 중...' : '다시 생성하기'}
          </button>
        </div>
      ) : summary.status === 'skipped' ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[#f7f6f3] rounded-lg">
          <svg className="w-12 h-12 text-[#37352f66] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-[14px] font-medium text-[#37352f] mb-1">요약을 생성할 수 없습니다</p>
          <p className="text-[13px] text-[#37352f99]">발화 기록이 없어 요약이 스킵되었습니다</p>
        </div>
      ) : null}
    </div>
  );
}

// 요약 상태 배지
function SummaryStatusBadge({ status }: { status: SummaryStatus }) {
  const statusConfig: Record<SummaryStatus, { label: string; className: string }> = {
    pending: { label: '대기 중', className: 'bg-gray-100 text-gray-600' },
    processing: { label: 'AI 분석 중', className: 'bg-blue-100 text-blue-600' },
    completed: { label: '요약 완료', className: 'bg-green-100 text-green-600' },
    failed: { label: '생성 실패', className: 'bg-red-100 text-red-600' },
    skipped: { label: '스킵됨', className: 'bg-gray-100 text-gray-500' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
      {status === 'completed' && (
        <span className="text-[12px] text-[#37352f99]">
          Claude AI로 생성됨
        </span>
      )}
    </div>
  );
}

// 간단한 마크다운 렌더러
function MarkdownRenderer({ content }: { content: string }) {
  // 마크다운을 HTML로 변환하는 간단한 함수
  const renderMarkdown = (md: string) => {
    let html = md
      // 헤더
      .replace(/^### (.+)$/gm, '<h3 class="text-[15px] font-semibold text-[#37352f] mt-5 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-[16px] font-semibold text-[#37352f] mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-[18px] font-bold text-[#37352f] mt-6 mb-4">$1</h1>')
      // 볼드
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // 테이블
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.slice(1, -1).split('|').map(cell => cell.trim());
        const isHeader = cells.every(cell => cell.match(/^:?-+:?$/));
        if (isHeader) return '';
        const cellClass = 'px-3 py-2 text-[13px] text-[#37352f] border border-[#e3e2e080]';
        return `<tr>${cells.map(cell => `<td class="${cellClass}">${cell}</td>`).join('')}</tr>`;
      })
      // 리스트 아이템 (- 로 시작)
      .replace(/^- (.+)$/gm, '<li class="text-[13px] text-[#37352f] ml-4 mb-1">$1</li>')
      // 줄바꿈
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br/>');

    // 테이블 래핑
    if (html.includes('<tr>')) {
      html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, (match) => {
        return `<table class="w-full border-collapse my-4 bg-[#f7f6f3] rounded-lg overflow-hidden">${match}</table>`;
      });
    }

    return `<div class="space-y-2">${html}</div>`;
  };

  return (
    <div 
      className="bg-[#f7f6f3] rounded-lg p-5"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
    />
  );
}

// 로딩 상태 컴포넌트
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <svg
        className="animate-spin h-8 w-8 text-blue-500 mb-3"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-[14px] text-[#37352f99]">회의 정보를 불러오는 중...</p>
    </div>
  );
}

// 에러 상태 컴포넌트
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <svg
        className="w-12 h-12 text-red-400 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-[14px] text-[#37352f99] mb-3">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-[13px] text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}

// 회의 정보 섹션
function SessionInfoSection({
  startedAt,
  endedAt,
  durationSec,
}: {
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
}) {
  return (
    <section>
      <h3 className="text-[14px] font-medium text-[#37352f] mb-3">회의 정보</h3>
      <div className="bg-[#f7f6f3] rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[13px] text-[#37352f99]">시작</span>
          <span className="text-[13px] text-[#37352f]">{formatDateTime(startedAt)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[13px] text-[#37352f99]">종료</span>
          <span className="text-[13px] text-[#37352f]">{formatDateTime(endedAt)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-[#e3e2e080]">
          <span className="text-[13px] text-[#37352f99]">소요 시간</span>
          <span className="text-[13px] font-medium text-[#37352f]">
            {formatDuration(durationSec)}
          </span>
        </div>
      </div>
    </section>
  );
}

// 참가자 섹션
function ParticipantsSection({
  participants,
  hostId,
}: {
  participants: SessionParticipant[];
  hostId?: string;
}) {
  if (participants.length === 0) {
    return (
      <section>
        <h3 className="text-[14px] font-medium text-[#37352f] mb-3">참가자</h3>
        <div className="bg-[#f7f6f3] rounded-lg p-4">
          <p className="text-[13px] text-[#37352f99] text-center">
            참가자 정보가 없습니다.
          </p>
        </div>
      </section>
    );
  }

  // 호스트 먼저, 나머지는 입장 시간순으로 정렬
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.userId === hostId) return -1;
    if (b.userId === hostId) return 1;
    return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
  });

  return (
    <section>
      <h3 className="text-[14px] font-medium text-[#37352f] mb-3">
        참가자 ({participants.length}명)
      </h3>
      <div className="bg-[#f7f6f3] rounded-lg p-4 space-y-3">
        {sortedParticipants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            isHost={participant.userId === hostId || participant.role === 'HOST'}
          />
        ))}
      </div>
    </section>
  );
}

// 참가자 행
function ParticipantRow({
  participant,
  isHost,
}: {
  participant: SessionParticipant;
  isHost: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* 프로필 이미지 */}
      {participant.user?.profileImage ? (
        <Image
          src={participant.user.profileImage}
          alt={participant.user.name || ''}
          width={36}
          height={36}
          className="rounded-full"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-[14px] text-white font-medium">
          {(participant.user?.name || '?').charAt(0).toUpperCase()}
        </div>
      )}

      {/* 이름 및 시간 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#37352f] truncate">
            {participant.user?.name || '참가자'}
          </span>
          {isHost && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
              호스트
            </span>
          )}
        </div>
        <div className="text-[12px] text-[#37352f99]">
          {formatTime(participant.joinedAt)} - {formatTime(participant.leftAt)}{' '}
          <span className="text-[#37352f66]">
            ({formatDuration(participant.durationSec)})
          </span>
        </div>
      </div>
    </div>
  );
}

// 발화 스크립트 섹션
function TranscriptionSection({
  transcriptions,
}: {
  transcriptions: MeetingTranscription[];
}) {
  if (transcriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-[#f7f6f3] rounded-lg">
        <svg className="w-12 h-12 text-[#37352f66] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-[14px] font-medium text-[#37352f] mb-1">발화 기록이 없습니다</p>
        <p className="text-[13px] text-[#37352f99]">회의 중 음성 인식이 활성화되지 않았습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-[#37352f]">
          발화 스크립트 ({transcriptions.length}개)
        </h3>
      </div>
      <div className="bg-[#f7f6f3] rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-4">
        {transcriptions.map((transcript) => (
          <TranscriptRow key={transcript.id} transcript={transcript} />
        ))}
      </div>
    </div>
  );
}

// 발화 스크립트 행
function TranscriptRow({ transcript }: { transcript: MeetingTranscription }) {
  const speakerName = transcript.speaker?.name || '참가자';
  const relativeTime = formatRelativeTime(transcript.relativeStartSec);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {/* 프로필 이미지 */}
        {transcript.speaker?.profileImage ? (
          <Image
            src={transcript.speaker.profileImage}
            alt={speakerName}
            width={20}
            height={20}
            className="rounded-full"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-medium">
            {speakerName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[12px] font-medium text-blue-600">{speakerName}</span>
        <span className="text-[11px] text-[#37352f66]">{relativeTime}</span>
      </div>
      <p className="text-[13px] text-[#37352f] leading-relaxed pl-7">
        {transcript.originalText}
      </p>
    </div>
  );
}
