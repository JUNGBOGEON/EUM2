'use client';

import { useState, useCallback } from 'react';
import { useAudioVideo, useMeetingManager } from 'amazon-chime-sdk-component-library-react';

export interface UseDeviceManagerReturn {
  devicesInitialized: boolean;
  audioInitialized: boolean;
  permissionError: string | null;
  videoDevices: MediaDeviceInfo[];
  audioInputDevices: MediaDeviceInfo[];
  selectedVideoDevice: string;
  selectedAudioDevice: string;
  selectDevices: () => Promise<boolean>;
  initializeAudioOnly: () => Promise<boolean>;
  changeVideoDevice: (deviceId: string) => Promise<void>;
  changeAudioDevice: (deviceId: string) => Promise<void>;
  clearPermissionError: () => void;
}

export function useDeviceManager(): UseDeviceManagerReturn {
  const audioVideo = useAudioVideo();
  const meetingManager = useMeetingManager();

  const [devicesInitialized, setDevicesInitialized] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');

  const selectDevices = useCallback(async (): Promise<boolean> => {
    if (!audioVideo) return false;
    if (devicesInitialized) return true;

    try {
      console.log('Requesting media permissions...');
      setPermissionError(null);

      // 먼저 미디어 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      // 권한 얻은 후 스트림 정리
      stream.getTracks().forEach((track) => track.stop());
      console.log('Media permissions granted');

      // 오디오 입력 장치 목록
      const audioInputs = await audioVideo.listAudioInputDevices();
      console.log('Audio input devices:', audioInputs);
      setAudioInputDevices(audioInputs);
      if (audioInputs.length > 0 && audioInputs[0].deviceId) {
        await audioVideo.startAudioInput(audioInputs[0].deviceId);
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      // 오디오 출력 장치 선택
      const audioOutputs = await audioVideo.listAudioOutputDevices();
      if (audioOutputs.length > 0 && audioOutputs[0].deviceId) {
        await audioVideo.chooseAudioOutput(audioOutputs[0].deviceId);
      }

      // 비디오 입력 장치 목록
      const videoInputs = await audioVideo.listVideoInputDevices();
      console.log('Video input devices:', videoInputs);
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && videoInputs[0].deviceId) {
        // 3.1. Source Quality Uplift: 720p @ 30fps
        await audioVideo.chooseVideoInputQuality(1280, 720, 30);
        await meetingManager.startVideoInputDevice(videoInputs[0].deviceId);
        setSelectedVideoDevice(videoInputs[0].deviceId);
        console.log('Video device started:', videoInputs[0].deviceId);
      }

      setDevicesInitialized(true);
      return true;
    } catch (err) {
      console.error('Failed to select devices:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionError(
          '카메라/마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.'
        );
      } else {
        setPermissionError('장치를 초기화하는 데 실패했습니다.');
      }
      return false;
    }
  }, [audioVideo, meetingManager, devicesInitialized]);

  // 오디오만 초기화 (음소거 버튼용 - 빠른 초기화)
  const initializeAudioOnly = useCallback(async (): Promise<boolean> => {
    if (!audioVideo) return false;
    if (audioInitialized) return true;

    try {
      console.log('[DeviceManager] Initializing audio only...');
      setPermissionError(null);

      // 오디오 권한만 요청 (비디오 제외 - 훨씬 빠름)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      console.log('[DeviceManager] Audio permission granted');

      // 오디오 입력 장치 목록
      const audioInputs = await audioVideo.listAudioInputDevices();
      console.log('[DeviceManager] Audio input devices:', audioInputs);
      setAudioInputDevices(audioInputs);
      if (audioInputs.length > 0 && audioInputs[0].deviceId) {
        await audioVideo.startAudioInput(audioInputs[0].deviceId);
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      // 오디오 출력 장치 선택
      const audioOutputs = await audioVideo.listAudioOutputDevices();
      if (audioOutputs.length > 0 && audioOutputs[0].deviceId) {
        await audioVideo.chooseAudioOutput(audioOutputs[0].deviceId);
      }

      setAudioInitialized(true);
      console.log('[DeviceManager] ✅ Audio initialized successfully');
      return true;
    } catch (err) {
      console.error('[DeviceManager] Failed to initialize audio:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionError(
          '마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.'
        );
      } else {
        setPermissionError('오디오 장치를 초기화하는 데 실패했습니다.');
      }
      return false;
    }
  }, [audioVideo, audioInitialized]);

  const changeVideoDevice = useCallback(
    async (deviceId: string) => {
      if (!meetingManager) return;
      try {
        // Ensure quality persists when changing devices
        await meetingManager.audioVideo?.chooseVideoInputQuality(1280, 720, 30);
        await meetingManager.startVideoInputDevice(deviceId);
        setSelectedVideoDevice(deviceId);
      } catch (err) {
        console.error('Failed to change video device:', err);
      }
    },
    [meetingManager]
  );

  const changeAudioDevice = useCallback(
    async (deviceId: string) => {
      if (!audioVideo) return;
      try {
        await audioVideo.startAudioInput(deviceId);
        setSelectedAudioDevice(deviceId);
      } catch (err) {
        console.error('Failed to change audio device:', err);
      }
    },
    [audioVideo]
  );

  const clearPermissionError = useCallback(() => {
    setPermissionError(null);
  }, []);

  return {
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
  };
}
