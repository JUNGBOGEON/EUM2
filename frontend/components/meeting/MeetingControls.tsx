'use client';

interface MeetingControlsProps {
  muted: boolean;
  isVideoEnabled: boolean;
  isLocalUserSharing: boolean;
  showTranscript: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscript: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
}

export function MeetingControls({
  muted,
  isVideoEnabled,
  isLocalUserSharing,
  showTranscript,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleTranscript,
  onOpenSettings,
  onLeave,
}: MeetingControlsProps) {
  return (
    <footer className="flex-shrink-0 flex items-center justify-center gap-4 px-4 py-4 bg-[#252525] border-t border-[#ffffff14]">
      {/* Mute/Unmute */}
      <button
        onClick={onToggleMute}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
          muted
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
        }`}
        title={muted ? '음소거 해제' : '음소거'}
      >
        {muted ? (
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>

      {/* Video On/Off */}
      <button
        onClick={onToggleVideo}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
          !isVideoEnabled
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
        }`}
        title={isVideoEnabled ? '카메라 끄기' : '카메라 켜기'}
      >
        {isVideoEnabled ? (
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        )}
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
          isLocalUserSharing
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
        }`}
        title={isLocalUserSharing ? '화면 공유 중지' : '화면 공유'}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Transcript Toggle */}
      <button
        onClick={onToggleTranscript}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
          showTranscript
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
        }`}
        title={showTranscript ? '자막 패널 닫기' : '자막 패널 열기'}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ffffff14] hover:bg-[#ffffff29] transition-colors"
        title="장치 설정"
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Leave Meeting */}
      <button
        onClick={onLeave}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
        title="미팅 나가기"
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
          />
        </svg>
      </button>
    </footer>
  );
}
