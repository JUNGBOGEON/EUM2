'use client';

import { RefObject } from 'react';
import Image from 'next/image';
import { formatElapsedTime } from '@/lib/utils/time';
import type { TranscriptItem } from '@/app/workspaces/[id]/meeting/[meetingId]/types';

interface TranscriptPanelProps {
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  isLoadingHistory: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function TranscriptPanel({
  transcripts,
  isTranscribing,
  isLoadingHistory,
  onClose,
  containerRef,
}: TranscriptPanelProps) {
  return (
    <div className="w-80 flex-shrink-0 bg-[#252525] border-l border-[#ffffff14] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#ffffff14]">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-[#ffffffcf]">자막</h3>
          {isTranscribing && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[11px] text-red-400">녹음중</span>
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-[#ffffff71] hover:text-white">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingHistory ? (
          <div className="text-center py-8">
            <svg
              className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-[13px] text-[#ffffff71]">
              이전 자막 불러오는 중...
            </p>
          </div>
        ) : transcripts.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-[#ffffff29] mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <p className="text-[13px] text-[#ffffff71]">
              {isTranscribing
                ? '대화를 기다리는 중...'
                : '자막이 자동으로 시작됩니다'}
            </p>
          </div>
        ) : (
          transcripts.map((item) => (
            <div key={item.id} className={`${item.isPartial ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                {item.speakerProfileImage ? (
                  <Image
                    src={item.speakerProfileImage}
                    alt={item.speakerName}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-medium">
                    {item.speakerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[12px] font-medium text-blue-400">
                  {item.speakerName}
                </span>
                <span className="text-[10px] text-[#ffffff50]">
                  {formatElapsedTime(item.timestamp)}
                </span>
              </div>
              <p className="text-[13px] text-[#ffffffcf] leading-relaxed pl-7">
                {item.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 상태 표시 영역 */}
      <div className="p-3 border-t border-[#ffffff14]">
        <div className="flex items-center justify-center gap-2 text-[12px] text-[#ffffff71]">
          {isTranscribing ? (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span>자막 활성화됨 (회의 종료 시 자동 저장)</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-gray-500 rounded-full" />
              <span>자막 대기중...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
