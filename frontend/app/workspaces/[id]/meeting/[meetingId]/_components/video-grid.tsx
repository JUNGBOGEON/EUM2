'use client';

import Image from 'next/image';
import { Video, VideoOff } from 'lucide-react';
import { LocalVideo, RemoteVideo, useAudioVideo } from 'amazon-chime-sdk-component-library-react';
import { Badge } from '@/components/ui/badge';
// Note: We removed the solo-view Button import because controls are now separate or on the tile overlay? 
// The implementation plan mentions "Video Toggle" verification, but usually controls are in the MeetingControls bar.
// I'll keep the design simple: just the video/avatar tiles. 

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
  onToggleVideo: () => void;
  currentUser?: UserInfo;
  participants: Participant[];
  currentAttendeeId?: string | null;
}

export function VideoGrid({
  remoteVideoTiles,
  isVideoEnabled,
  currentUser,
  participants,
  currentAttendeeId,
}: VideoGridProps) {
  const audioVideo = useAudioVideo();

  // Helper to find video tile for a specific attendee
  const getTileIdForAttendee = (attendeeId: string): number | undefined => {
    if (!audioVideo) return undefined;
    return remoteVideoTiles.find(tileId => {
      const tileState = audioVideo.getVideoTile(tileId)?.state();
      return tileState?.boundAttendeeId === attendeeId;
    });
  };

  // 1. Prepare Unified List
  // Local User
  const localParticipant = {
    id: currentAttendeeId || 'local',
    name: currentUser?.name || '나',
    profileImage: currentUser?.profileImage,
    isLocal: true,
  };

  // Remote Participants (filter out self if present in roster to avoid dulication)
  const remoteParticipants = participants
    .filter(p => p.id !== currentAttendeeId)
    .map(p => ({
      ...p,
      isLocal: false,
    }));

  const allParticipants = [localParticipant, ...remoteParticipants];
  const totalCount = allParticipants.length;

  // 2. Dynamic Grid Classes
  let gridClass = '';
  if (totalCount === 1) {
    gridClass = 'grid-cols-1 grid-rows-1';
  } else if (totalCount === 2) {
    gridClass = 'grid-cols-1 md:grid-cols-2 grid-rows-1'; // Side by side on desktop
  } else if (totalCount <= 4) {
    gridClass = 'grid-cols-2 grid-rows-2'; // 2x2
  } else if (totalCount <= 6) {
    gridClass = 'grid-cols-2 md:grid-cols-3 grid-rows-2'; // 3x2 on desktop
  } else if (totalCount <= 9) {
    gridClass = 'grid-cols-3 grid-rows-3'; // 3x3
  } else {
    // 10+ people
    gridClass = 'grid-cols-3 md:grid-cols-4 auto-rows-fr';
  }

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
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  {participant.profileImage ? (
                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/10 mb-4 aspect-square">
                      <Image
                        src={participant.profileImage}
                        alt={participant.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 md:w-32 md:h-32 bg-blue-500/20 rounded-full flex items-center justify-center border-4 border-white/10 mb-4 aspect-square">
                      <span className="text-3xl md:text-5xl font-bold text-blue-400">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <VideoOff className="w-4 h-4" />
                    <span>카메라 꺼짐</span>
                  </div>
                </div>
              )}

              {/* Name Badge Overlay */}
              <div className="absolute bottom-4 left-4 z-10">
                <Badge variant="secondary" className="bg-black/60 text-white border-none text-sm px-3 py-1">
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
