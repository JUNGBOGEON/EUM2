'use client';

import { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Settings,
  LogOut,
  PhoneOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MeetingControlsProps {
  muted: boolean;
  isVideoEnabled: boolean;
  isLocalUserSharing: boolean;
  isHost?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  onEndMeeting?: () => void;
}

export function MeetingControls({
  muted,
  isVideoEnabled,
  isLocalUserSharing,
  isHost = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onOpenSettings,
  onLeave,
  onEndMeeting,
}: MeetingControlsProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  return (
    <TooltipProvider>
      <footer className="h-20 flex-shrink-0 flex items-center justify-center gap-2 px-4 bg-[#1a1a1a] border-t border-white/10">
        {/* Audio Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              className={`h-12 w-12 rounded-full transition-colors ${
                muted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{muted ? '마이크 켜기' : '마이크 끄기'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Video Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVideo}
              className={`h-12 w-12 rounded-full transition-colors ${
                !isVideoEnabled
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isVideoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isVideoEnabled ? '카메라 끄기' : '카메라 켜기'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Screen Share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleScreenShare}
              className={`h-12 w-12 rounded-full transition-colors ${
                isLocalUserSharing
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isLocalUserSharing ? (
                <MonitorOff className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isLocalUserSharing ? '화면 공유 중지' : '화면 공유'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>장치 설정</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-2 bg-white/20" />

        {/* Leave Meeting */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setShowLeaveDialog(true)}
              className="h-12 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white gap-2"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">나가기</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>회의에서 나가기</p>
          </TooltipContent>
        </Tooltip>

        {/* End Meeting (Host only) */}
        {isHost && onEndMeeting && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                onClick={() => setShowEndDialog(true)}
                className="h-12 px-4 rounded-full bg-red-500 hover:bg-red-600 text-white gap-2"
              >
                <PhoneOff className="h-5 w-5" />
                <span className="text-sm font-medium">회의 종료</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>모든 참가자의 회의 종료</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Leave Dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent className="bg-[#252525] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">회의에서 나가시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                회의는 계속 진행되며, 나중에 다시 참가할 수 있습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onLeave}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                나가기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* End Meeting Dialog */}
        <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <AlertDialogContent className="bg-[#252525] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">회의를 종료하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                모든 참가자의 회의가 종료됩니다. 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onEndMeeting?.();
                  setShowEndDialog(false);
                }}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                회의 종료
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </footer>
    </TooltipProvider>
  );
}
