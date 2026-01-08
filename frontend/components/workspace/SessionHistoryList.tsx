'use client';

import Image from 'next/image';
import type { MeetingSession } from './types';

interface SessionHistoryListProps {
  sessions: MeetingSession[];
  onSessionClick?: (sessionId: string) => void;
}

// 시간 포맷 (예: 1시간 23분)
function formatDuration(seconds?: number): string {
  if (!seconds) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

// 날짜 포맷 (예: 1월 8일 오후 3:45)
function formatDate(dateString?: string): string {
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

export function SessionHistoryList({ sessions, onSessionClick }: SessionHistoryListProps) {
  const endedSessions = sessions.filter(s => s.status === 'ended');

  if (endedSessions.length === 0) {
    return (
      <div className="mx-6 mt-8">
        <h2 className="text-[16px] font-semibold text-[#37352f] mb-4">회의 기록</h2>
        <div className="bg-[#f7f6f3] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#e3e2e0] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#37352f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[15px] text-[#37352f99]">아직 회의 기록이 없습니다</p>
          <p className="text-[13px] text-[#37352f66] mt-1">첫 번째 회의를 시작해보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-8 pb-8">
      <h2 className="text-[16px] font-semibold text-[#37352f] mb-4">회의 기록</h2>

      <div className="space-y-3">
        {endedSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSessionClick?.(session.id)}
            className={`bg-white rounded-xl border border-[#e3e2e080] p-4 transition-all ${
              onSessionClick ? 'cursor-pointer hover:border-[#e3e2e0] hover:shadow-sm' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-[#37352f] truncate">
                    {session.title || '팀 회의'}
                  </h3>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-[#e3e2e0] text-[#37352f99] text-[11px] font-medium rounded-full">
                    종료됨
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-4 text-[13px] text-[#37352f99]">
                  {/* Date */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(session.startedAt)}</span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDuration(session.durationSec)}</span>
                  </div>

                  {/* Host */}
                  {session.host && (
                    <div className="flex items-center gap-1.5">
                      {session.host.profileImage ? (
                        <Image
                          src={session.host.profileImage}
                          alt={session.host.name}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#e3e2e0] flex items-center justify-center text-[9px] font-medium text-[#37352f]">
                          {session.host.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{session.host.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Participant avatars */}
              {session.participants && session.participants.length > 0 && (
                <div className="flex -space-x-2 ml-4">
                  {session.participants.slice(0, 4).map((participant, index) => (
                    <div
                      key={participant.id}
                      className="relative"
                      style={{ zIndex: session.participants!.length - index }}
                    >
                      {participant.user?.profileImage ? (
                        <Image
                          src={participant.user.profileImage}
                          alt={participant.user.name}
                          width={28}
                          height={28}
                          className="rounded-full border-2 border-white"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#e3e2e0] border-2 border-white flex items-center justify-center text-[10px] font-medium text-[#37352f]">
                          {participant.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  ))}
                  {session.participants.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-[#37352f] border-2 border-white flex items-center justify-center text-[10px] font-medium text-white">
                      +{session.participants.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
