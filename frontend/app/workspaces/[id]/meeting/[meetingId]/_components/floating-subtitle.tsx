'use client';

import Image from 'next/image';
import type { RecentTranslation } from '@/hooks/meeting';

interface FloatingSubtitleProps {
  translations: RecentTranslation[];
  getParticipantByAttendeeId?: (attendeeId: string) => { name: string; profileImage?: string } | undefined;
}

/**
 * Floating Subtitle Component
 *
 * Displays real-time translated subtitles as an overlay at the bottom of the video area
 * - Speaker profile image
 * - Speaker name
 * - Translated message (large)
 * - Original message (small)
 * - Smooth enter/exit animations
 */
export function FloatingSubtitle({
  translations,
  getParticipantByAttendeeId,
}: FloatingSubtitleProps) {
  if (translations.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {translations.map((translation) => {
        // Get speaker info
        const speaker = getParticipantByAttendeeId?.(translation.speakerId);
        const speakerName = speaker?.name || translation.speakerName;
        const speakerProfileImage = speaker?.profileImage;

        // Enter/exit animation class
        const animationClass = translation.isExiting
          ? 'animate-subtitle-exit'
          : 'animate-subtitle-enter';

        return (
          <div
            key={translation.resultId}
            className={`flex items-center gap-4 px-5 py-4
                       bg-black/90 backdrop-blur-sm
                       border border-neutral-800
                       max-w-2xl ${animationClass}`}
          >
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {speakerProfileImage ? (
                <Image
                  src={speakerProfileImage}
                  alt={speakerName}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-neutral-900 flex items-center justify-center rounded-full">
                  <span className="text-sm text-neutral-400 font-medium">
                    {speakerName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {/* Speaker Name */}
              <p className="text-xs text-neutral-500 font-medium mb-1 tracking-tight">
                {speakerName}
              </p>

              {/* Translated Text */}
              <p className="text-white text-base font-medium leading-snug tracking-tight">
                {translation.translatedText}
              </p>

              {/* Original Text (small) */}
              <p className="text-neutral-600 text-xs mt-1.5 line-clamp-1 font-mono">
                {translation.originalText}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
