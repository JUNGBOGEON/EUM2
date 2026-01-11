'use client';

import Image from 'next/image';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LocalTranscriptItem } from './hooks/use-session-data';

interface TranscriptSectionProps {
  transcripts: LocalTranscriptItem[];
  sessionStartedAt?: string;
  isLoading: boolean;
}

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

export function TranscriptSection({
  transcripts,
  sessionStartedAt,
  isLoading,
}: TranscriptSectionProps) {
  if (isLoading) {
    return (
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
    );
  }

  if (transcripts.length === 0) {
    return (
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
    );
  }

  return (
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
                : formatTranscriptTime(item.startTimeMs, sessionStartedAt)}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-8">
            {item.originalText}
          </p>
        </div>
      ))}
    </div>
  );
}
