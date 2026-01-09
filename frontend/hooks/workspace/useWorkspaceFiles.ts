'use client';

/**
 * 워크스페이스 파일 관리 훅
 * 
 * 새 API 클라이언트와 에러 핸들링 유틸리티를 사용합니다.
 */

import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '@/lib/api';
import { handleError, getErrorMessage } from '@/lib/utils/error';
import type {
  WorkspaceFile,
  WorkspaceFileType,
  FileListResponse,
} from '@/lib/types';

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
        const data = await filesApi.list(workspaceId, {
          type: selectedType !== 'all' ? selectedType : undefined,
          cursor: !reset && cursor ? cursor : undefined,
        });

        if (reset) {
          setFiles(data.files);
        } else {
          setFiles((prev) => [...prev, ...data.files]);
        }

        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
        setTotal(data.total);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        handleError(err, { showToast: false, context: 'fetchFiles' });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const newFile = await filesApi.upload(workspaceId, file);
        setFiles((prev) => [newFile, ...prev]);
        setTotal((prev) => prev + 1);
        return newFile;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        handleError(err, { showToast: true, context: 'uploadFile' });
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
        await filesApi.delete(workspaceId, fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        handleError(err, { showToast: true, context: 'deleteFile' });
        throw err;
      }
    },
    [workspaceId]
  );

  const getDownloadUrl = useCallback(
    async (fileId: string): Promise<string> => {
      try {
        const data = await filesApi.getDownloadUrl(workspaceId, fileId);
        return data.presignedUrl;
      } catch (err) {
        handleError(err, { showToast: true, context: 'getDownloadUrl' });
        throw err;
      }
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

export default useWorkspaceFiles;
