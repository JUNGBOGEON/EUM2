'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { API_URL } from '@/lib/config';

interface VoiceStatusResponse {
  voiceDubbingEnabled: boolean;
  voiceEnrolledAt: string | null;
  hasVoiceEmbedding: boolean;
}

interface EnrollVoiceResponse {
  success: boolean;
  message: string;
}

interface ToggleVoiceDubbingResponse {
  voiceDubbingEnabled: boolean;
}

interface DeleteVoiceDataResponse {
  success: boolean;
  message: string;
}

/**
 * 음성 등록 관련 API 훅
 *
 * @example
 * const {
 *   enrollVoice,
 *   getVoiceStatus,
 *   toggleVoiceDubbing,
 *   deleteVoiceData,
 *   isLoading,
 *   error
 * } = useVoiceEnrollment();
 *
 * // 음성 등록
 * const handleRecording = async (audioBlob: Blob) => {
 *   await enrollVoice(audioBlob);
 * };
 */
export function useVoiceEnrollment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 음성 등록
   * @param audioBlob 녹음된 오디오 Blob
   */
  const enrollVoice = useCallback(async (audioBlob: Blob): Promise<EnrollVoiceResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      const response = await fetch(`${API_URL}/api/users/voice/enroll`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `음성 등록 실패: ${response.status}`);
      }

      const data: EnrollVoiceResponse = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '음성 등록 중 오류가 발생했습니다.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 음성 등록 상태 조회
   */
  const getVoiceStatus = useCallback(async (): Promise<VoiceStatusResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<VoiceStatusResponse>('/users/voice/status');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '상태 조회 중 오류가 발생했습니다.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 음성 더빙 활성화/비활성화
   * @param enabled 활성화 여부
   */
  const toggleVoiceDubbing = useCallback(
    async (enabled: boolean): Promise<ToggleVoiceDubbingResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.patch<ToggleVoiceDubbingResponse>(
          '/users/voice/toggle',
          { enabled }
        );
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : '설정 변경 중 오류가 발생했습니다.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 음성 데이터 삭제
   */
  const deleteVoiceData = useCallback(async (): Promise<DeleteVoiceDataResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.delete<DeleteVoiceDataResponse>('/users/voice/delete');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 에러 상태 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    enrollVoice,
    getVoiceStatus,
    toggleVoiceDubbing,
    deleteVoiceData,
    clearError,
    isLoading,
    error,
  };
}

export default useVoiceEnrollment;
