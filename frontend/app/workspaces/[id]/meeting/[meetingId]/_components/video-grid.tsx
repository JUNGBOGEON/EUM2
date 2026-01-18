'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { VideoOff, VolumeX } from 'lucide-react';
import { RemoteVideo, LocalVideo, useAudioVideo } from 'amazon-chime-sdk-component-library-react';
import { DelayedRemoteVideo } from './delayed-remote-video';
import { ParticipantContextMenu } from './participant-context-menu';
import type { ParticipantVolumeSettings } from '@/hooks/meeting/useParticipantVolume';

interface UserInfo {
  name: string;
  profileImage?: string;
}

interface Participant {
  id: string; // attendeeId
  name: string;
  profileImage?: string;
}

interface VideoGridProps {
  remoteVideoTiles: number[];
  isVideoEnabled: boolean;
  currentUser?: UserInfo;
  participants: Participant[];
  currentAttendeeId?: string | null;
  // Media Delay
  delayEnabled?: boolean;
  delayMs?: number;
  // Participant Volume Control (신규)
  getParticipantVolume?: (attendeeId: string) => ParticipantVolumeSettings;
  onParticipantVolumeChange?: (attendeeId: string, volume: number) => void;
  onParticipantMuteToggle?: (attendeeId: string) => void;
}

// ----------------------------------------------------------------------
// Constants & Helpers
// ----------------------------------------------------------------------

const GRID_CLASSES: Record<number, string> = {
  1: 'grid-cols-1 grid-rows-1',
  2: 'grid-cols-1 md:grid-cols-2 grid-rows-1', // Side by side on desktop
  3: 'grid-cols-2 grid-rows-2', // 2x2
  4: 'grid-cols-2 grid-rows-2',
  5: 'grid-cols-2 md:grid-cols-3 grid-rows-2', // 3x2 on desktop
  6: 'grid-cols-2 md:grid-cols-3 grid-rows-2',
  7: 'grid-cols-3 grid-rows-3', // 3x3
  8: 'grid-cols-3 grid-rows-3',
  9: 'grid-cols-3 grid-rows-3',
};

const DEFAULT_GRID_CLASS = 'grid-cols-3 md:grid-cols-4 auto-rows-fr'; // 10+ people

const DEFAULT_VOLUME_SETTINGS: ParticipantVolumeSettings = {
  volume: 100,
  isMuted: false,
};

function getGridClass(count: number): string {
  return GRID_CLASSES[count] || DEFAULT_GRID_CLASS;
}

// ----------------------------------------------------------------------
// Sub Components
// ----------------------------------------------------------------------

