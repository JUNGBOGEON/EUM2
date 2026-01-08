'use client';

import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import {
  AppSidebar,
  WorkspaceCard,
  EditDialog,
  LeaveDialog,
  DeleteDialog,
  CreateWorkspaceModal,
} from './_components';
import { useWorkspaces } from './_hooks/use-workspaces';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} onLogout={handleLogout} />

      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-auto">
            <div className="max-w-[1200px] mx-auto p-8 pt-14">
              {/* Welcome Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    반가워요, <span className="text-primary">{user?.name}</span>님!
                  </h1>
                  <p className="text-muted-foreground mt-1">오늘도 좋은 하루 되세요</p>
                </div>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  새 워크스페이스 만들기
                </Button>
              </div>

              {/* Empty State or Workspace Grid */}
              {workspaces.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-16 text-center bg-card/50">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    아직 워크스페이스가 없습니다
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    첫 번째 워크스페이스를 만들어 팀과 협업을 시작하세요
                  </p>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    첫 워크스페이스 만들기
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workspaces.map((workspace) => (
                    <WorkspaceCard
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
