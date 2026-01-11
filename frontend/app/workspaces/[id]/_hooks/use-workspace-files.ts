'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { WorkspaceFile } from '../_lib/types';

interface UseWorkspaceFilesProps {
  workspaceId: string;
}

interface UseWorkspaceFilesReturn {
  files: WorkspaceFile[];
  isFilesLoading: boolean;
  isUploading: boolean;
  fetchFiles: () => Promise<void>;
  uploadFiles: (files: FileList) => Promise<void>;
  downloadFile: (file: WorkspaceFile) => void;
  deleteFile: (file: WorkspaceFile) => Promise<void>;
  renameFile: (file: WorkspaceFile, newName: string) => Promise<void>;
  getFilePreviewUrl: (file: WorkspaceFile) => Promise<string | null>;
}

export function useWorkspaceFiles({ workspaceId }: UseWorkspaceFilesProps): UseWorkspaceFilesReturn {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    setIsFilesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setFiles([]);
        return;
      }
      const data = await response.json();
      const filesArray = Array.isArray(data) ? data : (data.files && Array.isArray(data.files) ? data.files : []);
      setFiles(filesArray);
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setIsFilesLoading(false);
    }
  }, [workspaceId]);

  const uploadFiles = useCallback(async (fileList: FileList) => {
    setIsUploading(true);
    try {
      const filesArray = Array.from(fileList);

      for (const file of filesArray) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to upload file');
        }
      }

      toast.success(filesArray.length > 1 ? `${filesArray.length}개 파일이 업로드되었습니다.` : '파일이 업로드되었습니다.');
      await fetchFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [workspaceId, fetchFiles]);

  const downloadFile = useCallback(async (file: WorkspaceFile) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      const fileResponse = await fetch(data.presignedUrl);
      const blob = await fileResponse.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('파일 다운로드에 실패했습니다.');
    }
  }, [workspaceId]);

  const deleteFile = useCallback(async (file: WorkspaceFile) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete file');

      toast.success('파일이 삭제되었습니다.');
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('파일 삭제에 실패했습니다.');
    }
  }, [workspaceId, fetchFiles]);

  const renameFile = useCallback(async (file: WorkspaceFile, newName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filename: newName }),
      });

      if (!response.ok) throw new Error('Failed to rename file');

      toast.success('파일 이름이 변경되었습니다.');
      await fetchFiles();
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('파일 이름 변경에 실패했습니다.');
    }
  }, [workspaceId, fetchFiles]);

  const getFilePreviewUrl = useCallback(async (file: WorkspaceFile): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.presignedUrl;
    } catch (error) {
      console.error('Error getting file preview URL:', error);
      return null;
    }
  }, [workspaceId]);

  return {
    files,
    isFilesLoading,
    isUploading,
    fetchFiles,
    uploadFiles,
    downloadFile,
    deleteFile,
    renameFile,
    getFilePreviewUrl,
  };
}
