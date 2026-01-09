'use client';

import { LocalVideo, RemoteVideo } from 'amazon-chime-sdk-component-library-react';

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
    <div className="flex-1 p-4 relative flex items-center justify-center h-full">
      {hasRemoteVideos ? (
        // 다른 참가자가 있는 경우: 그리드 레이아웃
        <div
          className={`grid gap-4 w-full max-w-7xl auto-rows-fr ${remoteVideoTiles.length <= 1
              ? 'grid-cols-1'
              : remoteVideoTiles.length <= 4
                ? 'grid-cols-2'
                : remoteVideoTiles.length <= 9
                  ? 'grid-cols-3'
                  : 'grid-cols-4'
            }`}
        >
          {remoteVideoTiles.map((tileId) => (
            <div
              key={tileId}
              className="relative bg-[#252525] rounded-lg overflow-hidden shadow-lg border border-[#ffffff14]"
            >
              <RemoteVideo tileId={tileId} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        // 혼자인 경우: 내 비디오를 크게 표시
        <div className="w-full h-full flex items-center justify-center">
          {isVideoEnabled ? (
            <div className="relative w-full max-w-3xl aspect-video bg-[#252525] rounded-lg overflow-hidden">
              <LocalVideo className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-[12px] text-white">
                나
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl aspect-video bg-[#252525] rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#ffffff14] rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-[#ffffff71]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-[14px] text-[#ffffff71]">카메라가 꺼져 있습니다</p>
                <button
                  onClick={onToggleVideo}
                  className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[13px] rounded-lg transition-colors"
                >
                  카메라 켜기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 내 비디오 (다른 참가자가 있을 때 PIP) */}
      {hasRemoteVideos && isVideoEnabled && (
        <div className="absolute bottom-4 right-4 w-48 aspect-video bg-[#252525] rounded-lg overflow-hidden shadow-lg border border-[#ffffff14]">
          <LocalVideo className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[11px] text-white">
            나
          </div>
        </div>
      )}
    </div>
  );
}
