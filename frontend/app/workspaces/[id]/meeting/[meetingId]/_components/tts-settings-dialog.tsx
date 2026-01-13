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
import {
  TRANSCRIPTION_LANGUAGES,
  getPollyVoices,
  getDefaultPollyVoice,
  PollyVoiceOption,
} from '@/lib/constants/languages';

interface TTSSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoices: Record<string, string>;
  onSelectVoice: (languageCode: string, voiceId: string) => void;
}

export function TTSSettingsDialog({
  open,
  onOpenChange,
  selectedVoices,
  onSelectVoice,
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
          <p className="text-sm text-white/60">
            각 언어별로 번역된 자막을 읽어줄 음성을 선택하세요.
          </p>

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
