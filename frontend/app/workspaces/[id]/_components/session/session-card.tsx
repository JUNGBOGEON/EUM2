'use client';

import { FileText, Users, ChevronRight, MoreHorizontal, Download, Eye, Calendar, Timer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
      className="group flex items-center gap-4 p-4 rounded-xl border border-border
               hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer"
      onClick={() => onSelect(session)}
    >
      {/* Session Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-6 w-6 text-primary" />
      </div>

      {/* Session Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground truncate">
            {session.title || '제목 없는 회의'}
          </h4>
          {session.summaryStatus === 'completed' && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
              요약 완료
            </Badge>
          )}
          {(session.summaryStatus === 'pending' || session.summaryStatus === 'processing') && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              생성 중
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(session.startedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" />
            {formatDuration(session.startedAt, session.endedAt)}
          </span>
          {session.participantCount && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {session.participantCount}명
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(session);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          상세보기
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelect(session)}>
              <Eye className="mr-2 h-4 w-4" />
              상세 보기
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              회의록 다운로드
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
