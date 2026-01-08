'use client';

import { RefObject } from 'react';
import Image from 'next/image';
import { X, Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatElapsedTime } from '@/lib/utils/time';
import { TRANSCRIPTION_LANGUAGES } from '@/lib/constants/languages';
import type { TranscriptItem } from '../types';

interface TranscriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  isLoadingHistory: boolean;
  selectedLanguage: string;
  isChangingLanguage: boolean;
  onLanguageChange: (languageCode: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function TranscriptPanel({
  isOpen,
  onClose,
  transcripts,
  isTranscribing,
  isLoadingHistory,
  selectedLanguage,
  isChangingLanguage,
  onLanguageChange,
  containerRef,
}: TranscriptPanelProps) {
  const currentLang = TRANSCRIPTION_LANGUAGES.find((l) => l.code === selectedLanguage);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[360px] p-0 bg-[#1f1f1f] border-white/10 text-white"
      >
        <SheetHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-white">자막</SheetTitle>
              {isTranscribing && (
                <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                  녹음중
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Transcript Content */}
        <ScrollArea className="h-[calc(100vh-180px)]" ref={containerRef as any}>
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
                  {isTranscribing
                    ? '대화를 기다리는 중...'
                    : '자막이 자동으로 시작됩니다'}
                </p>
              </div>
            ) : (
              // Transcripts list
              transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`${item.isPartial ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {item.speakerProfileImage ? (
                      <Image
                        src={item.speakerProfileImage}
                        alt={item.speakerName}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                        <span className="text-[10px] text-blue-400 font-medium">
                          {item.speakerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-blue-400">
                      {item.speakerName}
                    </span>
                    <span className="text-xs text-white/40">
                      {formatElapsedTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed pl-8">
                    {item.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer: Language Selector + Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#1f1f1f] space-y-3">
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
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            {isChangingLanguage ? (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span>언어 변경 중...</span>
              </>
            ) : isTranscribing ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{currentLang?.flag} {currentLang?.name}로 자막 인식 중</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-gray-500 rounded-full" />
                <span>자막 시작 대기중</span>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
