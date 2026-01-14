'use client';

import { useState, useCallback } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import {
  AppSidebar,
  WorkspaceRow,
  EditDialog,
  LeaveDialog,
  DeleteDialog,
  CreateWorkspaceModal,
} from './_components';
import { useWorkspaces } from './_hooks/use-workspaces';
import { useInvitations } from './_hooks/use-invitations';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WorkspacesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const {
    workspaces,
    user,
    loading,
    selectedWorkspace,
    editDialogOpen,
    setEditDialogOpen,
    leaveDialogOpen,
    setLeaveDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    deleteConfirmName,
    setDeleteConfirmName,
    isSubmitting,
    handleLogout,
    openEditDialog,
    openLeaveDialog,
    openDeleteDialog,
    handleEditSubmit,
    handleLeave,
    handleDelete,
    refreshWorkspaces,
  } = useWorkspaces();

  const {
    pendingInvitations,
    acceptInvitation,
    rejectInvitation,
    isLoading: isLoadingInvitations,
  } = useInvitations({ userId: user?.id });

  // 초대 수락 후 워크스페이스 목록 갱신
  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    await acceptInvitation(invitationId);
    await refreshWorkspaces();
  }, [acceptInvitation, refreshWorkspaces]);

  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        onLogout={handleLogout}
        invitations={pendingInvitations}
        isLoadingInvitations={isLoadingInvitations}
        onAcceptInvitation={handleAcceptInvitation}
        onRejectInvitation={rejectInvitation}
      />

      <SidebarInset>
        <div className="flex flex-1 flex-col bg-black">
          <div className="flex-1 overflow-auto">
            <div className="max-w-[1200px] mx-auto p-4 md:p-12 pt-14">
              {/* Console Header */}
              <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
                <div>
                  <h1 className="text-[24px] font-mono font-bold text-white tracking-tighter">
                    OPERATOR: {user?.name?.toUpperCase() || 'UNKNOWN'}
                  </h1>
                  <p className="text-[12px] text-white/40 font-mono mt-2 uppercase tracking-widest">
                    System Access Level: Admin
                  </p>
                </div>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-white text-black hover:bg-white/80 font-mono text-xs rounded-none border border-white px-6 h-10"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  INITIATE_NEW_WORKSPACE
                </Button>
              </div>

              {/* Data Table Header */}
              {workspaces.length > 0 && (
                <div className="flex px-4 py-2 border-b border-white/20 text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">
                  <div className="flex-1">System Name / Description</div>
                  <div className="flex gap-8 md:gap-12 mr-12">
                    <div className="hidden md:block w-20">Operatives</div>
                    <div className="hidden sm:block w-24">Last Active</div>
                  </div>
                </div>
              )}

              {/* Empty State or Workspace List */}
              {workspaces.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-sm p-24 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <FolderOpen className="h-6 w-6 text-white/40" />
                  </div>
                  <h3 className="text-lg font-mono text-white mb-2">
                    NO_SYSTEMS_FOUND
                  </h3>
                  <p className="text-sm text-white/40 font-mono mb-8">
                    The archives are empty. Initialize a new worksapce system.
                  </p>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-white text-black hover:bg-white/80 font-mono text-xs rounded-none"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    CREATE_SYSTEM
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {workspaces.map((workspace) => (
                    <WorkspaceRow
                      key={workspace.id}
                      workspace={workspace}
                      user={user}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      onLeave={openLeaveDialog}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={refreshWorkspaces}
      />

      {/* Dialogs */}
      <EditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editName={editName}
        editDescription={editDescription}
        onEditNameChange={setEditName}
        onEditDescriptionChange={setEditDescription}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
      />

      <LeaveDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        workspace={selectedWorkspace}
        onLeave={handleLeave}
        isSubmitting={isSubmitting}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspace={selectedWorkspace}
        deleteConfirmName={deleteConfirmName}
        onDeleteConfirmNameChange={setDeleteConfirmName}
        onDelete={handleDelete}
        isSubmitting={isSubmitting}
      />
    </SidebarProvider>
  );
}
