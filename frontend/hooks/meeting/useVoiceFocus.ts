'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMeetingManager, useAudioInputs } from 'amazon-chime-sdk-component-library-react';
import {
  VoiceFocusDeviceTransformer,
  isAudioTransformDevice,
} from 'amazon-chime-sdk-js';

export interface UseVoiceFocusReturn {
  /** Voice Focus 지원 여부 */
  isVoiceFocusSupported: boolean;
  /** Voice Focus 활성화 상태 */
  isVoiceFocusEnabled: boolean;
  /** Voice Focus 로딩 상태 */
  isVoiceFocusLoading: boolean;
  /** Voice Focus 토글 */
  toggleVoiceFocus: () => Promise<void>;
}

/**
 * Voice Focus (노이즈 억제) 기능을 관리하는 hook
 *
 * - 머신러닝 기반 배경 소음 제거
 * - 기본값: 활성화 (enabled by default)
 * - 지원되지 않는 브라우저에서는 자동 비활성화
 */
export function useVoiceFocus(): UseVoiceFocusReturn {
  const meetingManager = useMeetingManager();
  const { selectedDevice } = useAudioInputs();

  // 초기값을 true로 설정 (지원 여부 확인 후 변경)
  const [isVoiceFocusSupported, setIsVoiceFocusSupported] = useState(true);
  const [isVoiceFocusEnabled, setIsVoiceFocusEnabled] = useState(false);
  const [isVoiceFocusLoading, setIsVoiceFocusLoading] = useState(false);

  const voiceFocusTransformerRef = useRef<VoiceFocusDeviceTransformer | null>(null);
  const originalDeviceRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const isCheckingSupportRef = useRef(false);

  // Voice Focus 지원 여부 확인 및 초기화
  useEffect(() => {
    if (isCheckingSupportRef.current) return;
    isCheckingSupportRef.current = true;

    const checkSupport = async () => {
      try {
        console.log('[VoiceFocus] Checking browser support...');
        const isSupported = await VoiceFocusDeviceTransformer.isSupported();
        setIsVoiceFocusSupported(isSupported);

        if (isSupported) {
          console.log('[VoiceFocus] ✅ Supported in this browser');
        } else {
          console.log('[VoiceFocus] ❌ Not supported in this browser');
        }
      } catch (error) {
        console.error('[VoiceFocus] Error checking support:', error);
        setIsVoiceFocusSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Voice Focus transformer 초기화
  const initializeVoiceFocus = useCallback(async (): Promise<VoiceFocusDeviceTransformer | null> => {
    if (voiceFocusTransformerRef.current) {
      console.log('[VoiceFocus] Using cached transformer');
      return voiceFocusTransformerRef.current;
    }

    try {
      console.log('[VoiceFocus] Creating transformer...');
      const transformer = await VoiceFocusDeviceTransformer.create();
      voiceFocusTransformerRef.current = transformer;
      console.log('[VoiceFocus] ✅ Transformer created successfully');
      return transformer;
    } catch (error) {
      console.error('[VoiceFocus] ❌ Failed to create transformer:', error);
      return null;
    }
  }, []);

  // Voice Focus 활성화
  const enableVoiceFocus = useCallback(async () => {
    console.log('[VoiceFocus] Attempting to enable...');
    console.log('[VoiceFocus] - isVoiceFocusSupported:', isVoiceFocusSupported);
    console.log('[VoiceFocus] - audioVideo ready:', !!meetingManager.audioVideo);

    if (!isVoiceFocusSupported) {
      console.log('[VoiceFocus] ❌ Not supported, skipping enable');
      return;
    }

    const audioVideo = meetingManager.audioVideo;
    if (!audioVideo) {
      console.log('[VoiceFocus] ❌ AudioVideo not ready, skipping enable');
      return;
    }

    setIsVoiceFocusLoading(true);
    console.log('[VoiceFocus] 🔄 Loading started...');

    try {
      const transformer = await initializeVoiceFocus();
      if (!transformer) {
        throw new Error('Failed to initialize Voice Focus transformer');
      }

      // 현재 장치 저장
      const currentDevice = selectedDevice;
      if (currentDevice && typeof currentDevice === 'string') {
        originalDeviceRef.current = currentDevice;
        console.log('[VoiceFocus] Original device saved:', currentDevice);
      }

      // Voice Focus 장치 생성
      const deviceToTransform = originalDeviceRef.current || 'default';
      console.log('[VoiceFocus] Creating transform device for:', deviceToTransform);

      const voiceFocusDevice = await transformer.createTransformDevice(deviceToTransform);

      if (voiceFocusDevice) {
        console.log('[VoiceFocus] Transform device created, applying...');
        await meetingManager.startAudioInputDevice(voiceFocusDevice);
        setIsVoiceFocusEnabled(true);
        console.log('[VoiceFocus] ✅ Enabled successfully!');
      } else {
        throw new Error('Failed to create Voice Focus device');
      }
    } catch (error) {
      console.error('[VoiceFocus] ❌ Failed to enable:', error);
      setIsVoiceFocusEnabled(false);
    } finally {
      setIsVoiceFocusLoading(false);
      console.log('[VoiceFocus] 🔄 Loading finished');
    }
  }, [isVoiceFocusSupported, meetingManager, selectedDevice, initializeVoiceFocus]);

  // Voice Focus 비활성화
  const disableVoiceFocus = useCallback(async () => {
    console.log('[VoiceFocus] Attempting to disable...');

    const audioVideo = meetingManager.audioVideo;
    if (!audioVideo) {
      console.log('[VoiceFocus] ❌ AudioVideo not ready');
      return;
    }

    setIsVoiceFocusLoading(true);
    console.log('[VoiceFocus] 🔄 Loading started...');

    try {
      // 원본 장치로 복원
      const originalDevice = originalDeviceRef.current || 'default';
      console.log('[VoiceFocus] Restoring original device:', originalDevice);
      await meetingManager.startAudioInputDevice(originalDevice);
      setIsVoiceFocusEnabled(false);
      console.log('[VoiceFocus] ✅ Disabled successfully!');
    } catch (error) {
      console.error('[VoiceFocus] ❌ Failed to disable:', error);
    } finally {
      setIsVoiceFocusLoading(false);
      console.log('[VoiceFocus] 🔄 Loading finished');
    }
  }, [meetingManager]);

  // Voice Focus 토글
  const toggleVoiceFocus = useCallback(async () => {
    console.log('[VoiceFocus] Toggle called, current state:', {
      isVoiceFocusEnabled,
      isVoiceFocusLoading,
      isVoiceFocusSupported,
    });

    if (isVoiceFocusLoading) {
      console.log('[VoiceFocus] ⏳ Already loading, ignoring toggle');
      return;
    }

    if (!isVoiceFocusSupported) {
      console.log('[VoiceFocus] ❌ Not supported, ignoring toggle');
      return;
    }

    if (isVoiceFocusEnabled) {
      await disableVoiceFocus();
    } else {
      await enableVoiceFocus();
    }
  }, [isVoiceFocusEnabled, isVoiceFocusLoading, isVoiceFocusSupported, enableVoiceFocus, disableVoiceFocus]);

  // 기본 활성화: 미팅 참가 후 자동으로 Voice Focus 활성화
  useEffect(() => {
    const audioVideo = meetingManager.audioVideo;

    // audioVideo가 준비되고, 아직 초기화하지 않았고, 지원되는 경우
    if (audioVideo && !hasInitializedRef.current && isVoiceFocusSupported) {
      hasInitializedRef.current = true;
      console.log('[VoiceFocus] 🚀 Auto-enabling Voice Focus in 1 second...');

      // 약간의 딜레이 후 활성화 (오디오 장치 설정 완료 대기)
      const timer = setTimeout(() => {
        enableVoiceFocus();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [meetingManager.audioVideo, isVoiceFocusSupported, enableVoiceFocus]);

  // 클린업
  useEffect(() => {
    return () => {
      if (voiceFocusTransformerRef.current) {
        console.log('[VoiceFocus] Cleaning up transformer');
        voiceFocusTransformerRef.current = null;
      }
    };
  }, []);

  return {
    isVoiceFocusSupported,
    isVoiceFocusEnabled,
    isVoiceFocusLoading,
    toggleVoiceFocus,
  };
}
