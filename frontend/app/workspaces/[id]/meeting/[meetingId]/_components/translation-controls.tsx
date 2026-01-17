'use client';

import { useState } from 'react';
import {
  Languages,
  Volume2,
  VolumeX,
  Settings2,
  ChevronDown,
  Loader2,
  Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface TranslationControlsProps {
  // Translation state
  translationEnabled: boolean;
  isTogglingTranslation: boolean;
  onToggleTranslation: () => void;
  // TTS state
  ttsEnabled: boolean;
  isTogglingTTS: boolean;
  isTTSPlaying: boolean;
  ttsVolume: number;
  ttsQueueLength: number;
  // TTS actions
  onToggleTTS: () => void;
  onSetTTSVolume: (volume: number) => void;
  onOpenTTSSettings: () => void;
  // Original audio volume
  originalVolume: number;
  isOriginalVolumeFading?: boolean;
  onSetOriginalVolume: (volume: number) => void;
  // Voice dubbing (내 목소리)
  hasVoiceEmbedding?: boolean;
  voiceDubbingEnabled?: boolean;
}

export function TranslationControls({
  translationEnabled,
  isTogglingTranslation,
  onToggleTranslation,
  ttsEnabled,
  isTogglingTTS,
  isTTSPlaying,
  ttsVolume,
  ttsQueueLength,
  onToggleTTS,
  onSetTTSVolume,
  onOpenTTSSettings,
  originalVolume,
  isOriginalVolumeFading = false,
  onSetOriginalVolume,
  hasVoiceEmbedding = false,
  voiceDubbingEnabled = false,
}: TranslationControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`h-12 px-3 rounded-full transition-colors gap-1.5 relative ${
            translationEnabled
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {isTogglingTranslation ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Languages className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">번역</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
          {/* TTS Playing indicator */}
          {translationEnabled && ttsEnabled && isTTSPlaying && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-green-500 text-white text-xs animate-pulse"
            >
              <Volume2 className="h-3 w-3" />
            </Badge>
          )}
          {/* Queue count */}
          {translationEnabled && ttsEnabled && ttsQueueLength > 0 && !isTTSPlaying && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-600 text-white text-xs"
            >
              {ttsQueueLength > 9 ? '9+' : ttsQueueLength}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 bg-[#252525] border-white/10"
        align="center"
        side="top"
        sideOffset={8}
      >
        {/* Translation Toggle */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white">실시간 번역</span>
          </div>
          <Switch
            checked={translationEnabled}
            onCheckedChange={() => {
              onToggleTranslation();
            }}
            disabled={isTogglingTranslation}
          />
        </div>

        {translationEnabled && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />

            {/* TTS Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                {ttsEnabled ? (
                  <Volume2 className="h-4 w-4 text-green-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-white/70" />
                )}
                <span className="text-sm text-white">음성 재생</span>
              </div>
              <Switch
                checked={ttsEnabled}
                onCheckedChange={() => {
                  onToggleTTS();
                }}
                disabled={isTogglingTTS}
              />
            </div>

            {/* TTS Volume Slider (when TTS enabled) */}
            {ttsEnabled && (
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">번역 음성 볼륨</span>
                  <span className="text-xs text-white/60">{ttsVolume}%</span>
                </div>
                <Slider
                  value={[ttsVolume]}
                  onValueChange={([v]: number[]) => onSetTTSVolume(v)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            )}

            <DropdownMenuSeparator className="bg-white/10" />

            {/* Original Audio Volume */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white">원본 음성</span>
                {isOriginalVolumeFading && (
                  <Loader2 className="h-3 w-3 animate-spin text-white/50" />
                )}
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">
                  {originalVolume === 0 ? '음소거' : `${originalVolume}%`}
                </span>
                <span className="text-xs text-white/40">기본: 음소거</span>
              </div>
              <Slider
                value={[originalVolume]}
                onValueChange={([v]: number[]) => onSetOriginalVolume(v)}
                max={100}
                step={5}
                className="w-full"
                disabled={isOriginalVolumeFading}
              />
            </div>

            <DropdownMenuSeparator className="bg-white/10" />

            {/* Voice Settings - 내 목소리 설정 포함 */}
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-white focus:bg-white/10 focus:text-white cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                onOpenTTSSettings();
                setDropdownOpen(false);
              }}
            >
              <Settings2 className="h-4 w-4 text-white/70" />
              <span className="text-sm">음성 설정</span>
              {hasVoiceEmbedding && voiceDubbingEnabled && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 bg-purple-500/20 text-purple-400 text-xs">
                  내 목소리
                </Badge>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
