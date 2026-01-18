'use client';

import { FileText, Users, ChevronRight, MoreHorizontal, Download, Eye, Calendar, Timer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MeetingSession } from '../../_lib/types';

interface SessionCardProps {
  session: MeetingSession;
  onSelect: (session: MeetingSession) => void;
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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `어제 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function SessionCard({ session, onSelect }: SessionCardProps) {
  return (
    <div
      className="group flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-900/50 transition-all cursor-pointer border border-transparent hover:border-white/5"
      onClick={() => onSelect(session)}
    >
      {/* Session Icon */}
      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0">
        <FileText className="h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
      </div>

      {/* Session Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-white truncate text-sm">
            {session.title || '제목 없는 회의'}
          </h4>
          {session.summaryStatus === 'completed' && (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="요약 완료" />
          )}
          {(session.summaryStatus === 'pending' || session.summaryStatus === 'processing') && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="생성 중" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600 group-hover:text-neutral-500 transition-colors">
          <span>
            {formatDate(session.startedAt)}
          </span>
          <span>•</span>
          <span>
            {formatDuration(session.startedAt, session.endedAt)}
          </span>
          {session.participantCount && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {session.participantCount}명
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-400 hover:text-white hover:bg-white/5 h-8 px-3"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(session);
          }}
        >
          <span className="text-xs">상세보기</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10 text-white shadow-xl">
            <DropdownMenuItem
              onClick={() => onSelect(session)}
              className="focus:bg-white/10 focus:text-white cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              상세 보기
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="focus:bg-white/10 focus:text-white cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              회의록 다운로드
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
