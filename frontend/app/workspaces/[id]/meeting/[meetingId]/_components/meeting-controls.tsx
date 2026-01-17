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
  AudioLines,
  Loader2,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { TranslationControls } from './translation-controls';
import { DelaySettingsControl } from './delay-settings-control';

interface MeetingControlsProps {
  muted: boolean;
  isVideoEnabled: boolean;
  isLocalUserSharing: boolean;
  isHost?: boolean;
  translationEnabled?: boolean;
  isTogglingTranslation?: boolean;
  // Voice Focus (노이즈 억제)
  isVoiceFocusSupported?: boolean;
  isVoiceFocusEnabled?: boolean;
  isVoiceFocusLoading?: boolean;
  // 화이트보드
  isWhiteboardEnabled?: boolean;
  // TTS
  ttsEnabled?: boolean;
  isTogglingTTS?: boolean;
  isTTSPlaying?: boolean;
  ttsVolume?: number;
  ttsQueueLength?: number;
  // Media Delay
  delayEnabled?: boolean;
  delayMs?: number;
  // Original Audio Volume
  originalVolume?: number;
  isOriginalVolumeFading?: boolean;
  // Voice dubbing (내 목소리)
  hasVoiceEmbedding?: boolean;
  voiceDubbingEnabled?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleTranslation?: () => void;
  onToggleVoiceFocus?: () => void;
  onToggleWhiteboard?: () => void;
  onToggleTTS?: () => void;
  onSetTTSVolume?: (volume: number) => void;
  onOpenTTSSettings?: () => void;
  onToggleDelay?: () => void;
  onDelayMsChange?: (ms: number) => void;
  onSetOriginalVolume?: (volume: number) => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  onEndMeeting?: () => void;
}

export function MeetingControls({
  muted,
  isVideoEnabled,
  isLocalUserSharing,
  isHost = false,
  translationEnabled = false,
  isTogglingTranslation = false,
  isVoiceFocusSupported = false,
  isVoiceFocusEnabled = false,
  isVoiceFocusLoading = false,
  isWhiteboardEnabled = false,
  ttsEnabled = false,
  isTogglingTTS = false,
  isTTSPlaying = false,
  ttsVolume = 80,
  ttsQueueLength = 0,
  delayEnabled = false,
  delayMs = 1500,
  originalVolume = 0,
  isOriginalVolumeFading = false,
  hasVoiceEmbedding = false,
  voiceDubbingEnabled = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleTranslation,
  onToggleVoiceFocus,
  onToggleWhiteboard,
  onToggleTTS,
  onSetTTSVolume,
  onOpenTTSSettings,
  onToggleDelay,
  onDelayMsChange,
  onSetOriginalVolume,
  onOpenSettings,
  onLeave,
  onEndMeeting,
}: MeetingControlsProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  return (
    <TooltipProvider>
      <footer className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-black border-t border-neutral-800">
        {/* Left: Settings */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                className="h-12 w-12 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
              <p>설정</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Center: Primary Controls */}
        <div className="flex items-center gap-3">
          {/* Audio Control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleMute}
                className={`h-14 w-14 transition-colors ${
                  muted
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
              <p>{muted ? '음소거 해제' : '음소거'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Video Control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleVideo}
                className={`h-14 w-14 transition-colors ${
                  !isVideoEnabled
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
              >
                {isVideoEnabled ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <VideoOff className="h-6 w-6" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
              <p>{isVideoEnabled ? '비디오 끄기' : '비디오 켜기'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Screen Share */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleScreenShare}
                className={`h-14 w-14 transition-colors ${
                  isLocalUserSharing
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
              >
                {isLocalUserSharing ? (
                  <MonitorOff className="h-6 w-6" />
                ) : (
                  <Monitor className="h-6 w-6" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
              <p>{isLocalUserSharing ? '공유 중지' : '화면 공유'}</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-10 bg-neutral-800 mx-1" />

          {/* Translation & TTS Controls */}
          {onToggleTranslation && onToggleTTS && onSetTTSVolume && onOpenTTSSettings && onSetOriginalVolume && (
            <TranslationControls
              translationEnabled={translationEnabled}
              isTogglingTranslation={isTogglingTranslation}
              onToggleTranslation={onToggleTranslation}
              ttsEnabled={ttsEnabled}
              isTogglingTTS={isTogglingTTS}
              isTTSPlaying={isTTSPlaying}
              ttsVolume={ttsVolume}
              ttsQueueLength={ttsQueueLength}
              onToggleTTS={onToggleTTS}
              onSetTTSVolume={onSetTTSVolume}
              onOpenTTSSettings={onOpenTTSSettings}
              originalVolume={originalVolume}
              isOriginalVolumeFading={isOriginalVolumeFading}
              onSetOriginalVolume={onSetOriginalVolume}
              hasVoiceEmbedding={hasVoiceEmbedding}
              voiceDubbingEnabled={voiceDubbingEnabled}
            />
          )}

          {/* Voice Focus (Noise Suppression) */}
          {onToggleVoiceFocus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleVoiceFocus}
                  disabled={isVoiceFocusLoading || !isVoiceFocusSupported}
                  className={`h-12 w-12 transition-colors ${
                    !isVoiceFocusSupported
                      ? 'bg-neutral-950 text-neutral-700 cursor-not-allowed'
                      : isVoiceFocusEnabled
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {isVoiceFocusLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <AudioLines className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
                <p>
                  {!isVoiceFocusSupported
                    ? '지원되지 않음'
                    : isVoiceFocusLoading
                    ? '로딩 중...'
                    : isVoiceFocusEnabled
                    ? '노이즈 억제 끄기'
                    : '노이즈 억제 켜기'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Media Delay Settings */}
          {onToggleDelay && onDelayMsChange && (
            <DelaySettingsControl
              delayEnabled={delayEnabled}
              delayMs={delayMs}
              onToggleDelay={onToggleDelay}
              onDelayMsChange={onDelayMsChange}
            />
          )}

          {/* Whiteboard Toggle */}
          {onToggleWhiteboard && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onToggleWhiteboard}
                  className={`h-12 px-5 transition-colors gap-2 ${
                    isWhiteboardEnabled
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <PenTool className="h-5 w-5" />
                  <span className="text-sm font-medium">화이트보드</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
                <p>{isWhiteboardEnabled ? '화이트보드 닫기' : '화이트보드 열기'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right: Leave/End Controls */}
        <div className="flex items-center gap-3">
          {/* Leave Meeting */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setShowLeaveDialog(true)}
                className="h-12 px-5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors gap-2"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-medium">나가기</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
              <p>회의 나가기</p>
            </TooltipContent>
          </Tooltip>

          {/* End Meeting (Host only) */}
          {isHost && onEndMeeting && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  onClick={() => setShowEndDialog(true)}
                  className="h-12 px-5 bg-white text-black hover:bg-neutral-200 transition-colors gap-2"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span className="text-sm font-medium">종료</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-900 border-neutral-800 text-white">
                <p>전체 회의 종료</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Leave Dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent className="bg-neutral-950 border-neutral-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white tracking-tight">회의에서 나가시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-500">
                회의는 계속 진행되며 나중에 다시 참여할 수 있습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onLeave}
                className="bg-white text-black hover:bg-neutral-200"
              >
                나가기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* End Meeting Dialog */}
        <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <AlertDialogContent className="bg-neutral-950 border-neutral-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white tracking-tight">모든 참가자의 회의를 종료하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-500">
                모든 참가자가 연결 해제됩니다. 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onEndMeeting?.();
                  setShowEndDialog(false);
                }}
                className="bg-white text-black hover:bg-neutral-200"
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
