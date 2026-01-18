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
  // Mute original audio when translation is enabled
  muteOriginalOnTranslation: boolean;
  onToggleMuteOriginal: () => void;
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
  muteOriginalOnTranslation,
  onToggleMuteOriginal,
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
        className="w-72 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1"
        align="center"
        side="top"
        sideOffset={12}
      >
        {/* Translation Toggle - Main Control */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${translationEnabled ? 'bg-blue-500/20' : 'bg-white/10'}`}>
              <Languages className={`h-4 w-4 ${translationEnabled ? 'text-blue-400' : 'text-white/70'}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-white block">실시간 번역</span>
              <span className="text-xs text-white/50">음성을 번역합니다</span>
            </div>
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
            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* TTS Toggle */}
            <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ttsEnabled ? 'bg-green-500/20' : 'bg-white/10'}`}>
                  {ttsEnabled ? (
                    <Volume2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-white/70" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">음성 재생</span>
                  <span className="text-xs text-white/50">번역을 음성으로 듣기</span>
                </div>
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
              <div className="px-4 py-3 bg-white/5 rounded-lg mx-1 my-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/80">번역 음성 볼륨</span>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{ttsVolume}%</span>
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

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Mute Original Audio Toggle */}
            <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${muteOriginalOnTranslation ? 'bg-orange-500/20' : 'bg-white/10'}`}>
                  {muteOriginalOnTranslation ? (
                    <VolumeX className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Mic className="h-4 w-4 text-white/70" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">원본 음성 음소거</span>
                  <span className="text-xs text-white/50">
                    {muteOriginalOnTranslation ? '상대방 원본 목소리 꺼짐' : '상대방 원본 목소리 들림'}
                  </span>
                </div>
              </div>
              <Switch
                checked={muteOriginalOnTranslation}
                onCheckedChange={onToggleMuteOriginal}
                disabled={isOriginalVolumeFading}
              />
            </div>

            {/* Original Audio Volume Slider (only shown when NOT muted) */}
            {!muteOriginalOnTranslation && (
              <div className="px-4 py-3 bg-white/5 rounded-lg mx-1 my-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/80">원본 음성 볼륨</span>
                  <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">{originalVolume}%</span>
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
            )}

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Voice Settings - 내 목소리 설정 포함 */}
            <DropdownMenuItem
              className="flex items-center gap-3 px-4 py-3 text-white focus:bg-white/5 focus:text-white cursor-pointer rounded-lg mx-1 mb-1"
              onClick={(e) => {
                e.preventDefault();
                onOpenTTSSettings();
                setDropdownOpen(false);
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Settings2 className="h-4 w-4 text-white/70" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">음성 설정</span>
                <span className="text-xs text-white/50 block">목소리 및 속도 조절</span>
              </div>
              {hasVoiceEmbedding && voiceDubbingEnabled && (
                <Badge variant="secondary" className="h-6 px-2 bg-purple-500/20 text-purple-400 text-xs font-medium">
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
