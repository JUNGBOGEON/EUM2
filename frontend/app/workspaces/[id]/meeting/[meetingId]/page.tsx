'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MeetingProvider,
  useMeetingManager,
  useLocalVideo,
  useToggleLocalMute,
  useContentShareControls,
  useContentShareState,
  useRosterState,
  useRemoteVideoTileState,
  lightTheme,
} from 'amazon-chime-sdk-component-library-react';
import { ThemeProvider } from 'styled-components';
import WhiteboardCanvas from '@/components/whiteboard/WhiteboardCanvas'; // 화이트보드 import 추가
// Custom hooks
import {
  useDeviceManager,
  useBrowserTranscription,
  useMeetingConnection,
  useTranslation,
  useVoiceFocus,
  useTranscriptSync,
} from '@/hooks/meeting';
// New modular components (Main 브랜치의 컴포넌트들)
import {
  MeetingHeader,
  MeetingControls,
  VideoGrid,
  TranscriptPanel,
  DeviceSettingsDialog,
  FloatingSubtitle,
  EndMeetingDialog,
} from './_components';
// Legacy components for loading/error states
import {
  LoadingView,
  ErrorView,
  PermissionBanner,
} from '@/components/meeting';

// Types
import type { ChimeRosterAttendee } from '@/lib/types';

