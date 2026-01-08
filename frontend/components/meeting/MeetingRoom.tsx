'use client';

import React from 'react';
import {
  VideoTileGrid,
  useLocalVideo,
  useToggleLocalMute,
  useContentShareControls,
  useContentShareState,
  useMeetingManager,
  useAudioVideo,
  useRosterState,
} from 'amazon-chime-sdk-component-library-react';

interface MeetingRoomProps {
  meetingTitle: string;
  onLeave: () => void;
}

export function MeetingRoom({ meetingTitle, onLeave }: MeetingRoomProps) {
  const { isVideoEnabled, toggleVideo } = useLocalVideo();
  const { muted, toggleMute } = useToggleLocalMute();
  const { toggleContentShare } = useContentShareControls();
  const { isLocalUserSharing } = useContentShareState();
  const { roster } = useRosterState();
  const meetingManager = useMeetingManager();

  const participantCount = Object.keys(roster).length;

  const handleLeave = async () => {
    await meetingManager.leave();
    onLeave();
  };

  return (
    <div className="h-screen flex flex-col bg-[#191919]">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-[#ffffff14]">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-medium text-[#ffffffcf]">{meetingTitle}</h1>
          <span className="text-[13px] text-[#ffffff71]">
            {participantCount}명 참여 중
          </span>
        </div>
        <button
          onClick={handleLeave}
          className="px-4 py-1.5 text-[13px] text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors"
        >
          나가기
        </button>
      </header>

      {/* Video Grid */}
      <main className="flex-1 p-4 overflow-hidden">
        <VideoTileGrid
          layout="standard"
          className="h-full"
        />
      </main>

      {/* Controls */}
      <footer className="flex-shrink-0 flex items-center justify-center gap-4 px-4 py-4 bg-[#252525] border-t border-[#ffffff14]">
        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            muted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
          }`}
          title={muted ? '음소거 해제' : '음소거'}
        >
          {muted ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Video On/Off */}
        <button
          onClick={toggleVideo}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            !isVideoEnabled
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
          }`}
          title={isVideoEnabled ? '카메라 끄기' : '카메라 켜기'}
        >
          {isVideoEnabled ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </button>

        {/* Screen Share */}
        <button
          onClick={() => toggleContentShare()}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            isLocalUserSharing
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
          }`}
          title={isLocalUserSharing ? '화면 공유 중지' : '화면 공유'}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Leave Meeting */}
        <button
          onClick={handleLeave}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          title="미팅 나가기"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
