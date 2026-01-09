'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { VideoOff } from 'lucide-react';
import { RemoteVideo, LocalVideo, useAudioVideo } from 'amazon-chime-sdk-component-library-react';
import { Badge } from '@/components/ui/badge';

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
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {profileImage ? (
        <div className="w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/10 mb-4 aspect-square">
          <Image
            src={profileImage}
            alt={name}
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-20 h-20 md:w-32 md:h-32 bg-blue-500/20 rounded-full flex items-center justify-center border-4 border-white/10 mb-4 aspect-square">
          <span className="text-3xl md:text-5xl font-bold text-blue-400">
            {initial}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <VideoOff className="w-4 h-4" />
        <span>카메라 꺼짐</span>
      </div>
    </div>
  );
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
}: VideoGridProps) {
  const audioVideo = useAudioVideo();

  // Helper to find video tile for a specific attendee
  const getTileIdForAttendee = useCallback(
    (attendeeId: string): number | undefined => {
      if (!audioVideo) {
        // Warn only once or in development if needed to avoid spam, but safe for now to verify
        // console.warn('[VideoGrid] audioVideo is not available'); 
        return undefined;
      }
      return remoteVideoTiles.find((tileId) => {
        const tileState = audioVideo.getVideoTile(tileId)?.state();
        return tileState?.boundAttendeeId === attendeeId;
      });
    },
    [audioVideo, remoteVideoTiles]
  );

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
    <div className="flex-1 p-4 bg-[#0f0f0f] h-full flex flex-col justify-center">
      <div className={`grid gap-4 w-full h-full ${gridClass}`}>
        {allParticipants.map((participant) => {
          let hasVideo = false;
          let tileId: number | undefined;

          if (participant.isLocal) {
            hasVideo = isVideoEnabled;
          } else {
            tileId = getTileIdForAttendee(participant.id);
            hasVideo = !!tileId;
          }

          return (
            <div
              key={participant.id}
              className="relative bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg border border-white/10 w-full h-full min-h-0"
            >
              {hasVideo ? (
                // Video ON
                <div className="w-full h-full relative">
                  {participant.isLocal ? (
                    <LocalVideo className="w-full h-full object-cover" />
                  ) : (
                    tileId && <RemoteVideo tileId={tileId} className="w-full h-full object-cover" />
                  )}
                </div>
              ) : (
                // Video OFF -> Avatar
                <UserAvatar
                  name={participant.name}
                  profileImage={participant.profileImage}
                  initial={participant.name.charAt(0).toUpperCase()}
                />
              )}

              {/* Name Badge Overlay */}
              <div className="absolute bottom-4 left-4 z-10">
                <Badge
                  variant="secondary"
                  className="bg-black/60 text-white border-none text-sm px-3 py-1"
                >
                  {participant.name} {participant.isLocal && '(나)'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
