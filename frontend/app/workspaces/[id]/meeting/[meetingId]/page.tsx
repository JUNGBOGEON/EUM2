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
  useTTS,
  useMediaDelay,
  useOriginalAudioVolume,
  useMeetingChat,
  useParticipantVolume,
  DEFAULT_MEDIA_DELAY_CONFIG,
} from '@/hooks/meeting';
import type { SessionEndedPayload } from '@/hooks/meeting';
import { useVoiceEnrollment } from '@/hooks/useVoiceEnrollment';
// New modular components (Main 브랜치의 컴포넌트들)
import {
  MeetingHeader,
  MeetingControls,
  VideoGrid,
  CommunicationPanel,
  DeviceSettingsDialog,
  FloatingSubtitle,
  EndMeetingDialog,
  TTSSettingsDialog,
  SessionEndedModal,
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
  const [showTTSSettings, setShowTTSSettings] = useState(false); // TTS 설정 다이얼로그
  const [muteOriginalOnTranslation, setMuteOriginalOnTranslation] = useState(true); // 번역 시 원본 음성 음소거 (기본: ON)
  
  // 세션 종료 모달 상태 (호스트가 회의를 종료했을 때)
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [sessionEndedPayload, setSessionEndedPayload] = useState<SessionEndedPayload | null>(null);

  // Voice dubbing state (내 목소리 TTS)
  const [hasVoiceEmbedding, setHasVoiceEmbedding] = useState(false);
  const [voiceDubbingEnabled, setVoiceDubbingEnabled] = useState(false);
  const [isTogglingVoiceDubbing, setIsTogglingVoiceDubbing] = useState(false);
  const { getVoiceStatus, toggleVoiceDubbing } = useVoiceEnrollment();

  // Fetch voice status on mount
  useEffect(() => {
    const fetchVoiceStatus = async () => {
      try {
        const status = await getVoiceStatus();
        setHasVoiceEmbedding(status.hasVoiceEmbedding);
        setVoiceDubbingEnabled(status.voiceDubbingEnabled);
      } catch (err) {
        console.warn('[MeetingPage] Failed to fetch voice status:', err);
      }
    };
    fetchVoiceStatus();
  }, [getVoiceStatus]);

  // Handle voice dubbing toggle
  const handleToggleVoiceDubbing = useCallback(async (enabled: boolean) => {
    setIsTogglingVoiceDubbing(true);
    try {
      const result = await toggleVoiceDubbing(enabled);
      setVoiceDubbingEnabled(result.voiceDubbingEnabled);
    } catch (err) {
      console.error('[MeetingPage] Failed to toggle voice dubbing:', err);
    } finally {
      setIsTogglingVoiceDubbing(false);
    }
  }, [toggleVoiceDubbing]);

  // Handle mute original audio toggle
  const handleToggleMuteOriginal = useCallback(() => {
    setMuteOriginalOnTranslation(prev => !prev);
  }, []);

  // Debug logging for Whiteboard entry point
  useEffect(() => {
    console.log('[MeetingPage] showWhiteboard state changed:', showWhiteboard);
    console.log('[MeetingPage] meetingId:', meetingId);
  }, [showWhiteboard, meetingId]);

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
  // Meeting start time (timestamp) - ensure UTC parsing
  const meetingStartTime = (() => {
    if (!meeting?.startedAt) return null;
    let dateStr = typeof meeting.startedAt === 'string' ? meeting.startedAt : '';
    if (dateStr) {
      if (!dateStr.includes('T')) dateStr = dateStr.replace(' ', 'T');
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) dateStr += 'Z';
    } else {
      dateStr = new Date(meeting.startedAt).toISOString();
    }
    return new Date(dateStr).getTime();
  })();

  useEffect(() => {
    console.log('[MeetingPage] meetingStartTime debug:', {
      hasMeeting: !!meeting,
      startedAt: meeting?.startedAt,
      meetingStartTime,
      now: Date.now()
    });
  }, [meeting, meetingStartTime]);

  // 세션 종료 시 핸들러 (호스트가 회의를 종료했을 때 다른 참가자들에게 모달 표시)
  const handleSessionEnded = useCallback(async (payload: SessionEndedPayload) => {
    console.log('[MeetingPage] 🛑 Session ended by host:', payload);

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

    // 모달 표시 (확인 버튼 클릭 시 리다이렉트)
    setSessionEndedPayload(payload);
    setShowSessionEndedModal(true);
  }, [meetingManager]);

  // 세션 종료 모달 확인 핸들러
  const handleSessionEndedConfirm = useCallback(() => {
    setShowSessionEndedModal(false);
    setSessionEndedPayload(null);
    router.push(`/workspaces/${workspaceId}`);
  }, [router, workspaceId]);

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

  // Meeting Chat hook
  const { messages: chatMessages, sendMessage } = useMeetingChat({
    meetingId,
    currentUser: currentUser || undefined,
    meetingStartTime,
  });

  // Debug currentUser in Page
  useEffect(() => {
    console.log('[MeetingPage] User/Chat Debug:', {
      userId,
      hasCurrentUser: !!currentUser,
      currentUserName: currentUser?.name,
      chatMessagesLength: chatMessages.length
    });
  }, [userId, currentUser, chatMessages]);

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

  // TTS hook (번역된 자막 음성 재생) - Original Audio Volume보다 먼저 호출
  const {
    ttsEnabled,
    isTogglingTTS,
    isPlaying: isTTSPlaying,
    volume: ttsVolume,
    queueLength: ttsQueueLength,
    selectedVoices,
    toggleTTS,
    setVolume: setTTSVolume,
    selectVoice,
  } = useTTS({
    meetingId,
    userId,
  });

  // Original Audio Volume hook (번역 시 원본 음성 볼륨 조절)
  const {
    targetVolume: originalVolume,
    setTargetVolume: setOriginalVolume,
    isFading: isOriginalVolumeFading,
  } = useOriginalAudioVolume({
    translationEnabled,
    muteOriginalOnTranslation,
  });

  // Voice Focus hook (노이즈 억제 - 기본 활성화)
  const {
    isVoiceFocusSupported,
    isVoiceFocusEnabled,
    isVoiceFocusLoading,
    toggleVoiceFocus,
  } = useVoiceFocus();

  // Media Delay hook (자막 싱크용 영상/음성 딜레이)
  const {
    delayEnabled,
    delayMs,
    setDelayEnabled,
    setDelayMs,
  } = useMediaDelay({
    config: DEFAULT_MEDIA_DELAY_CONFIG,
  });

  // Participant Volume Control hook (개인별 볼륨 조절)
  const {
    getParticipantVolume,
    setParticipantVolume,
    toggleParticipantMute,
  } = useParticipantVolume({
    meetingId,
  });

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
    const info = getParticipantByAttendeeId(attendeeId);
    return {
      id: attendeeId,
      name: info.name || (attendee as any).name || 'Unknown',
      profileImage: info.profileImage,
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
              <WhiteboardCanvas
                meetingId={meetingId}
                currentUser={currentUser ? { id: currentUser.id, name: currentUser.name, profileImage: currentUser.profileImage } : undefined}
              />
            </div>
          ) : (
            <VideoGrid
              remoteVideoTiles={remoteVideoTiles}
              isVideoEnabled={isVideoEnabled}
              currentUser={currentUser ? { name: currentUser.name, profileImage: currentUser.profileImage } : undefined}
              participants={participants}
              currentAttendeeId={currentAttendeeId}
              delayEnabled={delayEnabled}
              delayMs={delayMs}
              getParticipantVolume={getParticipantVolume}
              onParticipantVolumeChange={setParticipantVolume}
              onParticipantMuteToggle={toggleParticipantMute}
            />
          )}

          {/* 플로팅 자막 오버레이 (번역 ON + 최근 번역이 있을 때만 표시) - 화이트보드 위에도 표시 */}
          {translationEnabled && recentTranslations.length > 0 && (
            <FloatingSubtitle
              translations={recentTranslations}
              getParticipantByAttendeeId={getParticipantByAttendeeId}
              isWhiteboardActive={showWhiteboard}
            />
          )}
        </div>
        {/* Unified Communication Panel - Always visible on right */}
        <CommunicationPanel
          transcripts={syncedTranscripts}
          messages={chatMessages}
          isTranscribing={isTranscribing}
          isLoadingHistory={isLoadingHistory}
          selectedLanguage={selectedLanguage}
          isChangingLanguage={isChangingLanguage}
          onLanguageChange={setSelectedLanguage}
          containerRef={transcriptContainerRef}
          getParticipantByAttendeeId={getParticipantByAttendeeId}
          translationEnabled={translationEnabled}
          getTranslation={getTranslation}
          onSendMessage={(content) => sendMessage(content, selectedLanguage)}
          meetingStartTime={meetingStartTime}
        />
      </main>
      {/* Controls */}
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
        isWhiteboardEnabled={showWhiteboard}
        // TTS props
        ttsEnabled={ttsEnabled}
        isTogglingTTS={isTogglingTTS}
        isTTSPlaying={isTTSPlaying}
        ttsVolume={ttsVolume}
        ttsQueueLength={ttsQueueLength}
        delayEnabled={delayEnabled}
        delayMs={delayMs}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={() => toggleContentShare()}
        onToggleTranslation={toggleTranslation}
        onToggleVoiceFocus={toggleVoiceFocus}
        onToggleWhiteboard={() => {
          console.log('[MeetingPage] Toggling whiteboard click. Previous state:', showWhiteboard);
          setShowWhiteboard(!showWhiteboard);
        }}
        onToggleTTS={toggleTTS}
        onToggleDelay={() => setDelayEnabled(!delayEnabled)}
        onDelayMsChange={setDelayMs}
        onSetTTSVolume={setTTSVolume}
        originalVolume={originalVolume}
        isOriginalVolumeFading={isOriginalVolumeFading}
        onSetOriginalVolume={setOriginalVolume}
        muteOriginalOnTranslation={muteOriginalOnTranslation}
        onToggleMuteOriginal={handleToggleMuteOriginal}
        hasVoiceEmbedding={hasVoiceEmbedding}
        voiceDubbingEnabled={voiceDubbingEnabled}
        onOpenTTSSettings={() => setShowTTSSettings(true)}
        onOpenSettings={() => setShowDeviceSettings(true)}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeetingClick}
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

      {/* End Meeting Confirmation Dialog */}
      <EndMeetingDialog
        isOpen={showEndMeetingDialog}
        onClose={() => setShowEndMeetingDialog(false)}
        onConfirm={handleEndMeetingConfirm}
      />

      {/* TTS Settings Dialog */}
      <TTSSettingsDialog
        open={showTTSSettings}
        onOpenChange={setShowTTSSettings}
        selectedVoices={selectedVoices}
        onSelectVoice={selectVoice}
        hasVoiceEmbedding={hasVoiceEmbedding}
        voiceDubbingEnabled={voiceDubbingEnabled}
        isTogglingVoiceDubbing={isTogglingVoiceDubbing}
        onToggleVoiceDubbing={handleToggleVoiceDubbing}
      />

      {/* Session Ended Modal (호스트가 회의를 종료했을 때 다른 참가자들에게 표시) */}
      <SessionEndedModal
        isOpen={showSessionEndedModal}
        payload={sessionEndedPayload}
        onConfirm={handleSessionEndedConfirm}
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