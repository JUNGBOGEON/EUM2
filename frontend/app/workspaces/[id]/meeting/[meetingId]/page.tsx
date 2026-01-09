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
import WhiteboardCanvas from '@/components/whiteboard/WhiteboardCanvas'; // 화이트보드 import 추가
// Custom hooks
import {
  useDeviceManager,
  useTranscription,
  useMeetingConnection,
} from '@/hooks/meeting';
// New modular components (Main 브랜치의 컴포넌트들)
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
  const [showWhiteboard, setShowWhiteboard] = useState(false); // 화이트보드 상태 추가
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
  const { meeting, isJoining, error, userId, currentUser, currentAttendeeId, isHost, handleLeave, handleEndMeeting } = useMeetingConnection({
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
    currentAttendeeId,
  });
  // Chime SDK hooks
  const { isVideoEnabled, toggleVideo } = useLocalVideo();
  const { muted, toggleMute } = useToggleLocalMute();
  const { toggleContentShare } = useContentShareControls();
  const { isLocalUserSharing } = useContentShareState();
  const { roster } = useRosterState();
  const { tiles: remoteVideoTiles } = useRemoteVideoTileState(); // Main의 hook 사용
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
            <VideoGrid
              remoteVideoTiles={remoteVideoTiles}
              isVideoEnabled={isVideoEnabled}
              onToggleVideo={handleToggleVideo}
              currentUser={currentUser ? { name: currentUser.name, profileImage: currentUser.profileImage } : undefined}
              participants={participants}
              currentAttendeeId={currentAttendeeId}
            />
          )}
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
      <div className="relative">
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
        {/* Temporary Whiteboard Toggle Button Overlay */}
        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${showWhiteboard
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-[#ffffff14] hover:bg-[#ffffff29]'
            }`}
          title={showWhiteboard ? '화이트보드 닫기' : '화이트보드 열기'}
          style={{ right: '180px' }} // 적절한 위치 조정
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