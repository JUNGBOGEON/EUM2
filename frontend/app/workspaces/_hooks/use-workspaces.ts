'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { Workspace, UserInfo } from '../_lib/types';

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
        const userRes = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData);

        const workspacesRes = await fetch(`${API_URL}/api/workspaces`, {
          credentials: 'include',
        });
        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          setWorkspaces(workspacesData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
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
      const workspacesRes = await fetch(`${API_URL}/api/workspaces`, {
        credentials: 'include',
      });
      if (workspacesRes.ok) {
        const workspacesData = await workspacesRes.json();
        setWorkspaces(workspacesData);
      }
    } catch (error) {
      console.error('Failed to refresh workspaces:', error);
    }
  }, []);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        credentials: 'include',
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
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
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.id === selectedWorkspace.id
              ? { ...ws, name: editName.trim(), description: editDescription.trim() || undefined }
              : ws
          )
        );
        setEditDialogOpen(false);
        toast.success('워크스페이스가 수정되었습니다');
      } else {
        toast.error('워크스페이스 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to update workspace:', error);
      toast.error('워크스페이스 수정에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWorkspace, editName, editDescription]);

  // Handle Leave
  const handleLeave = useCallback(async () => {
    if (!selectedWorkspace) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspace.id}/leave`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace.id));
        setLeaveDialogOpen(false);
        toast.success('워크스페이스에서 나갔습니다');
      } else {
        toast.error('워크스페이스 나가기에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to leave workspace:', error);
      toast.error('워크스페이스 나가기에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWorkspace]);

  // Handle Delete
  const handleDelete = useCallback(async () => {
    if (!selectedWorkspace || deleteConfirmName !== selectedWorkspace.name) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspace.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace.id));
        setDeleteDialogOpen(false);
        toast.success('워크스페이스가 삭제되었습니다');
      } else {
        toast.error('워크스페이스 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error('워크스페이스 삭제에 실패했습니다');
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
