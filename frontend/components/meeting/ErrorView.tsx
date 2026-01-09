'use client';

interface ErrorViewProps {
  error: string;
  onBack: () => void;
  backLabel?: string;
}

export function ErrorView({
  error,
  onBack,
  backLabel = '워크스페이스로 돌아가기',
}: ErrorViewProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-[#191919]">
      <div className="text-center max-w-md px-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-[18px] font-medium text-[#ffffffcf] mb-2">
          미팅 참가 실패
        </h2>
        <p className="text-[15px] text-[#ffffff71] mb-6">{error}</p>
        <button
          onClick={onBack}
          className="px-5 py-2 text-[14px] font-medium text-white bg-[#37352f] hover:bg-[#2f2f2f] rounded-full transition-colors"
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
