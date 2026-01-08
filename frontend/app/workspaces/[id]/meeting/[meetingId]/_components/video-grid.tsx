'use client';

import { Video } from 'lucide-react';
import { LocalVideo, RemoteVideo } from 'amazon-chime-sdk-component-library-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VideoGridProps {
  remoteVideoTiles: number[];
  isVideoEnabled: boolean;
  onToggleVideo: () => void;
}

export function VideoGrid({
  remoteVideoTiles,
  isVideoEnabled,
  onToggleVideo,
}: VideoGridProps) {
  const hasRemoteVideos = remoteVideoTiles.length > 0;

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
                나
              </Badge>
            </div>
          ) : (
            <div className="w-full max-w-4xl aspect-video bg-[#1a1a1a] rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
                  <Video className="w-12 h-12 text-white/30" />
                </div>
                <p className="text-white/50 text-base mb-4">카메라가 꺼져 있습니다</p>
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

      {/* PIP: My video when others exist */}
      {hasRemoteVideos && isVideoEnabled && (
        <div className="absolute bottom-6 right-6 w-56 aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/10">
          <LocalVideo className="w-full h-full object-cover" />
          <Badge
            variant="secondary"
            className="absolute bottom-2 left-2 bg-black/60 text-white text-xs border-none"
          >
            나
          </Badge>
        </div>
      )}
    </div>
  );
}
