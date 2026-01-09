'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import {
  WorkspaceSidebar,
  MeetingSection,
  SessionHistory,
  FilesSection,
  MembersSection,
  SettingsSection,
  WorkspaceNotifications,
} from './_components';
import { useWorkspaceDetail } from './_hooks/use-workspace-detail';
import { useInvitations } from '../_hooks/use-invitations';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const {
    // Data
    workspace,
    user,
    sessions,
    files,
    members,
    pendingInvitations,
    activeSessions,
    isOwner,

    // Navigation
    activeNav,
    setActiveNav,

    // Loading states
    isLoading,
    isSessionsLoading,
    isFilesLoading,

    // Meeting Actions
    startMeeting,
    joinSession,
    viewSession,

    // File Actions
    uploadFiles,
    downloadFile,
    deleteFile,
    renameFile,
    getFilePreviewUrl,

    // Member Actions
    inviteMember,
    kickMember,
    cancelInvitation,
    searchUsers,

    // Workspace Actions
    updateWorkspace,
    deleteWorkspace,

    // Action states
    isStartingMeeting,
    isJoiningSession,
    isUploading,

    // WebSocket
    isConnected,
  } = useWorkspaceDetail({ workspaceId });

  // User's incoming invitations (from other workspaces)
  const {
    pendingInvitations: myInvitations,
    acceptInvitation,
    rejectInvitation,
    isLoading: isLoadingInvitations,
  } = useInvitations({ userId: user?.id });

  // Handle accept with workspace list refresh (navigation will happen automatically)
  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    await acceptInvitation(invitationId);
  }, [acceptInvitation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">로딩 중...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">오류가 발생했습니다</h2>
          <p className="text-sm text-muted-foreground">워크스페이스를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <WorkspaceSidebar
          workspace={workspace}
          user={user}
          activeNav={activeNav}
          onNavChange={setActiveNav}
          members={members}
          isConnected={isConnected}
        />

        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-6">
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {activeNav === 'meeting' && '회의'}
                  {activeNav === 'files' && '파일'}
                  {activeNav === 'history' && '회의 기록'}
                  {activeNav === 'members' && '멤버'}
                  {activeNav === 'settings' && '설정'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <WorkspaceNotifications
                  invitations={myInvitations}
                  isLoading={isLoadingInvitations}
                  onAccept={handleAcceptInvitation}
                  onReject={rejectInvitation}
                />
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                {/* Meeting Section */}
                {activeNav === 'meeting' && (
                  <MeetingSection
                    activeSessions={activeSessions}
                    onStartMeeting={startMeeting}
                    onJoinSession={joinSession}
                    isStarting={isStartingMeeting}
                    isJoining={isJoiningSession}
                  />
                )}

                {/* Files Section */}
                {activeNav === 'files' && (
                  <FilesSection
                    files={files}
                    isLoading={isFilesLoading}
                    onUpload={uploadFiles}
                    onDownload={downloadFile}
                    onDelete={deleteFile}
                    onRename={renameFile}
                    onGetPreviewUrl={getFilePreviewUrl}
                    isUploading={isUploading}
                  />
                )}

                {/* History Section */}
                {activeNav === 'history' && (
                  <SessionHistory
                    sessions={Array.isArray(sessions) ? sessions : []}
                    isLoading={isSessionsLoading}
                    onViewSession={viewSession}
                  />
                )}

                {/* Members Section */}
                {activeNav === 'members' && (
                  <MembersSection
                    owner={workspace.owner || null}
                    members={members}
                    currentUser={user}
                    isOwner={isOwner}
                    pendingInvitations={pendingInvitations}
                    onInviteMember={inviteMember}
                    onKickMember={kickMember}
                    onCancelInvitation={cancelInvitation}
                    onSearchUsers={searchUsers}
                  />
                )}

                {/* Settings Section */}
                {activeNav === 'settings' && (
                  <SettingsSection
                    workspace={workspace}
                    isOwner={isOwner}
                    onUpdateWorkspace={updateWorkspace}
                    onDeleteWorkspace={deleteWorkspace}
                  />
                )}
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
