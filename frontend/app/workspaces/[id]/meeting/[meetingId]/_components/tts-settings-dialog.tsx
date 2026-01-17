'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mic, ExternalLink, Loader2 } from 'lucide-react';
import {
  TRANSCRIPTION_LANGUAGES,
  getPollyVoices,
  getDefaultPollyVoice,
  PollyVoiceOption,
} from '@/lib/constants/languages';
import Link from 'next/link';

interface TTSSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoices: Record<string, string>;
  onSelectVoice: (languageCode: string, voiceId: string) => void;
  // Voice dubbing props
  hasVoiceEmbedding?: boolean;
  voiceDubbingEnabled?: boolean;
  isTogglingVoiceDubbing?: boolean;
  onToggleVoiceDubbing?: (enabled: boolean) => void;
}

export function TTSSettingsDialog({
  open,
  onOpenChange,
  selectedVoices,
  onSelectVoice,
  hasVoiceEmbedding = false,
  voiceDubbingEnabled = false,
  isTogglingVoiceDubbing = false,
  onToggleVoiceDubbing,
}: TTSSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#252525] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            음성 설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 내 목소리 섹션 */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">내 목소리</span>
                {voiceDubbingEnabled && (
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                    활성화
                  </Badge>
                )}
              </div>
              {hasVoiceEmbedding && onToggleVoiceDubbing && (
                <div className="flex items-center gap-2">
                  {isTogglingVoiceDubbing && (
                    <Loader2 className="h-3 w-3 animate-spin text-white/50" />
                  )}
                  <Switch
                    checked={voiceDubbingEnabled}
                    onCheckedChange={onToggleVoiceDubbing}
                    disabled={isTogglingVoiceDubbing}
                  />
                </div>
              )}
            </div>

            {hasVoiceEmbedding ? (
              <p className="text-xs text-white/50">
                {voiceDubbingEnabled
                  ? '다른 참가자에게 내 목소리로 번역 음성이 재생됩니다.'
                  : '활성화하면 다른 참가자에게 내 목소리로 번역 음성이 재생됩니다.'}
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">
                  음성을 등록하면 내 목소리로 번역할 수 있습니다.
                </p>
                <Link
                  href="/workspaces?tab=settings"
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  onClick={() => onOpenChange(false)}
                >
                  <span>등록하기</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-white/60 mb-4">
              각 언어별로 번역된 자막을 읽어줄 음성을 선택하세요.
            </p>
          </div>

          {TRANSCRIPTION_LANGUAGES.map((lang) => {
            const voices = getPollyVoices(lang.code);
            const selectedVoice = selectedVoices[lang.code] || getDefaultPollyVoice(lang.code);

            return (
              <div key={lang.code} className="space-y-2">
                <Label className="text-sm font-medium text-white/80">
                  {lang.flag} {lang.name}
                </Label>

                {voices.length > 0 ? (
                  <Select
                    value={selectedVoice}
                    onValueChange={(voiceId) => onSelectVoice(lang.code, voiceId)}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="음성 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {voices.map((voice) => (
                        <SelectItem
                          key={voice.id}
                          value={voice.id}
                          className="text-white focus:bg-white/10 focus:text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <div className="flex gap-1">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  voice.gender === 'Female'
                                    ? 'border-pink-500/50 text-pink-400'
                                    : 'border-blue-500/50 text-blue-400'
                                }`}
                              >
                                {voice.gender === 'Female' ? '여성' : '남성'}
                              </Badge>
                              {voice.isNeural && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-green-500/50 text-green-400"
                                >
                                  Neural
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-white/40">
                    사용 가능한 음성이 없습니다
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs text-white/40 pt-2 border-t border-white/10">
          <p>
            * Neural 음성은 더 자연스럽고 사람과 유사한 음성을 제공합니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
