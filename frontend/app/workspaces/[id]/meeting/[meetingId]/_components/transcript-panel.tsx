'use client';

import { RefObject, useEffect } from 'react';
import Image from 'next/image';
import { Languages, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatElapsedTime } from '@/lib/utils/time';
import { TRANSCRIPTION_LANGUAGES } from '@/lib/constants/languages';
import type { TranscriptItem, TranslatedTranscript } from '@/lib/types';

interface TranscriptPanelProps {
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  isLoadingHistory: boolean;
  selectedLanguage: string;
  isChangingLanguage: boolean;
  onLanguageChange: (languageCode: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  getParticipantByAttendeeId?: (attendeeId: string) => { name: string; profileImage?: string };
  // 번역 관련
  translationEnabled?: boolean;
  getTranslation?: (resultId: string) => TranslatedTranscript | undefined;
}

export function TranscriptPanel({
  transcripts,
  isTranscribing,
  isLoadingHistory,
  selectedLanguage,
  isChangingLanguage,
  onLanguageChange,
  containerRef,
  getParticipantByAttendeeId,
  translationEnabled = false,
  getTranslation,
}: TranscriptPanelProps) {
  const currentLang = TRANSCRIPTION_LANGUAGES.find((l) => l.code === selectedLanguage);

  // 자막 추가 시 자동 스크롤
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="w-[360px] flex-shrink-0 flex flex-col bg-[#1f1f1f] border-l border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold">자막</h2>
          {isTranscribing && (
            <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-none">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
              녹음중
            </Badge>
          )}
        </div>
      </div>

      {/* Transcript Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        <div className="p-4 space-y-4">
          {isLoadingHistory ? (
            // Loading skeletons
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full bg-white/10" />
                    <Skeleton className="h-4 w-20 bg-white/10" />
                    <Skeleton className="h-3 w-12 bg-white/10" />
                  </div>
                  <Skeleton className="h-4 w-full ml-8 bg-white/10" />
                </div>
              ))}
            </div>
          ) : transcripts.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Languages className="h-8 w-8 text-white/30" />
              </div>
              <p className="text-white/50 text-sm">
                대화를 기다리는 중...
              </p>
            </div>
          ) : (
            // Transcripts list
            transcripts.map((item) => {
              // 동적으로 화자 정보 조회 (최신 참가자 정보 사용)
              const dynamicSpeaker = item.speakerId ? getParticipantByAttendeeId?.(item.speakerId) : undefined;
              const speakerName = dynamicSpeaker?.name || item.speakerName;
              const speakerProfileImage = dynamicSpeaker?.profileImage || item.speakerProfileImage;

              // 번역 조회
              const translation = translationEnabled && getTranslation ? getTranslation(item.id) : undefined;
              const targetLang = translation ? TRANSCRIPTION_LANGUAGES.find((l) => l.code === translation.targetLanguage) : undefined;

              return (
                <div
                  key={item.id}
                  className={`${item.isPartial ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {speakerProfileImage ? (
                      <Image
                        src={speakerProfileImage}
                        alt={speakerName}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                        <span className="text-[10px] text-blue-400 font-medium">
                          {speakerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-blue-400">
                      {speakerName}
                    </span>
                    {currentLang && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-white/20 text-white/50">
                        {currentLang.flag}
                      </Badge>
                    )}
                    <span className="text-xs text-white/40">
                      {formatElapsedTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed pl-8">
                    {item.text}
                  </p>
                  {/* 번역된 텍스트 표시 */}
                  {translation && (
                    <p className="text-sm text-blue-300/80 leading-relaxed pl-8 mt-1 italic">
                      {targetLang?.flag} {translation.translatedText}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer: Language Selector + Status */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">언어</span>
          <Select
            value={selectedLanguage}
            onValueChange={onLanguageChange}
            disabled={isChangingLanguage}
          >
            <SelectTrigger className="flex-1 h-9 bg-white/5 border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#252525] border-white/10">
              {TRANSCRIPTION_LANGUAGES.map((lang) => (
                <SelectItem
                  key={lang.code}
                  value={lang.code}
                  className="text-white hover:bg-white/10 focus:bg-white/10"
                >
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isChangingLanguage && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col items-center justify-center gap-1 text-xs text-white/40">
          {isChangingLanguage ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span>언어 변경 중...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{currentLang?.flag} {currentLang?.name}로 자막 인식 중</span>
            </div>
          )}
          {translationEnabled && (
            <div className="flex items-center gap-2 text-blue-400">
              <Languages className="h-3 w-3" />
              <span>다른 언어 → {currentLang?.flag} {currentLang?.name}로 번역 중</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
