'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { WorkspaceRole } from '@/lib/types/workspace';

interface UseWorkspaceRolesProps {
    workspaceId: string;
    onRoleChange?: () => void; // Callback to refresh data after role change
}

interface UseWorkspaceRolesReturn {
    roles: WorkspaceRole[];
    isLoading: boolean;
    fetchRoles: () => Promise<void>;
    assignRole: (userId: string, roleId: string) => Promise<void>;
}

export function useWorkspaceRoles({ workspaceId, onRoleChange }: UseWorkspaceRolesProps): UseWorkspaceRolesReturn {
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/roles`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch roles');
            const data = await response.json();
            setRoles(data);
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error('역할 목록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const assignRole = useCallback(async (userId: string, roleId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/roles/members/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roleId }),
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to assign role');
            }

            toast.success('역할이 변경되었습니다.');
            // [Fix] Trigger data refresh after role change
            if (onRoleChange) {
                onRoleChange();
            }
        } catch (error) {
            console.error('Error assigning role:', error);
            toast.error(error instanceof Error ? error.message : '역할 변경에 실패했습니다.');
            throw error;
        }
    }, [workspaceId, onRoleChange]);

    return {
        roles,
        isLoading,
        fetchRoles,
        assignRole,
    };
}
