'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  WorkspaceFile,
  WorkspaceFileType,
  FileListResponse,
} from '@/components/workspace/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseWorkspaceFilesReturn {
  files: WorkspaceFile[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  selectedType: WorkspaceFileType | 'all';
  setSelectedType: (type: WorkspaceFileType | 'all') => void;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  uploadFile: (file: File) => Promise<WorkspaceFile>;
  deleteFile: (fileId: string) => Promise<void>;
  getDownloadUrl: (fileId: string) => Promise<string>;
  isUploading: boolean;
}

export function useWorkspaceFiles(workspaceId: string): UseWorkspaceFilesReturn {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedType, setSelectedTypeState] = useState<WorkspaceFileType | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = useCallback(
    async (reset: boolean = false) => {
      if (!workspaceId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (selectedType !== 'all') {
          params.append('type', selectedType);
        }
        if (!reset && cursor) {
          params.append('cursor', cursor);
        }

        const response = await fetch(
          `${API_URL}/api/workspaces/${workspaceId}/files?${params}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('파일 목록을 불러오는데 실패했습니다');
        }

        const data: FileListResponse = await response.json();

        if (reset) {
          setFiles(data.files);
        } else {
          setFiles((prev) => [...prev, ...data.files]);
        }

        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 목록을 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, selectedType, cursor]
  );

  // Reset and fetch when type changes
  useEffect(() => {
    setCursor(null);
    fetchFiles(true);
  }, [workspaceId, selectedType]);

  const setSelectedType = useCallback((type: WorkspaceFileType | 'all') => {
    setSelectedTypeState(type);
  }, []);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchFiles(false);
    }
  }, [fetchFiles, hasMore, isLoading]);

  const refetch = useCallback(async () => {
    setCursor(null);
    await fetchFiles(true);
  }, [fetchFiles]);

  const uploadFile = useCallback(
    async (file: File): Promise<WorkspaceFile> => {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${API_URL}/api/workspaces/${workspaceId}/files`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '파일 업로드에 실패했습니다');
        }

        const newFile: WorkspaceFile = await response.json();
        setFiles((prev) => [newFile, ...prev]);
        setTotal((prev) => prev + 1);

        return newFile;
      } catch (err) {
        const message = err instanceof Error ? err.message : '파일 업로드에 실패했습니다';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId]
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<void> => {
      try {
        const response = await fetch(
          `${API_URL}/api/workspaces/${workspaceId}/files/${fileId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('파일 삭제에 실패했습니다');
        }

        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 삭제에 실패했습니다');
        throw err;
      }
    },
    [workspaceId]
  );

  const getDownloadUrl = useCallback(
    async (fileId: string): Promise<string> => {
      const response = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/files/${fileId}/download`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('다운로드 URL을 가져오는데 실패했습니다');
      }

      const data = await response.json();
      return data.presignedUrl;
    },
    [workspaceId]
  );

  return {
    files,
    total,
    isLoading,
    error,
    hasMore,
    selectedType,
    setSelectedType,
    loadMore,
    refetch,
    uploadFile,
    deleteFile,
    getDownloadUrl,
    isUploading,
  };
}
