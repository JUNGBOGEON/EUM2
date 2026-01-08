'use client';

import { useState } from 'react';
import { Clock, FileText, Users, ChevronRight, Play, MoreHorizontal, Download, Eye, Calendar, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MeetingSession } from '../_lib/types';

interface SessionHistoryProps {
  sessions: MeetingSession[];
  isLoading: boolean;
  onViewSession: (session: MeetingSession) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function SessionHistory({
  sessions,
  isLoading,
  onViewSession,
  onLoadMore,
  hasMore,
}: SessionHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<MeetingSession | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">회의 기록</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">회의 기록</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Play className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            아직 진행된 회의가 없습니다
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            새 회의를 시작해 보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">회의 기록</h2>
            <Badge variant="secondary">{sessions.length}개</Badge>
          </div>
        </div>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border
                       hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer"
              onClick={() => setSelectedSession(session)}
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
                  {session.summary && (
                    <Badge variant="outline" className="text-xs">
                      요약 있음
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
                    setSelectedSession(session);
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
                    <DropdownMenuItem onClick={() => setSelectedSession(session)}>
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
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <Button variant="ghost" className="w-full" onClick={onLoadMore}>
            더 보기
          </Button>
        )}
      </div>

      {/* Session Detail Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
          {selectedSession && (
            <>
              {/* Header */}
              <div className="p-6 border-b border-border">
                <SheetHeader className="space-y-1">
                  <SheetTitle className="text-xl">
                    {selectedSession.title || '제목 없는 회의'}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {formatFullDate(selectedSession.startedAt)}
                  </SheetDescription>
                </SheetHeader>

                {/* Meeting Stats - Horizontal */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatDuration(selectedSession.startedAt, selectedSession.endedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {selectedSession.participantCount || 1}명 참가
                    </span>
                  </div>
                  {selectedSession.summary && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">
                      요약 완료
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="summary" className="h-full flex flex-col">
                  <div className="px-6 pt-4">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="summary">회의 요약</TabsTrigger>
                      <TabsTrigger value="transcript">전체 내용</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="summary" className="flex-1 overflow-hidden mt-0 px-6 pb-6">
                    <ScrollArea className="h-full max-h-[calc(100vh-380px)]">
                      {selectedSession.summary ? (
                        <div className="py-4 space-y-4">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {selectedSession.summary}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                            <FileText className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium">
                            회의 요약이 없습니다
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            AI가 회의 내용을 요약해 드립니다
                          </p>
                          <Button variant="outline" size="sm" className="mt-4">
                            요약 생성하기
                          </Button>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="transcript" className="flex-1 overflow-hidden mt-0 px-6 pb-6">
                    <ScrollArea className="h-full max-h-[calc(100vh-380px)]">
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                          <FileText className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                          전체 내용 보기
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          회의 중 기록된 전체 내용을 확인하세요
                        </p>
                        <Button variant="outline" size="sm" className="mt-4">
                          내용 불러오기
                        </Button>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-border bg-muted/30">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    다운로드
                  </Button>
                  <Button className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    전체 보기
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
