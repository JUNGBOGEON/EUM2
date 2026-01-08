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

// New modular components
import {
  MeetingHeader,
  MeetingControls,
  VideoGrid,
  TranscriptPanel,
  DeviceSettingsDialog,
} from './_components';

// Legacy components for loading/error states
import {
  LoadingView,
  ErrorView,
  PermissionBanner,
} from '@/components/meeting';

function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const meetingId = params.meetingId as string;
  
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
    meetingId,
    workspaceId,
  });

  // Meeting start time (timestamp)
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
    meetingId,
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
  
  // Convert roster to participants array
  const participants = Object.entries(roster).map(([attendeeId, attendee]) => ({
    id: attendeeId,
    name: (attendee as any).name || 'Unknown',
    profileImage: (attendee as any).profileImage,
  }));

  // Camera toggle handler (includes permission request)
  const handleToggleVideo = useCallback(async () => {
    if (!devicesInitialized) {
      const success = await selectDevices();
      if (!success) return;
    }
    await toggleVideo();
  }, [devicesInitialized, selectDevices, toggleVideo]);

  // Microphone toggle handler (includes permission request)
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
        meetingId={meetingId}
      />

      {/* Permission Banner */}
      {permissionError && (
        <PermissionBanner message={permissionError} onClose={clearPermissionError} />
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <VideoGrid
          remoteVideoTiles={remoteVideoTiles}
          isVideoEnabled={isVideoEnabled}
          onToggleVideo={handleToggleVideo}
        />
      </main>

      {/* Controls */}
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

      {/* Transcript Panel (Sheet) */}
      <TranscriptPanel
        isOpen={showTranscript}
        onClose={() => setShowTranscript(false)}
        transcripts={transcripts}
        isTranscribing={isTranscribing}
        isLoadingHistory={isLoadingHistory}
        selectedLanguage={selectedLanguage}
        isChangingLanguage={isChangingLanguage}
        onLanguageChange={changeLanguage}
        containerRef={transcriptContainerRef}
      />

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