function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const meetingManager = useMeetingManager();
  const workspaceId = params.id as string;
  const meetingId = params.meetingId as string;

  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showEndMeetingDialog, setShowEndMeetingDialog] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false); // 화이트보드 상태 추가

  // stopTranscription ref (useBrowserTranscription보다 먼저 정의된 콜백에서 사용)
  const stopTranscriptionRef = useRef<(() => void) | null>(null);
  // Custom hooks
  const {
    devicesInitialized,
    audioInitialized,
    permissionError,
    videoDevices,
    audioInputDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    selectDevices,
    initializeAudioOnly,
    changeVideoDevice,
    changeAudioDevice,
    clearPermissionError,
  } = useDeviceManager();

  const { meeting, isJoining, error, userId, currentUser, currentAttendeeId, isHost, handleLeave: originalHandleLeave, handleEndMeeting: originalHandleEndMeeting } = useMeetingConnection({
    meetingId,
    workspaceId,
  });

  // 회의 연결 후 오디오 자동 초기화 (음소거 버튼 빠른 응답을 위해)
  useEffect(() => {
    if (meeting && !audioInitialized) {
      console.log('[MeetingPage] Auto-initializing audio after meeting connection...');
      initializeAudioOnly();
    }
  }, [meeting, audioInitialized, initializeAudioOnly]);
  // Meeting start time (timestamp)
  const meetingStartTime = meeting?.startedAt
    ? new Date(meeting.startedAt).getTime()
    : null;

  // 세션 종료 시 핸들러 (호스트가 회의를 종료했을 때 다른 참가자들 자동 퇴장)
  const handleSessionEnded = useCallback(async (reason: string) => {
    console.log('[MeetingPage] 🛑 Session ended by host, reason:', reason);

    // 트랜스크립션 중지 (ref 사용)
    try {
      stopTranscriptionRef.current?.();
    } catch (error) {
      console.error('[MeetingPage] Failed to stop transcription:', error);
    }

    // Chime 미팅에서 나가기
    try {
      await meetingManager.leave();
    } catch (error) {
      console.error('[MeetingPage] Failed to leave meeting:', error);
    }

    // 워크스페이스 페이지로 리다이렉트
    router.push(`/workspaces/${workspaceId}`);
  }, [meetingManager, router, workspaceId]);

  // 트랜스크립트 동기화 훅 (로컬 + 원격 트랜스크립트 통합)
  const {
    transcripts: syncedTranscripts,
    isRoomJoined,
    addLocalTranscript,
    updateLocalTranscript,
    loadHistory,
  } = useTranscriptSync({
    sessionId: meetingId,
    currentUserId: userId,
    currentAttendeeId,
    onSessionEnded: handleSessionEnded,
  });

  // Chime SDK hooks (음소거 상태 먼저 가져오기)
  const { muted, toggleMute } = useToggleLocalMute();

  // Browser Transcription (클라이언트 직접 AWS Transcribe 연결)
  const {
    isStreaming: isTranscribing,
    isLoadingHistory,
    transcriptContainerRef,
    selectedLanguage,
    isChangingLanguage,
    setSelectedLanguage,
    getParticipantByAttendeeId,
    stopTranscription,
  } = useBrowserTranscription({
    sessionId: meetingId,
    meetingStartTime,
    currentUserName: currentUser?.name,
    currentUserProfileImage: currentUser?.profileImage,
    currentAttendeeId,
    userId,
    enabled: true, // 항상 활성화
    isMuted: muted, // Chime 음소거 상태 연동
    isRoomJoined, // WebSocket 룸 참가 완료 후에만 트랜스크립션 시작
    // 동기화 훅 콜백 연결
    onLocalTranscript: addLocalTranscript,
    onTimestampCorrection: (id, serverTimestamp) => {
      updateLocalTranscript(id, { timestamp: serverTimestamp });
    },
    onHistoryLoaded: loadHistory,
  });

  // stopTranscription ref 업데이트 (handleSessionEnded에서 사용)
  useEffect(() => {
    stopTranscriptionRef.current = stopTranscription;
  }, [stopTranscription]);

  // Translation hook
  const {
    translationEnabled,
    isTogglingTranslation,
    toggleTranslation,
    getTranslation,
    recentTranslations,
  } = useTranslation({
    meetingId,
    userId,
  });

  // Voice Focus hook (노이즈 억제 - 기본 활성화)
  const {
    isVoiceFocusSupported,
    isVoiceFocusEnabled,
    isVoiceFocusLoading,
    toggleVoiceFocus,
  } = useVoiceFocus();

  // Chime SDK hooks
  const { isVideoEnabled, toggleVideo } = useLocalVideo();
  // muted, toggleMute는 위에서 useBrowserTranscription 전에 선언됨
  const { toggleContentShare } = useContentShareControls();
  const { isLocalUserSharing } = useContentShareState();
  const { roster } = useRosterState();
  const { tiles: remoteVideoTiles } = useRemoteVideoTileState(); // Main의 hook 사용
  const participantCount = Object.keys(roster).length;

  // Convert roster to participants array (with proper typing)
  const participants = Object.entries(roster).map(([attendeeId, attendee]) => {
    const typedAttendee = attendee as ChimeRosterAttendee;
    return {
      id: attendeeId,
      name: typedAttendee.name || 'Unknown',
      profileImage: typedAttendee.profileImage,
    };
  });
  // Camera toggle handler (includes permission request)
  const handleToggleVideo = useCallback(async () => {
    if (!devicesInitialized) {
      const success = await selectDevices();
      if (!success) return;
    }
    await toggleVideo();
  }, [devicesInitialized, selectDevices, toggleVideo]);

  // Microphone toggle handler (오디오만 초기화 - 빠른 응답)
  const handleToggleMute = useCallback(async () => {
    if (!audioInitialized) {
      const success = await initializeAudioOnly();
      if (!success) return;
    }
    toggleMute();
  }, [audioInitialized, initializeAudioOnly, toggleMute]);

  // 회의 나가기 (트랜스크립션 먼저 중지)
  const handleLeave = useCallback(() => {
    console.log('[MeetingPage] Stopping transcription before leaving...');
    try {
      stopTranscription();
    } catch (error) {
      console.error('[MeetingPage] Failed to stop transcription, proceeding with leave:', error);
    }
    originalHandleLeave();
  }, [stopTranscription, originalHandleLeave]);

  // 회의 종료 버튼 클릭 시 다이얼로그 표시
  const handleEndMeetingClick = useCallback(() => {
    setShowEndMeetingDialog(true);
  }, []);

  // 회의 종료 확인 (다이얼로그에서 확인 버튼 클릭 시)
  const handleEndMeetingConfirm = useCallback((generateSummary: boolean) => {
    console.log('[MeetingPage] Stopping transcription before ending meeting...');
    console.log('[MeetingPage] Generate AI summary:', generateSummary);
    setShowEndMeetingDialog(false);
    try {
      stopTranscription();
    } catch (error) {
      console.error('[MeetingPage] Failed to stop transcription, proceeding with end meeting:', error);
    }
    originalHandleEndMeeting(generateSummary);
  }, [stopTranscription, originalHandleEndMeeting]);
  // Loading state
  if (isJoining) {
    return <LoadingView />;
  }
  // Error state
  if (error) {
    return (
      <ErrorView
        error={error}
        onBack={() => router.push(`/workspaces/${workspaceId}`)}
      />
    );
  }
  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <MeetingHeader
        title={meeting?.title || '화상회의'}
        participantCount={participantCount}
        participants={participants}
        meetingStartTime={meetingStartTime}
        workspaceId={workspaceId}
      // onEndMeeting={handleEndMeeting} // 필요한 경우 추가
      />
      {/* Permission Banner */}
      {permissionError && (
        <PermissionBanner message={permissionError} onClose={clearPermissionError} />
      )}
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Video Area or Whiteboard */}
        <div className="flex-1 relative flex flex-col h-full">
          {showWhiteboard ? (
            <div className="absolute inset-0 z-10 bg-white">
              <WhiteboardCanvas />
            </div>
          ) : (
            <>
              <VideoGrid
                remoteVideoTiles={remoteVideoTiles}
                isVideoEnabled={isVideoEnabled}
                currentUser={currentUser ? { name: currentUser.name, profileImage: currentUser.profileImage } : undefined}
                participants={participants}
                currentAttendeeId={currentAttendeeId}
              />

              {/* 플로팅 자막 오버레이 (번역 ON + 최근 번역이 있을 때만 표시) */}
              {translationEnabled && recentTranslations.length > 0 && (
                <FloatingSubtitle
                  translations={recentTranslations}
                  getParticipantByAttendeeId={getParticipantByAttendeeId}
                />
              )}
            </>
          )}
        </div>
        {/* Transcript Panel - Always visible on right */}
        <TranscriptPanel
          transcripts={syncedTranscripts}
          isTranscribing={isTranscribing}
          isLoadingHistory={isLoadingHistory}
          selectedLanguage={selectedLanguage}
          isChangingLanguage={isChangingLanguage}
          onLanguageChange={setSelectedLanguage}
          containerRef={transcriptContainerRef}
          getParticipantByAttendeeId={getParticipantByAttendeeId}
          translationEnabled={translationEnabled}
          getTranslation={getTranslation}
        />
      </main>
      {/* Controls */}
      <div className="relative">
        <MeetingControls
          muted={muted}
          isVideoEnabled={isVideoEnabled}
          isLocalUserSharing={isLocalUserSharing}
          isHost={isHost}
          translationEnabled={translationEnabled}
          isTogglingTranslation={isTogglingTranslation}
          isVoiceFocusSupported={isVoiceFocusSupported}
          isVoiceFocusEnabled={isVoiceFocusEnabled}
          isVoiceFocusLoading={isVoiceFocusLoading}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={() => toggleContentShare()}
          onToggleTranslation={toggleTranslation}
          onToggleVoiceFocus={toggleVoiceFocus}
          onOpenSettings={() => setShowDeviceSettings(true)}
          onLeave={handleLeave}
          onEndMeeting={handleEndMeetingClick}
        />
        {/* Temporary Whiteboard Toggle Button Overlay */}
        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${showWhiteboard
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
            }`}
          title={showWhiteboard ? '화이트보드 닫기' : '화이트보드 열기'}
          style={{ right: '180px' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
      {/* Device Settings Dialog */}
      <DeviceSettingsDialog
        isOpen={showDeviceSettings}
        onClose={() => setShowDeviceSettings(false)}
        devicesInitialized={devicesInitialized}
        videoDevices={videoDevices}
        audioInputDevices={audioInputDevices}
        selectedVideoDevice={selectedVideoDevice}
        selectedAudioDevice={selectedAudioDevice}
        onSelectDevices={async () => { await selectDevices(); }}
        onChangeVideoDevice={changeVideoDevice}
        onChangeAudioDevice={changeAudioDevice}
      />

      {/* End Meeting Confirmation Dialog */}
      <EndMeetingDialog
        isOpen={showEndMeetingDialog}
        onClose={() => setShowEndMeetingDialog(false)}
        onConfirm={handleEndMeetingConfirm}
      />
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