'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { MeetingSession } from './types';

interface ActiveSessionBannerProps {
  session: MeetingSession;
  onJoin: () => void;
  isJoining?: boolean;
}

export function ActiveSessionBanner({ session, onJoin, isJoining = false }: ActiveSessionBannerProps) {
  const [elapsedTime, setElapsedTime] = useState('');

  // 경과 시간 계산
  useEffect(() => {
    if (!session.startedAt) return;

    const updateElapsed = () => {
      const start = new Date(session.startedAt!).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  return (
    <div className="mx-6 mt-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-5 shadow-lg">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-[13px] font-medium text-white">진행 중</span>
            </div>

            <div>
              <h3 className="text-[18px] font-semibold text-white">
                {session.title || '팀 회의'}
              </h3>
              <div className="mt-1 flex items-center gap-3 text-white/80 text-[13px]">
                {/* Host info */}
                <div className="flex items-center gap-1.5">
                  {session.host?.profileImage ? (
                    <Image
                      src={session.host.profileImage}
                      alt={session.host.name}
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full bg-white/30 flex items-center justify-center text-[10px] text-white font-medium">
                      {session.host?.name?.charAt(0).toUpperCase() || 'H'}
                    </div>
                  )}
                  <span>{session.host?.name || '호스트'}</span>
                </div>

                <span className="text-white/50">|</span>

                {/* Elapsed time */}
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{elapsedTime}</span>
                </div>

                {/* Participant count */}
                {session.participantCount !== undefined && session.participantCount > 0 && (
                  <>
                    <span className="text-white/50">|</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{session.participantCount}명 참여 중</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Join button */}
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="flex items-center gap-2 bg-white text-green-600 px-6 py-2.5 rounded-xl font-semibold text-[14px] hover:bg-green-50 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>참가 중...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>회의 참가</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