function UserAvatar({
  name,
  profileImage,
  initial,
}: {
  name: string;
  profileImage?: string;
  initial: string;
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-neutral-950">
      {profileImage ? (
        <div className="w-24 h-24 md:w-36 md:h-36 overflow-hidden rounded-full border-2 border-neutral-700 mb-4 aspect-square shadow-lg">
          <Image
            src={profileImage}
            alt={name}
            width={144}
            height={144}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-24 h-24 md:w-36 md:h-36 bg-neutral-900 flex items-center justify-center rounded-full border-2 border-neutral-700 mb-4 aspect-square shadow-lg">
          <span className="text-4xl md:text-6xl font-medium text-neutral-400">
            {initial}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 text-neutral-500 text-sm">
        <VideoOff className="w-4 h-4" />
        <span>카메라 꺼짐</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Context Menu State
// ----------------------------------------------------------------------

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  participant: {
    id: string;
    name: string;
    profileImage?: string;
    isLocal: boolean;
  } | null;
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export function VideoGrid({
  remoteVideoTiles,
  isVideoEnabled,
  currentUser,
  participants,
  currentAttendeeId,
  delayEnabled = false,
  delayMs = 1500,
  getParticipantVolume,
  onParticipantVolumeChange,
  onParticipantMuteToggle,
}: VideoGridProps) {
  const audioVideo = useAudioVideo();

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    participant: null,
  });

  // Helper to find video tile for a specific attendee
  const getTileIdForAttendee = useCallback(
    (attendeeId: string): number | undefined => {
      if (!audioVideo) {
        return undefined;
      }
      return remoteVideoTiles.find((tileId) => {
        const tileState = audioVideo.getVideoTile(tileId)?.state();
        return tileState?.boundAttendeeId === attendeeId;
      });
    },
    [audioVideo, remoteVideoTiles]
  );

  // 우클릭 핸들러
  const handleContextMenu = useCallback(
    (
      e: React.MouseEvent,
      participant: { id: string; name: string; profileImage?: string; isLocal: boolean }
    ) => {
      e.preventDefault();
      e.stopPropagation();

      // 화면 경계 체크 및 위치 조정
      const menuWidth = 260;
      const menuHeight = 220;
      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      setContextMenu({
        isOpen: true,
        position: { x, y },
        participant,
      });
    },
    []
  );

  // 컨텍스트 메뉴 닫기
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false, participant: null }));
  }, []);

  // 볼륨 변경 핸들러
  const handleVolumeChange = useCallback(
    (volume: number) => {
      if (contextMenu.participant && onParticipantVolumeChange) {
        onParticipantVolumeChange(contextMenu.participant.id, volume);
      }
    },
    [contextMenu.participant, onParticipantVolumeChange]
  );

  // 뮤트 토글 핸들러
  const handleMuteToggle = useCallback(() => {
    if (contextMenu.participant && onParticipantMuteToggle) {
      onParticipantMuteToggle(contextMenu.participant.id);
    }
  }, [contextMenu.participant, onParticipantMuteToggle]);

  // 현재 선택된 참가자의 볼륨 설정 가져오기
  const currentVolumeSettings = contextMenu.participant
    ? getParticipantVolume?.(contextMenu.participant.id) || DEFAULT_VOLUME_SETTINGS
    : DEFAULT_VOLUME_SETTINGS;

  // 1. Prepare Unified List
  // Local User
  const localParticipant = {
    id: currentAttendeeId || 'local',
    name: currentUser?.name || '나',
    profileImage: currentUser?.profileImage,
    isLocal: true,
  };

  // Remote Participants (filter out self if present in roster to avoid duplication)
  const remoteParticipants = participants
    .filter((p) => p.id !== currentAttendeeId)
    .map((p) => ({
      ...p,
      isLocal: false,
    }));

  const allParticipants = [localParticipant, ...remoteParticipants];
  const totalCount = allParticipants.length;
  const gridClass = getGridClass(totalCount);

  return (
    <>
      <div className="flex-1 p-3 bg-black h-full flex flex-col justify-center">
        <div className={`grid gap-3 w-full h-full ${gridClass}`}>
          {allParticipants.map((participant) => {
            let hasVideo = false;
            let tileId: number | undefined;

            if (participant.isLocal) {
              hasVideo = isVideoEnabled;
            } else {
              tileId = getTileIdForAttendee(participant.id);
              hasVideo = !!tileId;
            }

            // 참가자 볼륨 설정 가져오기
            const volumeSettings = getParticipantVolume?.(participant.id) || DEFAULT_VOLUME_SETTINGS;
            const isMuted = volumeSettings.isMuted && !participant.isLocal;

            return (
              <div
                key={participant.id}
                className="relative bg-neutral-950 overflow-hidden border border-neutral-800 w-full h-full min-h-0 cursor-pointer select-none"
                onContextMenu={(e) => handleContextMenu(e, participant)}
              >
                {hasVideo ? (
                  // Video ON
                  <div className="w-full h-full relative">
                    {participant.isLocal ? (
                      <LocalVideo className="w-full h-full object-cover" />
                    ) : tileId ? (
                      // Remote video: choose component based on delay setting
                      delayEnabled ? (
                        <DelayedRemoteVideo
                          tileId={tileId}
                          delayMs={delayMs}
                          delayEnabled={delayEnabled}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <RemoteVideo tileId={tileId} className="w-full h-full object-cover" />
                      )
                    ) : null}
                  </div>
                ) : (
                  // Video OFF -> Avatar
                  <UserAvatar
                    name={participant.name}
                    profileImage={participant.profileImage}
                    initial={participant.name.charAt(0).toUpperCase()}
                  />
                )}

                {/* 뮤트 표시 아이콘 (음소거된 참가자) */}
                {isMuted && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-red-500/90 text-white p-1.5 rounded-full" title="음소거됨">
                      <VolumeX className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Name Badge Overlay */}
                <div className="absolute bottom-3 left-3 z-10">
                  <div className="bg-black/80 text-white text-sm px-3 py-1.5 font-medium tracking-tight flex items-center gap-2">
                    {participant.name} {participant.isLocal && '(나)'}
                    {/* 볼륨 레벨 표시 (100% 미만일 때) */}
                    {!participant.isLocal && !isMuted && volumeSettings.volume < 100 && (
                      <span className="text-xs text-neutral-400">
                        ({volumeSettings.volume}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* 우클릭 힌트 오버레이 (hover 시) */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 참가자 컨텍스트 메뉴 */}
      <ParticipantContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        participant={contextMenu.participant}
        volumeSettings={currentVolumeSettings}
        onClose={handleCloseContextMenu}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
      />
    </>
  );
}
