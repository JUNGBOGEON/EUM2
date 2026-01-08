'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { MeetingSession, MeetingSummary, SummaryStatus, UserInfo } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface WorkspaceStorageProps {
  workspaceId: string;
  sessions: MeetingSession[];
  onSessionClick: (sessionId: string) => void;
}

type StorageTab = 'summaries' | 'archive' | 'files';

export function WorkspaceStorage({ workspaceId, sessions, onSessionClick }: WorkspaceStorageProps) {
  const [activeTab, setActiveTab] = useState<StorageTab>('summaries');

  return (
    <div className="mx-6 mt-8 pb-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-[#37352f] flex items-center gap-2">
          <svg className="w-5 h-5 text-[#37352f99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          저장소
        </h2>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 p-1 bg-[#f7f6f3] rounded-lg mb-4">
        <TabButton
          label="AI 요약"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          isActive={activeTab === 'summaries'}
          onClick={() => setActiveTab('summaries')}
        />
        <TabButton
          label="회의록 아카이브"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          isActive={activeTab === 'archive'}
          onClick={() => setActiveTab('archive')}
        />
        <TabButton
          label="파일"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          isActive={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
        />
      </div>

      {/* 탭 컨텐츠 */}
      <div className="bg-white rounded-xl border border-[#e3e2e080]">
        {activeTab === 'summaries' && (
          <SummaryArchive sessions={sessions} onSessionClick={onSessionClick} />
        )}
        {activeTab === 'archive' && (
          <MeetingArchive sessions={sessions} onSessionClick={onSessionClick} />
        )}
        {activeTab === 'files' && (
          <FileStorage workspaceId={workspaceId} />
        )}
      </div>
    </div>
  );
}

// 탭 버튼
function TabButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-md transition-all ${
        isActive
          ? 'bg-white text-[#37352f] shadow-sm'
          : 'text-[#37352f99] hover:text-[#37352f]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================
// AI 요약 모아보기
// ============================================
function SummaryArchive({
  sessions,
  onSessionClick,
}: {
  sessions: MeetingSession[];
  onSessionClick: (sessionId: string) => void;
}) {
  const completedSessions = sessions.filter(
    (s) => s.status === 'ended' && s.summaryStatus === 'completed'
  );

  if (completedSessions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#f7f6f3] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#37352f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-[15px] text-[#37352f99] mb-1">아직 AI 요약이 없습니다</p>
        <p className="text-[13px] text-[#37352f66]">회의 종료 후 자동으로 AI 요약이 생성됩니다</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#e3e2e080]">
      {completedSessions.map((session) => (
        <SummaryCard key={session.id} session={session} onClick={() => onSessionClick(session.id)} />
      ))}
    </div>
  );
}

function SummaryCard({
  session,
  onClick,
}: {
  session: MeetingSession;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-4 hover:bg-[#f7f6f3] cursor-pointer transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[14px] font-medium text-[#37352f] truncate">
              {session.title || '회의 요약'}
            </h4>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-600 rounded-full">
              AI 요약
            </span>
          </div>
          <p className="text-[12px] text-[#37352f99]">
            {formatDate(session.endedAt)} · {formatDuration(session.durationSec)}
          </p>
        </div>
        <svg className="w-5 h-5 text-[#37352f66] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

// ============================================
// 회의록 아카이브 (월별 정리)
// ============================================
function MeetingArchive({
  sessions,
  onSessionClick,
}: {
  sessions: MeetingSession[];
  onSessionClick: (sessionId: string) => void;
}) {
  const endedSessions = sessions.filter((s) => s.status === 'ended');

  if (endedSessions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#f7f6f3] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#37352f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-[15px] text-[#37352f99] mb-1">회의 기록이 없습니다</p>
        <p className="text-[13px] text-[#37352f66]">첫 번째 회의를 시작해보세요</p>
      </div>
    );
  }

  // 월별로 그룹화
  const groupedByMonth = groupSessionsByMonth(endedSessions);

  return (
    <div className="divide-y divide-[#e3e2e080]">
      {Object.entries(groupedByMonth).map(([monthKey, monthSessions]) => (
        <MonthGroup
          key={monthKey}
          monthKey={monthKey}
          sessions={monthSessions}
          onSessionClick={onSessionClick}
        />
      ))}
    </div>
  );
}

function MonthGroup({
  monthKey,
  sessions,
  onSessionClick,
}: {
  monthKey: string;
  sessions: MeetingSession[];
  onSessionClick: (sessionId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [year, month] = monthKey.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  const summaryCount = sessions.filter((s) => s.summaryStatus === 'completed').length;

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#f7f6f3] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-[12px] font-bold text-blue-600">{month}</span>
          </div>
          <div className="text-left">
            <h4 className="text-[14px] font-medium text-[#37352f]">{monthName}</h4>
            <p className="text-[12px] text-[#37352f99]">
              {sessions.length}개 회의 · {summaryCount}개 요약
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-[#37352f66] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="bg-[#f7f6f3]/50 px-4 pb-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <ArchiveSessionCard
                key={session.id}
                session={session}
                onClick={() => onSessionClick(session.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveSessionCard({
  session,
  onClick,
}: {
  session: MeetingSession;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all border border-transparent hover:border-[#e3e2e080]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#37352f]">
            {session.title || '회의'}
          </span>
          {session.summaryStatus === 'completed' && (
            <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
        <span className="text-[12px] text-[#37352f99]">
          {formatShortDate(session.startedAt)}
        </span>
      </div>
    </div>
  );
}

// ============================================
// 파일 저장소
// ============================================
function FileStorage({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-[#f7f6f3] flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#37352f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-[15px] text-[#37352f99] mb-1">파일 저장소</p>
      <p className="text-[13px] text-[#37352f66] mb-4">회의 관련 파일을 업로드하고 관리할 수 있습니다</p>
      <p className="text-[12px] text-blue-500 bg-blue-50 rounded-lg px-3 py-2 inline-block">
        곧 출시 예정
      </p>
    </div>
  );
}

// ============================================
// 유틸리티 함수
// ============================================
function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatShortDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

function groupSessionsByMonth(sessions: MeetingSession[]): Record<string, MeetingSession[]> {
  const grouped: Record<string, MeetingSession[]> = {};

  sessions.forEach((session) => {
    if (!session.startedAt) return;
    const date = new Date(session.startedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(session);
  });

  // 최신 월 먼저 정렬
  const sorted: Record<string, MeetingSession[]> = {};
  Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .forEach((key) => {
      sorted[key] = grouped[key].sort(
        (a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
      );
    });

  return sorted;
}
