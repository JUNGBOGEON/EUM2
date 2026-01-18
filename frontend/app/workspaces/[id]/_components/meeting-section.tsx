'use client';

import { useState, useMemo } from 'react';
import { Video, Users, ArrowRight, VideoOff, Clock, Plus, X } from 'lucide-react';
import type { MeetingSession } from '../_lib/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MeetingSectionProps {
  activeSessions: MeetingSession[];
  onStartMeeting: (title?: string, category?: string, maxParticipants?: number) => void;
  onJoinSession: (sessionId: string) => void;
  isStarting: boolean;
  isJoining: boolean;
  canJoinCalls?: boolean;
}

const DEFAULT_CATEGORIES = [
  '일반',
  '개발',
  '디자인',
  '기획',
  '데일리',
];

export function MeetingSection({
  activeSessions,
  onStartMeeting,
  onJoinSession,
  isStarting,
  isJoining,
  canJoinCalls = true,
}: MeetingSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Collect all unique categories from active sessions and defaults
  const allCategories = useMemo(() => {
    const sessionCategories = activeSessions
      .map(s => s.category)
      .filter((c): c is string => !!c);
    const combined = [...new Set([...DEFAULT_CATEGORIES, ...sessionCategories])];
    return combined;
  }, [activeSessions]);

  const handleStart = () => {
    const finalCategory = customCategory.trim() || category || '일반';
    onStartMeeting(meetingTitle.trim() || undefined, finalCategory, maxParticipants);
    setIsModalOpen(false);
    // Reset form
    setMeetingTitle('');
    setCategory('');
    setCustomCategory('');
    setMaxParticipants(50);
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setCustomCategory('');
    setShowCategoryDropdown(false);
  };

  const handleCustomCategoryChange = (value: string) => {
    setCustomCategory(value);
    setCategory('');
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  // Restricted access state
  if (!canJoinCalls) {
    return (
      <div className="flex flex-col items-center justify-center py-40 border-b border-neutral-800">
        <div className="w-20 h-20 border border-neutral-800 flex items-center justify-center mb-8">
          <VideoOff className="h-8 w-8 text-neutral-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-3 tracking-tight">
          접근 제한됨
        </h3>
        <p className="text-base text-neutral-500 max-w-sm text-center leading-relaxed">
          회의 참여 권한이 없습니다. 관리자에게 문의하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Simple Control Bar - Just the button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-base text-neutral-500">
            새 회의를 시작하거나 진행 중인 회의에 참여하세요
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "h-12 px-6 bg-white text-black text-base font-medium",
            "hover:bg-neutral-200 active:bg-neutral-300",
            "transition-colors flex items-center gap-3"
          )}
        >
          <Plus className="w-5 h-5" />
          <span>새 회의</span>
        </button>
      </div>

      {/* New Meeting Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            "bg-black border border-neutral-800 p-0 gap-0",
            "sm:max-w-lg"
          )}
          showCloseButton={false}
        >
          {/* Modal Header */}
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-medium text-white tracking-tight">
                새 회의 만들기
              </DialogTitle>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Modal Body */}
          <div className="p-8 space-y-8">
            {/* Meeting Title */}
            <div className="space-y-3">
              <label className="text-sm text-neutral-500 uppercase tracking-wider">
                회의 제목
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="제목 없음"
                className={cn(
                  "w-full h-14 px-5 bg-transparent text-white text-base",
                  "border border-neutral-800",
                  "placeholder:text-neutral-600",
                  "focus:outline-none focus:border-neutral-600",
                  "transition-colors"
                )}
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <label className="text-sm text-neutral-500 uppercase tracking-wider">
                카테고리
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customCategory || category}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="카테고리 입력 또는 선택"
                  className={cn(
                    "w-full h-14 px-5 bg-transparent text-white text-base",
                    "border border-neutral-800",
                    "placeholder:text-neutral-600",
                    "focus:outline-none focus:border-neutral-600",
                    "transition-colors"
                  )}
                />
                {/* Category Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-px bg-black border border-neutral-800 z-10">
                    {allCategories
                      .filter(cat =>
                        !customCategory ||
                        cat.toLowerCase().includes(customCategory.toLowerCase())
                      )
                      .map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleSelectCategory(cat)}
                          className={cn(
                            "w-full h-12 px-5 text-left text-base",
                            "hover:bg-neutral-900 transition-colors",
                            category === cat ? "text-white bg-neutral-900" : "text-neutral-400"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    {customCategory && !allCategories.includes(customCategory) && (
                      <button
                        onClick={() => {
                          setCategory('');
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full h-12 px-5 text-left text-base text-neutral-500 hover:bg-neutral-900 transition-colors"
                      >
                        &ldquo;{customCategory}&rdquo; 새 카테고리로 생성
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Close dropdown when clicking outside */}
              {showCategoryDropdown && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowCategoryDropdown(false)}
                />
              )}
            </div>

            {/* Max Participants */}
            <div className="space-y-3">
              <label className="text-sm text-neutral-500 uppercase tracking-wider">
                최대 참가자
              </label>
              <div className="flex items-center gap-5 h-14 px-5 border border-neutral-800">
                <Users className="w-5 h-5 text-neutral-500" />
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  className={cn(
                    "flex-1 h-[2px] bg-neutral-800 appearance-none cursor-pointer",
                    "[&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
                    "[&::-webkit-slider-thumb]:bg-white"
                  )}
                />
                <span className="text-base font-mono tabular-nums text-white w-10 text-right">
                  {maxParticipants}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-8 pt-0">
            <button
              onClick={handleStart}
              disabled={isStarting}
              className={cn(
                "w-full h-14 bg-white text-black text-base font-medium",
                "hover:bg-neutral-200 active:bg-neutral-300",
                "disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed",
                "transition-colors flex items-center justify-center gap-3"
              )}
            >
              {isStarting ? (
                <>
                  <span className="w-5 h-5 border-2 border-neutral-400 border-t-black animate-spin" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  <span>회의 시작</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sessions Section */}
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-white tracking-tight">
              진행 중인 회의
            </h3>
            {activeSessions.length > 0 && (
              <span className="px-3 py-1 bg-white text-black text-sm font-mono tabular-nums">
                {activeSessions.length}
              </span>
            )}
          </div>
        </div>

        {/* Sessions Grid */}
        {activeSessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onJoinSession(session.id)}
                disabled={isJoining}
                className={cn(
                  "group relative bg-black p-10 text-left",
                  "border border-neutral-800",
                  "hover:bg-neutral-950 hover:border-neutral-700 transition-colors",
                  "focus:outline-none focus:border-neutral-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between mb-10">
                  <span className="text-sm text-neutral-500 font-medium uppercase tracking-wider">
                    {session.category || '일반'}
                  </span>

                  {/* Avatar Stack */}
                  {session.participants && session.participants.length > 0 && (
                    <div className="flex items-center -space-x-2.5">
                      {session.participants.slice(0, 3).map((participant) => (
                        <div
                          key={participant.id}
                          className="w-9 h-9 border-2 border-black bg-neutral-800 flex items-center justify-center overflow-hidden"
                          style={{ borderRadius: '50%' }}
                        >
                          {participant.user?.profileImage ? (
                            <img
                              src={participant.user.profileImage}
                              alt={participant.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm text-white font-medium">
                              {participant.user?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                      ))}
                      {session.participants.length > 3 && (
                        <div
                          className="w-9 h-9 border-2 border-black bg-neutral-700 flex items-center justify-center"
                          style={{ borderRadius: '50%' }}
                        >
                          <span className="text-xs text-white font-medium">
                            +{session.participants.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-2xl font-medium text-white mb-3 line-clamp-2 leading-snug">
                  {session.title}
                </h4>

                {/* Host */}
                <p className="text-base text-neutral-500 mb-10">
                  {session.host?.name}
                </p>

                {/* Bottom Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-neutral-500">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="font-mono tabular-nums text-base">
                        {session.participants?.length || 0}/{session.maxParticipants || 50}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-mono tabular-nums text-base">
                        {formatDuration(session.startedAt || new Date().toISOString())}
                      </span>
                    </span>
                  </div>

                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center",
                    "border border-neutral-800 text-neutral-600",
                    "group-hover:border-white group-hover:text-white",
                    "transition-colors"
                  )}>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="border border-neutral-800 py-28 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border border-neutral-800 flex items-center justify-center mb-6">
              <Video className="w-7 h-7 text-neutral-700" />
            </div>
            <p className="text-base text-neutral-400 mb-2">
              진행 중인 회의가 없습니다
            </p>
            <p className="text-sm text-neutral-600">
              새 회의를 시작하여 협업을 시작하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
