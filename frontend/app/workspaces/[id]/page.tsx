'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import {
  WorkspaceSidebar,
  MeetingSection,
  SessionHistory,
  FilesSection,
  MembersSection,
  SettingsSection,
  CalendarSection,
  ChatSection,
  WorkspaceNotifications,
} from './_components';
import { useWorkspaceDetail } from './_hooks/use-workspace-detail';
import { useInvitations } from '../_hooks/use-invitations';

import { useLanguage } from '@/contexts/LanguageContext';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { t } = useLanguage();

  const {
    // Data
    workspace,
    user,
    sessions,
    files,
    members,
    pendingInvitations,
    activeSessions,
    events,
    eventTypes,
    isOwner,

    userPermissions,
    roles, // Destructure roles

    // Navigation
    activeNav,
    setActiveNav,

    // Loading states
    isLoading,
    isSessionsLoading,
    isFilesLoading,
    isEventsLoading,
    isEventTypesLoading,

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

    // Event Actions
    createEvent,
    updateEvent,
    deleteEvent,

    // Event Type Actions
    createEventType,
    updateEventType,
    deleteEventType,

    // Workspace Actions
    // Workspace Actions
    updateWorkspace,
    deleteWorkspace,

    // Role Actions
    assignRole,

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
      <div className="min-h-screen flex w-full bg-[#050505] text-white selection:bg-white/20 selection:text-white">
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
        <SidebarInset className="flex-1 bg-transparent">
          <div className="flex flex-col min-h-screen relative">
            {/* Ambient Background - Clean & Sophisticated */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[#050505]" />
              {/* Subtle Dot Pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
              {/* Very subtle top gradient for depth */}
              <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/[0.02] to-transparent" />
            </div>

            {/* Header - Vercel Style: Clean, Minimal, Sharp */}
            <header className="h-14 px-8 flex items-center justify-between sticky top-0 z-20 bg-black border-b border-neutral-800">
              <div className="flex items-center gap-6">
                {/* Breadcrumb-style navigation */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">{workspace.name}</span>
                  <span className="text-neutral-700">/</span>
                  <span className="text-white font-medium">
                    {activeNav === 'meeting' && '회의'}
                    {activeNav === 'chat' && '채팅'}
                    {activeNav === 'calendar' && '캘린더'}
                    {activeNav === 'files' && '파일'}
                    {activeNav === 'history' && '기록'}
                    {activeNav === 'members' && '멤버'}
                    {activeNav === 'settings' && '설정'}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <WorkspaceNotifications
                  invitations={myInvitations}
                  isLoading={isLoadingInvitations}
                  onAccept={handleAcceptInvitation}
                  onReject={rejectInvitation}
                />
              </div>
            </header>

            {/* Main Content Scroll Area */}
            <main className={cn(
              "flex-1 flex flex-col relative z-0",
              activeNav === 'chat' ? "overflow-hidden p-0" : "overflow-auto p-8"
            )}>
              <div className={cn(
                "mx-auto transition-all duration-500 ease-out",
                // Animation entry
                "animate-in fade-in slide-in-from-bottom-4 duration-500",
                activeNav === 'chat' ? "h-full w-full" :
                  ['calendar', 'history', 'files', 'meeting'].includes(activeNav) ? "w-full max-w-[85%] 2xl:max-w-[75%]" : "w-full max-w-5xl"
              )}>
                {/* Meeting Section */}
                {activeNav === 'meeting' && (
                  <MeetingSection
                    activeSessions={activeSessions}
                    onStartMeeting={startMeeting}
                    onJoinSession={joinSession}
                    isStarting={isStartingMeeting}
                    isJoining={isJoiningSession}
                    canJoinCalls={userPermissions?.joinCalls !== false}
                  />
                )}

                {/* Chat Section */}
                {activeNav === 'chat' && (
                  <ChatSection
                    workspaceId={workspaceId}
                    currentUser={user}
                    canSendMessages={userPermissions?.sendMessages !== false}
                  />
                )}

                {/* Calendar Section */}
                {activeNav === 'calendar' && (
                  <CalendarSection
                    events={events}
                    eventTypes={eventTypes}
                    isLoading={isEventsLoading}
                    isEventTypesLoading={isEventTypesLoading}
                    onCreateEvent={createEvent}
                    onUpdateEvent={updateEvent}
                    onDeleteEvent={deleteEvent}
                    onCreateEventType={createEventType}
                    onUpdateEventType={updateEventType}
                    onDeleteEventType={deleteEventType}
                    canEditCalendar={isOwner || userPermissions?.editCalendar !== false}
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
                    canManagePermissions={isOwner || (!!userPermissions?.managePermissions)}
                    pendingInvitations={pendingInvitations}
                    onInviteMember={inviteMember}
                    onKickMember={kickMember}
                    onCancelInvitation={cancelInvitation}
                    onSearchUsers={searchUsers}
                    roles={roles} // Pass roles
                    onUpdateMemberRole={assignRole} // Use real function
                  />
                )}

                {/* Settings Section */}
                {activeNav === 'settings' && (
                  <SettingsSection
                    workspace={workspace}
                    isOwner={isOwner}
                    permissions={userPermissions ?? undefined} // Pass permissions (handle structure mismatch if any, types seem compatible)
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
