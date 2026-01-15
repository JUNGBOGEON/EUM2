'use client';

import { useState, useCallback, useEffect } from 'react';
import { Calendar, Inbox, Settings } from 'lucide-react';
import {
  AppNavigation,
  WorkspaceGlassList,
  WorkspacePreviewDeck,
  EditDialog,
  LeaveDialog,
  DeleteDialog,
  CreateWorkspaceModal,
  type TabType,
} from './_components';
import { useWorkspaces } from './_hooks/use-workspaces';
import { useInvitations } from './_hooks/use-invitations';

// Placeholder View Component
const PlaceholderView = ({ title, icon: Icon, desc }: { title: string, icon: any, desc: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/50 animate-in fade-in zoom-in-95 duration-300">
    <div className="w-20 h-20 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center mb-6">
      <Icon className="text-white/20" size={32} />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
    <p className="text-neutral-500 max-w-sm text-center">{desc}</p>
  </div>
);

export default function WorkspacesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workspaces');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // View State for Master-Detail
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

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

  // Auto-select first workspace on load if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !selectedPreviewId) {
      setSelectedPreviewId(workspaces[0].id);
    }
  }, [workspaces, selectedPreviewId]);

  // 초대 수락 후 워크스페이스 목록 갱신
  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    await acceptInvitation(invitationId);
    await refreshWorkspaces();
  }, [acceptInvitation, refreshWorkspaces]);

  // Find the full workspace object for the preview deck
  const currentPreviewWorkspace = workspaces.find(w => w.id === selectedPreviewId) || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden selection:bg-white/20">

      {/* 1. SPA Sidebar */}
      <AppNavigation
        user={user}
        onLogout={handleLogout}
        invitations={pendingInvitations}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 2. Master-Detail Split View (Workspaces Tab) */}
      {activeTab === 'workspaces' && (
        <div className="flex-1 flex animate-in fade-in duration-500">

          {/* Left Panel: The List (Glass List) */}
          <aside className="w-[320px] xl:w-[380px] border-r border-white/5 bg-neutral-900/30 flex-shrink-0">
            <WorkspaceGlassList
              workspaces={workspaces}
              selectedId={selectedPreviewId}
              onSelect={setSelectedPreviewId}
              onCreate={() => setCreateModalOpen(true)}
            />
          </aside>

          {/* Right Panel: The Deck (Preview) */}
          <main className="flex-1 relative bg-neutral-900/10 min-w-0">
            <WorkspacePreviewDeck
              workspace={currentPreviewWorkspace}
              onEnter={(id) => window.location.href = `/workspaces/${id}`}
              onEdit={openEditDialog}
            />
          </main>

        </div>
      )}

      {/* Other Tabs (Placeholders) */}
      {activeTab === 'calendar' && (
        <PlaceholderView title="캘린더" icon={Calendar} desc="Calendar View" />
      )}
      {activeTab === 'notifications' && (
        <PlaceholderView title="회의록 보관함" icon={Inbox} desc="Archives View" />
      )}
      {activeTab === 'settings' && (
        <PlaceholderView title="설정" icon={Settings} desc="Settings View" />
      )}

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={refreshWorkspaces}
      />
      <EditDialog
        open={editDialogOpen} onOpenChange={setEditDialogOpen}
        editName={editName} onEditNameChange={setEditName}
        editDescription={editDescription} onEditDescriptionChange={setEditDescription}
        onSubmit={handleEditSubmit} isSubmitting={isSubmitting}
      />
      <LeaveDialog
        open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}
        workspace={selectedWorkspace} onLeave={handleLeave} isSubmitting={isSubmitting}
      />
      <DeleteDialog
        open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
        workspace={selectedWorkspace} deleteConfirmName={deleteConfirmName}
        onDeleteConfirmNameChange={setDeleteConfirmName} onDelete={handleDelete} isSubmitting={isSubmitting}
      />
    </div>
  );
}
