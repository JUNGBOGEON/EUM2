'use client';

import { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Settings2,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface TTSControlsProps {
  ttsEnabled: boolean;
  isTogglingTTS: boolean;
  isPlaying: boolean;
  volume: number;
  queueLength: number;
  onToggleTTS: () => void;
  onSetVolume: (volume: number) => void;
  onSkipCurrent: () => void;
  onOpenSettings: () => void;
}

export function TTSControls({
  ttsEnabled,
  isTogglingTTS,
  isPlaying,
  volume,
  queueLength,
  onToggleTTS,
  onSetVolume,
  onSkipCurrent,
  onOpenSettings,
}: TTSControlsProps) {
  const [showVolumePopover, setShowVolumePopover] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {/* TTS Toggle Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTTS}
            disabled={isTogglingTTS}
            className={`h-12 w-12 rounded-full transition-colors relative ${
              ttsEnabled
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isTogglingTTS ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : ttsEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
            {/* Queue Badge */}
            {ttsEnabled && queueLength > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-white text-xs"
              >
                {queueLength > 9 ? '9+' : queueLength}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>
            {isTogglingTTS
              ? '처리 중...'
              : ttsEnabled
              ? '음성 재생 끄기'
              : '음성 재생 켜기'}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Volume & Settings (only when TTS enabled) */}
      {ttsEnabled && (
        <>
          {/* Volume Control Popover */}
          <Popover open={showVolumePopover} onOpenChange={setShowVolumePopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              className="w-48 bg-[#252525] border-white/10"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">볼륨</span>
                  <span className="text-sm text-white/60">{volume}%</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={([v]: number[]) => onSetVolume(v)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Skip Button (only when playing) */}
          {isPlaying && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSkipCurrent}
                  className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>건너뛰기</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>음성 설정</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
