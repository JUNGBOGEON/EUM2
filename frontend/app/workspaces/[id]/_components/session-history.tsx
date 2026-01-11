'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Clock, FileText, Users, ChevronRight, Play, MoreHorizontal, Download, Eye, Calendar, Timer, Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MeetingSession } from '../_lib/types';
import { API_URL } from '../_lib/constants';

interface TranscriptItem {
  id: string;
  originalText: string;
  speakerId?: string;
  speaker?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  relativeStartSec?: number;
  startTimeMs: number;
}

type SummaryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

interface SummaryData {
  status: SummaryStatus;
  content: string | null;
  presignedUrl: string | null;
}

interface SessionDetail extends MeetingSession {
  participants?: {
    id: string;
    userId: string;
    user?: {
      id: string;
      name: string;
      profileImage?: string;
    };
  }[];
}

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
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);

  // Fetch summary data
  const fetchSummary = useCallback(async (sessionId: string) => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/${sessionId}/summary`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
        return data as SummaryData;
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
    return null;
  }, []);

  // Regenerate summary
  const handleRegenerateSummary = useCallback(async () => {
    if (!selectedSession) return;

    setIsRegeneratingSummary(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/${selectedSession.id}/summary/regenerate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        // Set status to processing immediately
        setSummaryData(prev => prev ? { ...prev, status: 'processing' } : { status: 'processing', content: null, presignedUrl: null });
      }
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
    } finally {
      setIsRegeneratingSummary(false);
    }
  }, [selectedSession]);

  // Fetch session detail and transcripts when a session is selected
  useEffect(() => {
    if (!selectedSession) {
      setSessionDetail(null);
      setTranscripts([]);
      setSummaryData(null);
      return;
    }

    const fetchSessionDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const response = await fetch(`${API_URL}/api/meetings/sessions/${selectedSession.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSessionDetail(data);
        }
      } catch (error) {
        console.error('Failed to fetch session detail:', error);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    const fetchTranscripts = async () => {
      setIsLoadingTranscripts(true);
      try {
        const response = await fetch(`${API_URL}/api/meetings/${selectedSession.id}/transcriptions/final`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTranscripts(data);
        }
      } catch (error) {
        console.error('Failed to fetch transcripts:', error);
      } finally {
        setIsLoadingTranscripts(false);
      }
    };

    fetchSessionDetail();
    fetchTranscripts();
    fetchSummary(selectedSession.id);
  }, [selectedSession, fetchSummary]);

  // Poll for summary status when pending or processing
  useEffect(() => {
    if (!selectedSession || !summaryData) return;

    if (summaryData.status === 'pending' || summaryData.status === 'processing') {
      const pollInterval = setInterval(() => {
        fetchSummary(selectedSession.id);
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(pollInterval);
    }
  }, [selectedSession, summaryData?.status, fetchSummary]);

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

  const formatTranscriptTime = (startTimeMs: number, sessionStartTime?: string) => {
    if (!sessionStartTime) {
      const totalSeconds = Math.floor(startTimeMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const sessionStart = new Date(sessionStartTime).getTime();
    const elapsedMs = startTimeMs - sessionStart;
    const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

      {/* Session Detail Modal */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="!max-w-5xl w-[95vw] h-[85vh] p-0 flex flex-col">
          {selectedSession && (
            <>
              {/* Header */}
              <div className="p-6 border-b border-border flex-shrink-0">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-xl">
                    {selectedSession.title || '제목 없는 회의'}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {formatFullDate(selectedSession.startedAt)}
                  </DialogDescription>
                </DialogHeader>

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
                      {sessionDetail?.participants?.length || selectedSession.participantCount || 1}명 참가
                    </span>
                  </div>
                  {summaryData?.status === 'completed' && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">
                      요약 완료
                    </Badge>
                  )}
                  {(summaryData?.status === 'pending' || summaryData?.status === 'processing') && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      요약 생성 중
                    </Badge>
                  )}
                  {summaryData?.status === 'failed' && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-none">
                      요약 실패
                    </Badge>
                  )}
                  {transcripts.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none">
                      자막 {transcripts.length}개
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <Tabs defaultValue="summary" className="h-full flex flex-col">
                  <div className="px-6 pt-4 flex-shrink-0">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="summary">회의 요약</TabsTrigger>
                      <TabsTrigger value="transcript">전체 내용</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="summary" className="flex-1 min-h-0 mt-0 px-6 pb-6 overflow-hidden">
                    <ScrollArea className="h-full">
                      {isLoadingSummary ? (
                        <div className="py-4 space-y-4">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : summaryData?.status === 'completed' && summaryData.content ? (
                        <div className="py-4 space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600 font-medium">AI 요약 완료</span>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-table:text-foreground prose-th:text-foreground prose-td:text-foreground prose-th:border prose-td:border prose-th:border-border prose-td:border-border prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border-collapse">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {summaryData.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : summaryData?.status === 'processing' || summaryData?.status === 'pending' ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Loader2 className="h-7 w-7 text-primary animate-spin" />
                          </div>
                          <p className="text-foreground font-medium">
                            AI가 요약을 생성하고 있습니다
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            잠시만 기다려 주세요...
                          </p>
                          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>처리 중</span>
                          </div>
                        </div>
                      ) : summaryData?.status === 'failed' ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <XCircle className="h-7 w-7 text-red-500" />
                          </div>
                          <p className="text-foreground font-medium">
                            요약 생성에 실패했습니다
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            다시 시도해 주세요
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={handleRegenerateSummary}
                            disabled={isRegeneratingSummary}
                          >
                            {isRegeneratingSummary ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                재생성 중...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                다시 생성하기
                              </>
                            )}
                          </Button>
                        </div>
                      ) : summaryData?.status === 'skipped' ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                            <AlertCircle className="h-7 w-7 text-yellow-500" />
                          </div>
                          <p className="text-foreground font-medium">
                            요약할 내용이 없습니다
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            회의 중 기록된 자막이 없어 요약을 생성하지 않았습니다
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={handleRegenerateSummary}
                            disabled={isRegeneratingSummary}
                          >
                            {isRegeneratingSummary ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                생성 중...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                요약 생성하기
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="transcript" className="flex-1 min-h-0 mt-0 px-6 pb-6 overflow-hidden">
                    <ScrollArea className="h-full">
                      {isLoadingTranscripts ? (
                        <div className="py-4 space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                              <Skeleton className="h-4 w-full ml-8" />
                            </div>
                          ))}
                        </div>
                      ) : transcripts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                            <FileText className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium">
                            기록된 내용이 없습니다
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            회의 중 자막이 기록되지 않았습니다
                          </p>
                        </div>
                      ) : (
                        <div className="py-4 space-y-4">
                          {transcripts.map((item) => (
                            <div key={item.id}>
                              <div className="flex items-center gap-2 mb-1">
                                {item.speaker?.profileImage ? (
                                  <Image
                                    src={item.speaker.profileImage}
                                    alt={item.speaker.name}
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
                                    <span className="text-[10px] text-primary font-medium">
                                      {(item.speaker?.name || '참').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm font-medium text-primary">
                                  {item.speaker?.name || '참가자'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.relativeStartSec !== undefined
                                    ? `${Math.floor(item.relativeStartSec / 60)}:${Math.floor(item.relativeStartSec % 60).toString().padStart(2, '0')}`
                                    : formatTranscriptTime(item.startTimeMs, selectedSession?.startedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed pl-8">
                                {item.originalText}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-border bg-muted/30 flex-shrink-0">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
