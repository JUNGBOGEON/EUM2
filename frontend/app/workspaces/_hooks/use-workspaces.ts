'use client';

/**
 * 워크스페이스 목록 관리 훅
 * 
 * 새 API 클라이언트와 에러 핸들링 유틸리티를 사용합니다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, workspacesApi } from '@/lib/api';
import { handleError, ApiError } from '@/lib/utils/error';
import type { Workspace, UserInfo } from '@/lib/types';

export function useWorkspaces() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // Form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await authApi.me();
        setUser(userData);

        const workspacesData = await workspacesApi.list();
        setWorkspaces(workspacesData);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          router.push('/login');
          return;
        }
        handleError(error, { showToast: false, context: 'fetchWorkspaces' });
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Refresh workspaces
  const refreshWorkspaces = useCallback(async () => {
    try {
      const workspacesData = await workspacesApi.list();
      setWorkspaces(workspacesData);
    } catch (error) {
      handleError(error, { showToast: false, context: 'refreshWorkspaces' });
    }
  }, []);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
      router.push('/');
    } catch (error) {
      handleError(error, { showToast: false, context: 'logout' });
      // 에러가 나도 로그인 페이지로 이동
      router.push('/');
    }
  }, [router]);

  // Open Edit Dialog
  const openEditDialog = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setEditName(workspace.name);
    setEditDescription(workspace.description || '');
    setEditDialogOpen(true);
  }, []);

  // Open Leave Dialog
  const openLeaveDialog = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setLeaveDialogOpen(true);
  }, []);

  // Open Delete Dialog
  const openDeleteDialog = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteConfirmName('');
    setDeleteDialogOpen(true);
  }, []);

  // Handle Edit Submit
  const handleEditSubmit = useCallback(async () => {
    if (!selectedWorkspace || !editName.trim()) return;

    setIsSubmitting(true);
    try {
      await workspacesApi.update(selectedWorkspace.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });

      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === selectedWorkspace.id
            ? { ...ws, name: editName.trim(), description: editDescription.trim() || undefined }
            : ws
        )
      );
      setEditDialogOpen(false);
      toast.success('워크스페이스가 수정되었습니다');
    } catch (error) {
      handleError(error, { showToast: true, context: 'updateWorkspace' });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWorkspace, editName, editDescription]);

  // Handle Leave
  const handleLeave = useCallback(async () => {
    if (!selectedWorkspace) return;

    setIsSubmitting(true);
    try {
      await workspacesApi.leave(selectedWorkspace.id);
      setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace.id));
      setLeaveDialogOpen(false);
      toast.success('워크스페이스에서 나갔습니다');
    } catch (error) {
      handleError(error, { showToast: true, context: 'leaveWorkspace' });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWorkspace]);

  // Handle Delete
  const handleDelete = useCallback(async () => {
    if (!selectedWorkspace || deleteConfirmName !== selectedWorkspace.name) return;

    setIsSubmitting(true);
    try {
      await workspacesApi.delete(selectedWorkspace.id);
      setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace.id));
      setDeleteDialogOpen(false);
      toast.success('워크스페이스가 삭제되었습니다');
    } catch (error) {
      handleError(error, { showToast: true, context: 'deleteWorkspace' });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWorkspace, deleteConfirmName]);

  return {
    // Data
    workspaces,
    user,
    loading,
    selectedWorkspace,

    // Dialog states
    editDialogOpen,
    setEditDialogOpen,
    leaveDialogOpen,
    setLeaveDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,

    // Form states
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    deleteConfirmName,
    setDeleteConfirmName,
    isSubmitting,

    // Actions
    handleLogout,
    openEditDialog,
    openLeaveDialog,
    openDeleteDialog,
    handleEditSubmit,
    handleLeave,
    handleDelete,
    refreshWorkspaces,
  };
}

export default useWorkspaces;
