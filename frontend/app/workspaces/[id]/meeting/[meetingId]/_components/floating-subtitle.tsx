'use client';

import Image from 'next/image';
import type { RecentTranslation } from '@/hooks/meeting';

interface FloatingSubtitleProps {
  translations: RecentTranslation[];
  getParticipantByAttendeeId?: (attendeeId: string) => { name: string; profileImage?: string } | undefined;
}

/**
 * 플로팅 자막 컴포넌트
 * 
 * 유튜브 스타일의 실시간 번역 자막을 비디오 영역 하단에 오버레이로 표시
 * - 발화자 프로필 이미지
 * - 발화자 이름
 * - 번역된 메시지 (크게)
 * - 원본 메시지 (작게)
 * - 부드러운 등장/퇴장 애니메이션
 */
export function FloatingSubtitle({
  translations,
  getParticipantByAttendeeId,
}: FloatingSubtitleProps) {
  if (translations.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {translations.map((translation) => {
        // 발화자 정보 조회
        const speaker = getParticipantByAttendeeId?.(translation.speakerId);
        const speakerName = speaker?.name || translation.speakerName;
        const speakerProfileImage = speaker?.profileImage;

        // 등장/퇴장 애니메이션 클래스
        const animationClass = translation.isExiting
          ? 'animate-subtitle-exit'
          : 'animate-subtitle-enter';

        return (
          <div
            key={translation.resultId}
            className={`flex items-center gap-3 px-4 py-3 
                       bg-black/80 backdrop-blur-md rounded-2xl
                       shadow-lg border border-white/10
                       max-w-2xl ${animationClass}`}
          >
            {/* 프로필 이미지 */}
            <div className="flex-shrink-0">
              {speakerProfileImage ? (
                <Image
                  src={speakerProfileImage}
                  alt={speakerName}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <span className="text-sm text-blue-400 font-medium">
                    {speakerName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              {/* 발화자 이름 */}
              <p className="text-xs text-blue-400 font-medium mb-0.5">
                {speakerName}
              </p>

              {/* 번역된 텍스트 */}
              <p className="text-white text-sm font-medium leading-snug">
                {translation.translatedText}
              </p>

              {/* 원본 텍스트 (작게) */}
              <p className="text-white/50 text-xs mt-1 line-clamp-1">
                {translation.originalText}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
