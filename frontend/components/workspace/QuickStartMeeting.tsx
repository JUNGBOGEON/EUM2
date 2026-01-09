'use client';

import { useState } from 'react';

interface QuickStartMeetingProps {
  onStart: (title?: string) => Promise<void>;
  isStarting?: boolean;
}

export function QuickStartMeeting({ onStart, isStarting = false }: QuickStartMeetingProps) {
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [title, setTitle] = useState('');

  const handleStart = async () => {
    await onStart(title || undefined);
    setTitle('');
    setShowTitleInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  return (
    <div className="mx-6 mt-6">
      <div className="bg-[#f7f6f3] rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-[#37352f]">
              새 회의 시작하기
            </h3>
            <p className="mt-1 text-[14px] text-[#37352f99]">
              팀원들과 실시간 화상회의를 시작하세요. 회의 내용은 자동으로 기록됩니다.
            </p>

            <div className="mt-4 flex items-center gap-3">
              {showTitleInput ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="회의 제목 (선택사항)"
                    className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-[#e3e2e0] text-[14px] text-[#37352f] placeholder:text-[#37352f66] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleStart}
                    disabled={isStarting}
                    className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-[14px] hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isStarting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>시작 중...</span>
                      </>
                    ) : (
                      <span>시작</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTitleInput(false);
                      setTitle('');
                    }}
                    className="p-2.5 text-[#37352f99] hover:text-[#37352f] hover:bg-[#e3e2e080] rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onStart()}
                    disabled={isStarting}
                    className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-[14px] hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isStarting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>시작 중...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>즉시 시작</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowTitleInput(true)}
                    className="flex items-center gap-2 bg-white text-[#37352f] px-5 py-2.5 rounded-xl font-medium text-[14px] border border-[#e3e2e0] hover:bg-[#f7f6f3] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>제목 추가</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
