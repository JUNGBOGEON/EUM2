'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { Workspace, UserInfo } from '../_lib/types';

interface UseWorkspaceDataProps {
  workspaceId: string;
}

interface UseWorkspaceDataReturn {
  workspace: Workspace | null;
  user: UserInfo | null;
  isOwner: boolean;
  isLoading: boolean;
  fetchWorkspace: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateWorkspace: (data: {
    name?: string;
    description?: string;
    thumbnail?: string;
    banner?: string;
  }) => Promise<void>;
  deleteWorkspace: () => Promise<void>;
}

export function useWorkspaceData({ workspaceId }: UseWorkspaceDataProps): UseWorkspaceDataReturn {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = !!(user && workspace?.owner && user.id === workspace.owner.id);

  const fetchWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workspace');
      const data = await response.json();
      setWorkspace(data);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast.error('워크스페이스를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [router]);

  const updateWorkspace = useCallback(async (data: {
    name?: string;
    description?: string;
    thumbnail?: string;
    banner?: string;
  }) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update workspace');
      }

      await fetchWorkspace();
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }, [workspaceId, fetchWorkspace]);

  const deleteWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete workspace');
      }

      toast.success('워크스페이스가 삭제되었습니다.');
      router.push('/workspaces');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }, [workspaceId, router]);

  return {
    workspace,
    user,
    isOwner,
    isLoading,
    fetchWorkspace,
    fetchUser,
    updateWorkspace,
    deleteWorkspace,
  };
}
