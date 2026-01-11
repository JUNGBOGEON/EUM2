'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { WorkspaceMember } from '../_lib/types';
import type { InvitableUser, PendingInvitation } from '@/lib/types';

interface UseWorkspaceMembersProps {
  workspaceId: string;
  onWorkspaceUpdate?: () => Promise<void>;
}

interface UseWorkspaceMembersReturn {
  members: WorkspaceMember[];
  pendingInvitations: PendingInvitation[];
  setMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
  fetchPendingInvitations: () => Promise<void>;
  inviteMember: (userId: string) => Promise<void>;
  kickMember: (memberId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<InvitableUser[]>;
}

export function useWorkspaceMembers({
  workspaceId,
  onWorkspaceUpdate
}: UseWorkspaceMembersProps): UseWorkspaceMembersReturn {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const fetchPendingInvitations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setPendingInvitations([]);
        return;
      }

      const data = await response.json();
      setPendingInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      setPendingInvitations([]);
    }
  }, [workspaceId]);

  const inviteMember = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to invite member');
      }

      toast.success('멤버를 초대했습니다.');
      await fetchPendingInvitations();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error(error instanceof Error ? error.message : '멤버 초대에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchPendingInvitations]);

  const kickMember = useCallback(async (memberId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to kick member');
      }

      toast.success('멤버를 내보냈습니다.');
      if (onWorkspaceUpdate) {
        await onWorkspaceUpdate();
      }
    } catch (error) {
      console.error('Error kicking member:', error);
      toast.error(error instanceof Error ? error.message : '멤버 내보내기에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, onWorkspaceUpdate]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel invitation');
      }

      toast.success('초대를 취소했습니다.');
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error(error instanceof Error ? error.message : '초대 취소에 실패했습니다.');
      throw error;
    }
  }, [workspaceId]);

  const searchUsers = useCallback(async (query: string): Promise<InvitableUser[]> => {
    try {
      const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, []);

  return {
    members,
    pendingInvitations,
    setMembers,
    fetchPendingInvitations,
    inviteMember,
    kickMember,
    cancelInvitation,
    searchUsers,
  };
}
