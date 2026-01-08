'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MeetingProvider,
  useLocalVideo,
  useToggleLocalMute,
  useContentShareControls,
  useContentShareState,
  useRosterState,
  useRemoteVideoTileState,
  lightTheme,
} from 'amazon-chime-sdk-component-library-react';
import { ThemeProvider } from 'styled-components';

// Custom hooks
import {
  useDeviceManager,
  useTranscription,
  useMeetingConnection,
} from '@/hooks/meeting';

// Components
import {
  MeetingHeader,
  MeetingControls,
  VideoGrid,
  TranscriptPanel,
  DeviceSettingsModal,
  LoadingView,
  ErrorView,
  PermissionBanner,
} from '@/components/meeting';

function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Custom hooks
  const {
    devicesInitialized,
    permissionError,
    videoDevices,
    audioInputDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    selectDevices,
    changeVideoDevice,
    changeAudioDevice,
    clearPermissionError,
  } = useDeviceManager();

  const { meeting, isJoining, error, userId, isHost, handleLeave, handleEndMeeting } = useMeetingConnection({
    meetingId: params.meetingId as string,
    workspaceId: params.id as string,
  });

  // 미팅 시작 시간 (timestamp)
  const meetingStartTime = meeting?.startedAt
    ? new Date(meeting.startedAt).getTime()
    : null;

  const {
    transcripts,
    isTranscribing,
    isLoadingHistory,
    showTranscript,
    setShowTranscript,
    transcriptContainerRef,
    selectedLanguage,
    isChangingLanguage,
    changeLanguage,
  } = useTranscription({
    meetingId: params.meetingId as string,
    meetingStartTime,
  });

  // Chime SDK hooks
  const { isVideoEnabled, toggleVideo } = useLocalVideo();
  const { muted, toggleMute } = useToggleLocalMute();
  const { toggleContentShare } = useContentShareControls();
  const { isLocalUserSharing } = useContentShareState();
  const { roster } = useRosterState();
  const { tiles: remoteVideoTiles } = useRemoteVideoTileState();

  const participantCount = Object.keys(roster).length;

  // 카메라 토글 핸들러 (권한 요청 포함)
  const handleToggleVideo = useCallback(async () => {
    if (!devicesInitialized) {
      const success = await selectDevices();
      if (!success) return;
    }
    await toggleVideo();
  }, [devicesInitialized, selectDevices, toggleVideo]);

  // 마이크 토글 핸들러 (권한 요청 포함)
  const handleToggleMute = useCallback(async () => {
    if (!devicesInitialized) {
      const success = await selectDevices();
      if (!success) return;
    }
    toggleMute();
  }, [devicesInitialized, selectDevices, toggleMute]);

  // Loading state
  if (isJoining) {
    return <LoadingView />;
  }

  // Error state
  if (error) {
    return (
      <ErrorView
        error={error}
        onBack={() => router.push(`/workspaces/${params.id}`)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#191919]">
      <MeetingHeader
        title={meeting?.title || '화상회의'}
        participantCount={participantCount}
      />

      {permissionError && (
        <PermissionBanner message={permissionError} onClose={clearPermissionError} />
      )}

      <main className="flex-1 flex overflow-hidden">
        <VideoGrid
          remoteVideoTiles={remoteVideoTiles}
          isVideoEnabled={isVideoEnabled}
          onToggleVideo={handleToggleVideo}
        />

        {showTranscript && (
          <TranscriptPanel
            transcripts={transcripts}
            isTranscribing={isTranscribing}
            isLoadingHistory={isLoadingHistory}
            selectedLanguage={selectedLanguage}
            isChangingLanguage={isChangingLanguage}
            onLanguageChange={changeLanguage}
            onClose={() => setShowTranscript(false)}
            containerRef={transcriptContainerRef}
          />
        )}
      </main>

      <MeetingControls
        muted={muted}
        isVideoEnabled={isVideoEnabled}
        isLocalUserSharing={isLocalUserSharing}
        showTranscript={showTranscript}
        isHost={isHost}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={() => toggleContentShare()}
        onToggleTranscript={() => setShowTranscript(!showTranscript)}
        onOpenSettings={() => setShowDeviceSettings(true)}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeeting}
      />

      <DeviceSettingsModal
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
