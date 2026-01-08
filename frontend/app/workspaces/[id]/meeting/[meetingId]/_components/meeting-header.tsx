'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Users, Timer, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Participant {
  id: string;
  name: string;
  profileImage?: string;
}

interface MeetingHeaderProps {
  title: string;
  participantCount: number;
  participants?: Participant[];
  meetingStartTime?: number | null;
  workspaceId: string;
  meetingId: string;
}

export function MeetingHeader({
  title,
  participantCount,
  participants = [],
  meetingStartTime,
  workspaceId,
  meetingId,
}: MeetingHeaderProps) {
  const router = useRouter();
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [copied, setCopied] = useState(false);

  // Timer
  useEffect(() => {
    if (!meetingStartTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = now - meetingStartTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/workspaces/${workspaceId}/meeting/${meetingId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayParticipants = participants.slice(0, 3);
  const remainingCount = participants.length > 3 ? participants.length - 3 : 0;

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-[#1a1a1a] border-b border-white/10">
      {/* Left: Back button + Title */}
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => router.push(`/workspaces/${workspaceId}`)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>워크스페이스로 돌아가기</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-medium text-white/90">{title}</h1>
          <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-none">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
            녹화 중
          </Badge>
        </div>
      </div>

      {/* Center: Timer */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Timer className="h-4 w-4 text-white/50" />
        <span className="text-sm font-mono text-white/70">{elapsedTime}</span>
      </div>

      {/* Right: Participants + Copy Link */}
      <div className="flex items-center gap-3">
        {/* Participants */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {displayParticipants.map((p) => (
              <Avatar key={p.id} className="h-7 w-7 border-2 border-[#1a1a1a]">
                <AvatarImage src={p.profileImage} alt={p.name} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary-foreground">
                  {p.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <div className="h-7 w-7 rounded-full bg-white/10 border-2 border-[#1a1a1a] flex items-center justify-center">
                <span className="text-[10px] text-white/70">+{remainingCount}</span>
              </div>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-sm text-white/60">
                  <Users className="h-4 w-4" />
                  <span>{participantCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{participantCount}명 참가 중</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Copy Link Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white/60 hover:text-white hover:bg-white/10"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-green-400" />
                    <span className="text-xs">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    <span className="text-xs">링크 복사</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>회의 링크 복사</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
