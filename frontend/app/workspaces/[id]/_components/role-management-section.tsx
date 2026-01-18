'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    Star,
    Lock,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WorkspaceRole } from '@/lib/types/workspace';
import { RoleEditDialog } from './role-edit-dialog';
import { toast } from 'sonner';

interface RoleManagementSectionProps {
    workspaceId: string;
    isOwner: boolean;
    canManagePermissions?: boolean; // [Fix] 권한 관리 권한이 있는 유저도 접근 가능
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function RoleManagementSection({
    workspaceId,
    isOwner,
    canManagePermissions = false,
}: RoleManagementSectionProps) {
    const { t } = useLanguage();
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState<WorkspaceRole | null>(null);
    const [isNewRole, setIsNewRole] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch roles from API
    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/roles`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setRoles(data);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleAddRole = () => {
        setSelectedRole(null);
        setIsNewRole(true);
        setShowEditDialog(true);
    };

    const handleEditRole = (role: WorkspaceRole) => {
        setSelectedRole(role);
        setIsNewRole(false);
        setShowEditDialog(true);
    };

    const handleDeleteRole = (role: WorkspaceRole) => {
        setSelectedRole(role);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!selectedRole) return;
        setIsDeleting(true);
        try {
            const response = await fetch(
                `${API_URL}/api/workspaces/${workspaceId}/roles/${selectedRole.id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );
            if (response.ok) {
                toast.success('역할이 삭제되었습니다');
                setShowDeleteDialog(false);
                fetchRoles();
            } else {
                toast.error('역할 삭제에 실패했습니다');
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            toast.error('역할 삭제에 실패했습니다');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveRole = async (roleData: Partial<WorkspaceRole> & { id?: string }) => {
        try {
            let response: Response;
            // Extract id from roleData for URL, rest for body
            const { id, ...bodyData } = roleData;

            if (isNewRole) {
                response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(bodyData),
                });
            } else {
                response = await fetch(
                    `${API_URL}/api/workspaces/${workspaceId}/roles/${id}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(bodyData),
                    }
                );
            }

            if (response.ok) {
                toast.success(isNewRole ? '역할이 생성되었습니다' : '역할이 수정되었습니다');
                fetchRoles();
            } else {
                toast.error('저장에 실패했습니다');
            }
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error('저장에 실패했습니다');
        }
    };

    // Count permissions enabled
    const countPermissions = (role: WorkspaceRole) => {
        return Object.values(role.permissions).filter(Boolean).length;
    };

    // [Fix] 오너 또는 권한 관리 권한이 있는 사용자만 접근 가능
    if (!isOwner && !canManagePermissions) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-neutral-400" />
                    <h3 className="font-semibold text-white">{t('roles.title')}</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-neutral-400" />
                    <h3 className="font-semibold text-white">{t('roles.title')}</h3>
                </div>
                <Button
                    size="sm"
                    onClick={handleAddRole}
                    className="bg-white/5 text-white hover:bg-white/10 border border-white/10"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('roles.add')}
                </Button>
            </div>

            {/* Roles List */}
            <div className="space-y-2">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full ring-2 ring-white/10"
                                style={{ backgroundColor: role.color || '#6b7280' }}
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">{role.name}</span>
                                    {role.isSystem && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-neutral-400 bg-white/5">
                                            <Lock className="h-2.5 w-2.5 mr-0.5" />
                                            {t('roles.system_role')}
                                        </Badge>
                                    )}
                                    {role.isDefault && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                            <Star className="h-2.5 w-2.5 mr-0.5" />
                                            {t('roles.default_role')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    {countPermissions(role)}/5 permissions
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => handleEditRole(role)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            {!role.isSystem && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={() => handleDeleteRole(role)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Dialog */}
            <RoleEditDialog
                role={selectedRole}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                onSave={handleSaveRole}
                isNew={isNewRole}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('roles.delete')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            {t('roles.delete_confirm').replace('{name}', selectedRole?.name || '')}
                            <br />
                            <span className="text-red-400 mt-2 block">
                                {t('roles.delete_warning')}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                            {t('common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            {t('roles.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
