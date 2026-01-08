'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MeetingProvider,
  useMeetingManager,
  VideoTileGrid,
  useLocalVideo,
  useToggleLocalMute,
  useContentShareControls,
  useContentShareState,
  useRosterState,
  useAudioVideo,
  lightTheme,
} from 'amazon-chime-sdk-component-library-react';
import { ThemeProvider } from 'styled-components';
import { MeetingSessionConfiguration } from 'amazon-chime-sdk-js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MeetingInfo {
  id: string;
  title: string;
  chimeMeetingId: string;
  hostId: string;
}

function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const meetingManager = useMeetingManager();

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);

  const { isVideoEnabled, toggleVideo } = useLocalVideo();
  const { muted, toggleMute } = useToggleLocalMute();
  const { toggleContentShare } = useContentShareControls();
  const { isLocalUserSharing } = useContentShareState();
  const { roster } = useRosterState();
  const audioVideo = useAudioVideo();

  const participantCount = Object.keys(roster).length;

  // 오디오/비디오 장치 선택
  const selectDevices = useCallback(async () => {
    if (!audioVideo) return;

    try {
      // 오디오 입력 장치 선택
      const audioInputDevices = await audioVideo.listAudioInputDevices();
      if (audioInputDevices.length > 0) {
        await audioVideo.startAudioInput(audioInputDevices[0].deviceId);
      }

      // 오디오 출력 장치 선택
      const audioOutputDevices = await audioVideo.listAudioOutputDevices();
      if (audioOutputDevices.length > 0) {
        await audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
      }

      // 비디오 입력 장치 선택
      const videoInputDevices = await audioVideo.listVideoInputDevices();
      if (videoInputDevices.length > 0) {
        await meetingManager.startVideoInputDevice(videoInputDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to select devices:', err);
    }
  }, [audioVideo, meetingManager]);

  // 미팅 연결 후 장치 선택
  useEffect(() => {
    if (audioVideo && !isJoining) {
      selectDevices();
    }
  }, [audioVideo, isJoining, selectDevices]);

  // 미팅 참가 또는 시작
  const joinOrStartMeeting = useCallback(async () => {
    try {
      // 사용자 정보 가져오기
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUserId(userData.id);

      // 미팅 정보 가져오기
      const meetingRes = await fetch(`${API_URL}/api/meetings/${params.meetingId}`, {
        credentials: 'include',
      });

      if (!meetingRes.ok) {
        throw new Error('미팅을 찾을 수 없습니다.');
      }

      const meetingData = await meetingRes.json();
      setMeeting(meetingData);

      // 호스트인 경우 미팅 시작, 아닌 경우 참가
      const isHost = meetingData.hostId === userData.id;
      const endpoint = isHost && !meetingData.chimeMeetingId
        ? `${API_URL}/api/meetings/${params.meetingId}/start`
        : `${API_URL}/api/meetings/${params.meetingId}/join`;

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '미팅 참가에 실패했습니다.');
      }

      const data = await response.json();
      const { meeting: meetingInfo, attendee } = data;

      // Chime 세션 설정
      const meetingSessionConfiguration = new MeetingSessionConfiguration(
        {
          MeetingId: meetingInfo.chimeMeetingId,
          ExternalMeetingId: meetingInfo.externalMeetingId,
          MediaPlacement: meetingInfo.mediaPlacement,
          MediaRegion: meetingInfo.mediaRegion,
        },
        {
          AttendeeId: attendee.attendeeId,
          JoinToken: attendee.joinToken,
        }
      );

      await meetingManager.join(meetingSessionConfiguration);
      await meetingManager.start();

      setMeeting(meetingInfo);
      setIsJoining(false);
    } catch (err) {
      console.error('Failed to join meeting:', err);
      setError(err instanceof Error ? err.message : '미팅 참가에 실패했습니다.');
      setIsJoining(false);
    }
  }, [params.meetingId, meetingManager, router]);

  useEffect(() => {
    // React Strict Mode에서 두 번 실행되는 것 방지
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    joinOrStartMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeave = async () => {
    try {
      await fetch(`${API_URL}/api/meetings/${params.meetingId}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      await meetingManager.leave();
      router.push(`/workspaces/${params.id}`);
    } catch (err) {
      console.error('Failed to leave meeting:', err);
      router.push(`/workspaces/${params.id}`);
    }
  };

  if (isJoining) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#191919]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#ffffffcf] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-[15px] text-[#ffffff71]">미팅에 연결 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#191919]">
        <div className="text-center max-w-md px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-medium text-[#ffffffcf] mb-2">미팅 참가 실패</h2>
          <p className="text-[15px] text-[#ffffff71] mb-6">{error}</p>
          <button
            onClick={() => router.push(`/workspaces/${params.id}`)}
            className="px-5 py-2 text-[14px] font-medium text-white bg-[#37352f] hover:bg-[#2f2f2f] rounded-full transition-colors"
          >
            워크스페이스로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#191919]">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-[#ffffff14]">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-medium text-[#ffffffcf]">
            {meeting?.title || '화상회의'}
          </h1>
          <span className="text-[13px] text-[#ffffff71]">
            {participantCount}명 참여 중
          </span>
        </div>
      </header>

      {/* Video Grid */}
      <main className="flex-1 p-4 overflow-hidden">
        <VideoTileGrid layout="standard" />
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

export default function MeetingPage() {
  return (
    <ThemeProvider theme={lightTheme}>
      <MeetingProvider>
        <MeetingRoomContent />
      </MeetingProvider>
    </ThemeProvider>
  );
}
