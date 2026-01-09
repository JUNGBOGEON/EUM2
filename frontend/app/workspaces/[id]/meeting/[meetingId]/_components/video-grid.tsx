'use client';

import Image from 'next/image';
import { Video, VideoOff } from 'lucide-react';
import { LocalVideo, RemoteVideo } from 'amazon-chime-sdk-component-library-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserInfo {
  name: string;
  profileImage?: string;
}

interface VideoGridProps {
  remoteVideoTiles: number[];
  isVideoEnabled: boolean;
  onToggleVideo: () => void;
  currentUser?: UserInfo;
}

export function VideoGrid({
  remoteVideoTiles,
  isVideoEnabled,
  onToggleVideo,
  currentUser,
}: VideoGridProps) {
  const hasRemoteVideos = remoteVideoTiles.length > 0;
  const userName = currentUser?.name || '나';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex-1 p-4 relative bg-[#0f0f0f]">
      {hasRemoteVideos ? (
        // Grid layout when other participants exist
        <div
          className={`grid gap-3 w-full h-full ${
            remoteVideoTiles.length === 1
              ? 'grid-cols-1'
              : remoteVideoTiles.length <= 4
                ? 'grid-cols-2'
                : 'grid-cols-3'
          }`}
        >
          {remoteVideoTiles.map((tileId) => (
            <div
              key={tileId}
              className="relative bg-[#1a1a1a] rounded-xl overflow-hidden"
            >
              <RemoteVideo tileId={tileId} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        // Solo: Show my video large
        <div className="w-full h-full flex items-center justify-center">
          {isVideoEnabled ? (
            <div className="relative w-full max-w-4xl aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl">
              <LocalVideo className="w-full h-full object-cover" />
              <Badge
                variant="secondary"
                className="absolute bottom-4 left-4 bg-black/60 text-white border-none"
              >
                {userName}
              </Badge>
            </div>
          ) : (
            <div className="w-full max-w-4xl aspect-video bg-[#1a1a1a] rounded-xl flex items-center justify-center">
              <div className="text-center">
                {/* Profile image or initial */}
                {currentUser?.profileImage ? (
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-white/10">
                    <Image
                      src={currentUser.profileImage}
                      alt={userName}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center border-4 border-white/10">
                    <span className="text-4xl font-bold text-blue-400">
                      {userInitial}
                    </span>
                  </div>
                )}
                <p className="text-white text-xl font-medium mb-2">{userName}</p>
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                  <VideoOff className="w-4 h-4" />
                  <span>카메라 꺼짐</span>
                </div>
                <Button
                  onClick={onToggleVideo}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Video className="h-4 w-4 mr-2" />
                  카메라 켜기
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIP: My video/avatar when others exist */}
      {hasRemoteVideos && (
        <div className="absolute bottom-6 right-6 w-56 aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/10">
          {isVideoEnabled ? (
            <>
              <LocalVideo className="w-full h-full object-cover" />
              <Badge
                variant="secondary"
                className="absolute bottom-2 left-2 bg-black/60 text-white text-xs border-none"
              >
                {userName}
              </Badge>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {currentUser?.profileImage ? (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 mb-2">
                  <Image
                    src={currentUser.profileImage}
                    alt={userName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-white/10 mb-2">
                  <span className="text-xl font-bold text-blue-400">
                    {userInitial}
                  </span>
                </div>
              )}
              <span className="text-white/70 text-xs">{userName}</span>
              <span className="text-white/40 text-[10px]">카메라 꺼짐</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
