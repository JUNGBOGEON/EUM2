'use client';

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = '미팅에 연결 중...' }: LoadingViewProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-[#191919]">
      <div className="text-center">
        <div className="h-8 w-8 border-2 border-[#ffffffcf] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[15px] text-[#ffffff71]">{message}</p>
      </div>
    </div>
  );
}
