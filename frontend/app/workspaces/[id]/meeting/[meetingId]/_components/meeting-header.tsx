'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

export function MeetingHeader({
  title,
  participantCount,
  participants = [],
  meetingStartTime,
  workspaceId,
}: MeetingHeaderProps) {
  const router = useRouter();
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

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

  const displayParticipants = participants.slice(0, 4);
  const remainingCount = participants.length > 4 ? participants.length - 4 : 0;

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-black border-b border-neutral-800">
      {/* Left: Back button + Title */}
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-neutral-400 hover:text-white hover:bg-neutral-900"
                onClick={() => router.push(`/workspaces/${workspaceId}`)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-neutral-900 border-neutral-800 text-white">
              <p>워크스페이스로 돌아가기</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-6 w-px bg-neutral-800" />

        <h1 className="text-base font-medium tracking-tight text-white">{title}</h1>
      </div>

      {/* Center: Timer */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="text-sm font-mono tracking-wider text-neutral-400">{elapsedTime}</span>
      </div>

      {/* Right: Participants */}
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {displayParticipants.map((p) => (
            <Avatar key={p.id} className="h-8 w-8 border-2 border-black">
              <AvatarImage src={p.profileImage} alt={p.name} />
              <AvatarFallback className="text-xs bg-neutral-800 text-white">
                {p.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="h-8 w-8 bg-neutral-900 border-2 border-black flex items-center justify-center">
              <span className="text-xs font-mono text-neutral-400">+{remainingCount}</span>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-neutral-800" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Users className="h-4 w-4" />
                <span className="font-mono">{participantCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-neutral-900 border-neutral-800 text-white">
              <p>{participantCount}명 참가</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
