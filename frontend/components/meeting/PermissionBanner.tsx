'use client';

interface PermissionBannerProps {
  message: string;
  onClose: () => void;
}

export function PermissionBanner({ message, onClose }: PermissionBannerProps) {
  return (
    <div className="flex-shrink-0 bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
      <p className="text-[13px] text-yellow-200 text-center">
        ⚠️ {message}
        <button
          onClick={onClose}
          className="ml-2 underline hover:no-underline"
        >
          닫기
        </button>
      </p>
    </div>
  );
}
