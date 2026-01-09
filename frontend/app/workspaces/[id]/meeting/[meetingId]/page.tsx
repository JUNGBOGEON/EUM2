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

  const { meeting, isJoining, error, userId, currentUser, isHost, handleLeave, handleEndMeeting } = useMeetingConnection({
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
    transcriptContainerRef,
    selectedLanguage,
    isChangingLanguage,
    changeLanguage,
    getParticipantByAttendeeId,
  } = useTranscription({
    meetingId,
    meetingStartTime,
    currentUserName: currentUser?.name,
    currentUserProfileImage: currentUser?.profileImage,
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
      />

      {/* Permission Banner */}
      {permissionError && (
        <PermissionBanner message={permissionError} onClose={clearPermissionError} />
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1">
          <VideoGrid
            remoteVideoTiles={remoteVideoTiles}
            isVideoEnabled={isVideoEnabled}
            onToggleVideo={handleToggleVideo}
            currentUser={currentUser ? { name: currentUser.name, profileImage: currentUser.profileImage } : undefined}
          />
        </div>

        {/* Transcript Panel - Always visible on right */}
        <TranscriptPanel
          transcripts={transcripts}
          isTranscribing={isTranscribing}
          isLoadingHistory={isLoadingHistory}
          selectedLanguage={selectedLanguage}
          isChangingLanguage={isChangingLanguage}
          onLanguageChange={changeLanguage}
          containerRef={transcriptContainerRef}
          getParticipantByAttendeeId={getParticipantByAttendeeId}
        />
      </main>

      {/* Controls */}
      <MeetingControls
        muted={muted}
        isVideoEnabled={isVideoEnabled}
        isLocalUserSharing={isLocalUserSharing}
        isHost={isHost}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={() => toggleContentShare()}
        onOpenSettings={() => setShowDeviceSettings(true)}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeeting}
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
