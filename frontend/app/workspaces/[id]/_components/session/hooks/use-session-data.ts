'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../../_lib/constants';
import type { MeetingSession, StructuredSummary } from '../../../_lib/types';

// Local transcript item type
export interface LocalTranscriptItem {
  id: string;
  resultId?: string;
  originalText: string;
  speakerId?: string;
  speaker?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  relativeStartSec?: number;
  startTimeMs: number;
}

export type SummaryStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface SummaryData {
  status: SummaryStatus;
  content: string | null;
  structuredSummary: StructuredSummary | null;
  presignedUrl: string | null;
}

export interface SessionDetail extends MeetingSession {
  participants?: {
    id: string;
    userId: string;
    user?: {
      id: string;
      name: string;
      profileImage?: string;
    };
  }[];
}

interface UseSessionDataOptions {
  session: MeetingSession | null;
}

import { useLanguage } from '@/contexts/LanguageContext';

export function useSessionData({ session }: UseSessionDataOptions) {
  const { language } = useLanguage();
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [transcripts, setTranscripts] = useState<LocalTranscriptItem[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);

  // Fetch summary data
  const fetchSummary = useCallback(async (sessionId: string) => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/${sessionId}/summary?lang=${language}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
        return data as SummaryData;
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
    return null;
  }, [language]);

  // Regenerate summary
  const handleRegenerateSummary = useCallback(async () => {
    if (!session) return;

    setIsRegeneratingSummary(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/${session.id}/summary/regenerate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        // Set status to processing immediately
        setSummaryData(prev => prev ? { ...prev, status: 'processing' } : { status: 'processing', content: null, structuredSummary: null, presignedUrl: null });
      }
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
    } finally {
      setIsRegeneratingSummary(false);
    }
  }, [session]);

  // Fetch session detail and transcripts when a session is selected
  useEffect(() => {
    if (!session) {
      setSessionDetail(null);
      setTranscripts([]);
      setSummaryData(null);
      return;
    }

    const fetchSessionDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const response = await fetch(`${API_URL}/api/meetings/sessions/${session.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSessionDetail(data);
        }
      } catch (error) {
        console.error('Failed to fetch session detail:', error);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    const fetchTranscripts = async () => {
      setIsLoadingTranscripts(true);
      try {
        const response = await fetch(`${API_URL}/api/meetings/${session.id}/transcriptions/final`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTranscripts(data);
        }
      } catch (error) {
        console.error('Failed to fetch transcripts:', error);
      } finally {
        setIsLoadingTranscripts(false);
      }
    };

    fetchSessionDetail();
    fetchTranscripts();
    fetchSummary(session.id);
  }, [session, fetchSummary]);

  // Poll for summary status when pending or processing
  useEffect(() => {
    if (!session || !summaryData) return;

    if (summaryData.status === 'pending' || summaryData.status === 'processing') {
      const pollInterval = setInterval(() => {
        fetchSummary(session.id);
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(pollInterval);
    }
  }, [session, summaryData?.status, fetchSummary]);

  return {
    sessionDetail,
    transcripts,
    summaryData,
    isLoadingDetail,
    isLoadingTranscripts,
    isLoadingSummary,
    isRegeneratingSummary,
    handleRegenerateSummary,
  };
}
