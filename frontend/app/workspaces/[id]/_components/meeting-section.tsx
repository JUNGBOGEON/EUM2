'use client';

import { useState } from 'react';
import { Video, Users, ArrowRight, Play, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { MeetingSession } from '../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MeetingSectionProps {
  activeSessions: MeetingSession[];
  onStartMeeting: (title?: string, category?: string, maxParticipants?: number) => void;
  onJoinSession: (sessionId: string) => void;
  isStarting: boolean;
  isJoining: boolean;
  canJoinCalls?: boolean;
}

export function MeetingSection({
  activeSessions,
  onStartMeeting,
  onJoinSession,
  isStarting,
  isJoining,
  canJoinCalls = true,
}: MeetingSectionProps) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [maxParticipants, setMaxParticipants] = useState(50);
  const { t } = useLanguage();

  const handleStart = () => {
    onStartMeeting(meetingTitle.trim() || undefined, category, maxParticipants);
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

  // If user can't join calls, show restriction message
  if (!canJoinCalls) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border-b border-white/5">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-6">
          <VideoOff className="h-8 w-8 text-neutral-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          {t('meeting.restricted')}
        </h3>
        <p className="text-neutral-500 max-w-sm">
          {t('meeting.restricted_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Header & Controls */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            실시간 세션
          </h2>
          <p className="text-neutral-500 font-medium">
            팀원들과 자유롭게 소통하고 협업하세요.
          </p>
        </div>

        {/* Create Session Control Bar */}
        <div className="bg-neutral-900/80 backdrop-blur border border-white/10 p-1 flex flex-col md:flex-row gap-1">
          {/* Title Input */}
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="회의 주제를 입력하세요..."
              className="w-full h-12 px-4 bg-transparent text-white placeholder:text-neutral-600 focus:bg-white/5 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-1 border-t md:border-t-0 md:border-l border-white/10">
            {/* Category Select */}
            <div className="relative w-40">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-transparent text-white appearance-none focus:bg-white/5 focus:outline-none cursor-pointer transition-colors text-sm"
              >
                <option value="General" className="bg-neutral-900">대화/잡담</option>
                <option value="Development" className="bg-neutral-900">개발 회의</option>
                <option value="Design" className="bg-neutral-900">디자인 리뷰</option>
                <option value="Planning" className="bg-neutral-900">기획/전략</option>
                <option value="Daily" className="bg-neutral-900">데일리 스크럼</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 1L5 5L9 1" strokeLinecap="square" />
                </svg>
              </div>
            </div>

            {/* Max Participants */}
            <div className="flex items-center px-4 gap-3 bg-transparent border-l border-white/10 w-48">
              <span className="text-xs text-neutral-500 font-mono whitespace-nowrap">
                인원: {maxParticipants}명
              </span>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                className="w-full h-1 bg-neutral-800 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:bg-green-500 transition-colors"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="h-12 px-8 bg-white text-black font-bold uppercase tracking-wide hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  생성 중
                </span>
              ) : (
                '세션 시작'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions Grid */}
      <div className="space-y-4">
        <div className="flex items-end justify-between border-b border-white/10 pb-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            진행 중인 세션
            {activeSessions.length > 0 && (
              <span className="text-xs bg-green-500 text-black px-1.5 py-0.5 font-bold">
                LIVE {activeSessions.length}
              </span>
            )}
          </h3>
        </div>

        {activeSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onJoinSession(session.id)}
                className="group relative h-48 bg-neutral-900 border border-white/10 hover:border-white transition-all cursor-pointer flex flex-col justify-between p-5 overflow-hidden"
              >
                {/* Background Pattern on Hover */}
                <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Top: Category & Status */}
                <div className="relative flex justify-between items-start z-10">
                  <span className="inline-block px-2 py-1 bg-white/10 text-xs font-medium text-white/80">
                    {session.category || 'General'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-red-500">ON AIR</span>
                  </div>
                </div>

                {/* Middle: Title */}
                <div className="relative z-10">
                  <h4 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors line-clamp-2">
                    {session.title}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">
                    주최자: {session.host?.name}
                  </p>
                </div>

                {/* Bottom: Info & Action */}
                <div className="relative flex items-end justify-between z-10">
                  <div className="flex items-center gap-3 text-sm text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {session.participantCount || 0} / {session.maxParticipants || 50}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-neutral-600 rounded-full" />
                      {formatDuration(session.startedAt || new Date().toISOString())}
                    </span>
                  </div>

                  <div className="w-8 h-8 flex items-center justify-center bg-white text-black opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 border border-white/10 flex items-center justify-center mb-4">
              <Video className="w-5 h-5 text-neutral-600" />
            </div>
            <p className="text-neutral-400 font-medium mb-1">
              진행 중인 세션이 없습니다.
            </p>
            <p className="text-neutral-600 text-sm">
              위의 컨트롤 바를 사용하여 새로운 회의를 시작해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
