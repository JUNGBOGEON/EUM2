'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Volume2, VolumeX, Volume1, User } from 'lucide-react';
import Image from 'next/image';
import type { ParticipantVolumeSettings } from '@/hooks/meeting/useParticipantVolume';

interface ParticipantContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  participant: {
    id: string; // attendeeId
    name: string;
    profileImage?: string;
    isLocal: boolean;
  } | null;
  volumeSettings: ParticipantVolumeSettings;
  onClose: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

/**
 * 참가자 우클릭 컨텍스트 메뉴
 *
 * 디스코드 스타일의 드롭다운 메뉴:
 * - 참가자 이름 및 프로필
 * - 볼륨 슬라이더
 * - 뮤트/언뮤트 토글
 */
export function ParticipantContextMenu({
  isOpen,
  position,
  participant,
  volumeSettings,
  onClose,
  onVolumeChange,
  onMuteToggle,
}: ParticipantContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [localVolume, setLocalVolume] = useState(volumeSettings.volume);

  // volumeSettings 변경 시 로컬 상태 동기화
  useEffect(() => {
    setLocalVolume(volumeSettings.volume);
  }, [volumeSettings.volume]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // 약간의 딜레이 후 이벤트 리스너 추가 (우클릭 이벤트와 충돌 방지)
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // 볼륨 슬라이더 변경 핸들러
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseInt(e.target.value, 10);
      setLocalVolume(newVolume);
    },
    []
  );

  // 슬라이더에서 손 떼면 실제 적용
  const handleVolumeCommit = useCallback(() => {
    onVolumeChange(localVolume);
  }, [localVolume, onVolumeChange]);

  // 볼륨 아이콘 선택
  const VolumeIcon = volumeSettings.isMuted
    ? VolumeX
    : localVolume === 0
    ? VolumeX
    : localVolume < 50
    ? Volume1
    : Volume2;

  if (!isOpen || !participant) {
    return null;
  }

  // 본인인 경우 볼륨 조절 불가 안내
  if (participant.isLocal) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[100] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-2 px-3 min-w-[200px]"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="flex items-center gap-3 py-2">
          {participant.profileImage ? (
            <Image
              src={participant.profileImage}
              alt={participant.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-neutral-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white">{participant.name}</p>
            <p className="text-xs text-neutral-500">나의 오디오</p>
          </div>
        </div>
        <div className="border-t border-neutral-700 mt-2 pt-2">
          <p className="text-xs text-neutral-500 text-center py-2">
            본인의 오디오 설정은<br />
            마이크 설정에서 조절하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-2 min-w-[240px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* 참가자 정보 헤더 */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-neutral-800">
        {participant.profileImage ? (
          <Image
            src={participant.profileImage}
            alt={participant.name}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="w-9 h-9 bg-neutral-800 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-neutral-400">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{participant.name}</p>
          <p className="text-xs text-neutral-500">사용자 볼륨</p>
        </div>
      </div>

      {/* 볼륨 컨트롤 */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-3">
          {/* 뮤트 버튼 */}
          <button
            onClick={onMuteToggle}
            className={`p-2 rounded-lg transition-colors ${
              volumeSettings.isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
            title={volumeSettings.isMuted ? '음소거 해제' : '음소거'}
          >
            <VolumeIcon className="w-5 h-5" />
          </button>

          {/* 볼륨 슬라이더 */}
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={volumeSettings.isMuted ? 0 : localVolume}
              onChange={handleVolumeChange}
              onMouseUp={handleVolumeCommit}
              onTouchEnd={handleVolumeCommit}
              disabled={volumeSettings.isMuted}
              className={`w-full h-2 rounded-full appearance-none cursor-pointer
                ${volumeSettings.isMuted ? 'opacity-50' : ''}
                bg-neutral-700
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer`}
              style={{
                background: volumeSettings.isMuted
                  ? undefined
                  : `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${localVolume}%, #404040 ${localVolume}%, #404040 100%)`,
              }}
            />
          </div>

          {/* 볼륨 표시 */}
          <span className="text-sm text-neutral-400 min-w-[36px] text-right">
            {volumeSettings.isMuted ? '0' : localVolume}%
          </span>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="px-3 py-2 border-t border-neutral-800">
        <p className="text-xs text-neutral-600 leading-relaxed">
          {volumeSettings.isMuted ? (
            <>
              <span className="text-red-400">음소거됨</span> - 이 참가자의 음성이 들리지 않습니다.
              <br />
              번역 TTS는 계속 재생됩니다.
            </>
          ) : localVolume < 100 ? (
            <>
              이 참가자의 음성 볼륨이 {localVolume}%로 설정되었습니다.
              <br />
              번역 TTS는 영향받지 않습니다.
            </>
          ) : (
            '볼륨을 조절하거나 음소거할 수 있습니다.'
          )}
        </p>
      </div>
    </div>
  );
}
