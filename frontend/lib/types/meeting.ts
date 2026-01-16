/**
 * 미팅/세션 관련 타입 정의
 * 모든 미팅 관련 타입은 이 파일에서 관리합니다.
 */

import type { UserInfo } from './user';
import type { Workspace } from './workspace';

/**
 * 세션 상태
 */
export type SessionStatus = 'active' | 'ended';

/**
 * 참가자 역할
 */
export type ParticipantRole = 'HOST' | 'PARTICIPANT';

/**
 * 요약 상태
 */
export type SummaryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

/**
 * 세션 참가자
 */
export interface SessionParticipant {
  id: string;
  userId: string;
  user?: UserInfo;
  role?: ParticipantRole;
  joinedAt?: string;
  leftAt?: string;
  durationSec?: number;
}

/**
 * 미팅 세션
 */
export interface MeetingSession {
  id: string;
  title?: string;
  workspaceId: string;
  workspace?: Workspace;
  hostId: string;
  host?: UserInfo;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  participantCount?: number;
  participants?: SessionParticipant[];
  summaryStatus?: SummaryStatus;
  summaryS3Key?: string;
  createdAt: string;
}

/**
 * 미팅 트랜스크립션 (발화 스크립트)
 */
export interface MeetingTranscription {
  id: string;
  speakerId?: string;
  speaker?: UserInfo;
  chimeAttendeeId?: string;
  originalText: string;
  startTimeMs: number;
  endTimeMs: number;
  relativeStartSec?: number;
  languageCode?: string;
  confidence?: number;
}

/**
 * 회의 요약
 */
export interface MeetingSummary {
  status: SummaryStatus;
  content: string | null;
  presignedUrl: string | null;
}

/**
 * 실시간 자막 아이템 (프론트엔드용)
 */
export interface TranscriptItem {
  id: string;
  speakerName: string;
  speakerId?: string;
  speakerImage?: string;
  speakerProfileImage?: string;
  text: string;
  timestamp: number; // 밀리초 (미팅 시작 기준 경과 시간)
  isPartial: boolean;
  attendeeId?: string;
  languageCode?: string; // 발화자의 언어 코드 (예: 'ko-KR', 'en-US')
}

/**
 * 참가자 정보 (비디오 그리드용)
 */
export interface ParticipantInfo {
  id?: string;
  attendeeId: string;
  chimeAttendeeId?: string;
  userId?: string;
  name: string;
  profileImage?: string;
  isLocal: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  user?: UserInfo;
}

/**
 * Chime 미팅 정보
 */
export interface MeetingInfo {
  id: string;
  title: string;
  chimeMeetingId: string;
  hostId: string;
  externalMeetingId?: string;
  mediaPlacement?: Record<string, unknown>;
  mediaRegion?: string;
  startedAt?: string;
}

/**
 * 장치 관리 상태
 */
export interface DeviceState {
  devicesInitialized: boolean;
  permissionError: string | null;
  videoDevices: MediaDeviceInfo[];
  audioInputDevices: MediaDeviceInfo[];
  selectedVideoDevice: string;
  selectedAudioDevice: string;
}

/**
 * 트랜스크립션 상태
 */
export interface TranscriptionState {
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  showTranscript: boolean;
}

/**
 * 번역된 자막 아이템
 */
export interface TranslatedTranscript {
  resultId: string;
  speakerId: string;       // attendeeId (프론트엔드 조회용)
  speakerUserId: string;   // userId (본인 필터링용)
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

/**
 * 번역 상태
 */
export interface TranslationState {
  enabled: boolean;
  userLanguage: string;
  translations: Map<string, TranslatedTranscript>; // resultId -> translation
}

/**
 * Chime 로스터 참가자 (확장된 타입)
 * Chime SDK의 RosterAttendeeType을 확장하여 커스텀 속성 포함
 */
export interface ChimeRosterAttendee {
  chimeAttendeeId?: string;
  externalUserId?: string;
  name?: string;
  profileImage?: string;
}

// ==========================================
// TTS (Text-to-Speech) Types
// ==========================================

/**
 * TTS Ready WebSocket Payload
 * 번역된 자막의 TTS 오디오가 준비되었을 때 수신하는 페이로드
 */
export interface TTSReadyPayload {
  type: 'tts_ready';
  resultId: string;
  audioUrl: string;      // Pre-signed S3 URL
  durationMs: number;
  voiceId: string;
  targetLanguage: string;
  speakerName: string;
  translatedText: string;
  timestamp: number;
}

/**
 * TTS 큐 아이템
 */
export interface TTSQueueItem {
  resultId: string;
  audioUrl: string;
  durationMs: number;
  voiceId: string;
  targetLanguage: string;
  speakerName: string;
  translatedText: string;
  status: 'pending' | 'playing' | 'completed' | 'error';
  timestamp: number;
}

/**
 * Polly 음성 정보
 */
export interface PollyVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  languageCode: string;
  isNeural: boolean;
}

/**
 * TTS 설정
 */
export interface TTSPreference {
  enabled: boolean;
  voices: Record<string, string>;  // languageCode -> voiceId
  volume: number;
  updatedAt: number;
}

/**
 * TTS 상태
 */
export interface TTSState {
  enabled: boolean;
  isPlaying: boolean;
  volume: number;
  queue: TTSQueueItem[];
  currentlyPlaying: TTSQueueItem | null;
  selectedVoices: Record<string, string>;  // languageCode -> voiceId
}
