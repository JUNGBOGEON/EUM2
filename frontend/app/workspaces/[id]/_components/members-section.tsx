'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Crown,
  MoreHorizontal,
  Search,
  Mail,
  Shield,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
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
import type { WorkspaceOwner, WorkspaceMember, UserInfo } from '../_lib/types';
import type { InvitableUser, PendingInvitation } from '@/lib/types';
import type { WorkspaceRole } from '@/lib/types/workspace';
import { DEFAULT_ROLES } from '@/lib/types/workspace';
import { useLanguage } from '@/contexts/LanguageContext';

interface MembersSectionProps {
  owner: WorkspaceOwner | null;
  members: WorkspaceMember[];
  currentUser: UserInfo | null;
  isOwner: boolean;
  canManagePermissions?: boolean;
  roles?: WorkspaceRole[];
  pendingInvitations?: PendingInvitation[];
  onInviteMember: (userId: string) => Promise<void>;
  onKickMember: (memberId: string) => Promise<void>;
  onCancelInvitation?: (invitationId: string) => Promise<void>;
  onSearchUsers: (query: string) => Promise<InvitableUser[]>;
  onUpdateMemberRole?: (memberId: string, roleId: string) => Promise<void>;
}

export function MembersSection({
  owner,
  members,
  currentUser,
  isOwner,
  canManagePermissions = false,
  roles = DEFAULT_ROLES,
  pendingInvitations = [],
  onInviteMember,
  onKickMember,
  onCancelInvitation,
  onSearchUsers,
  onUpdateMemberRole,
}: MembersSectionProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InvitableUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await onSearchUsers(query);
      const existingIds = new Set([owner?.id, ...members.map(m => m.id)]);
      const pendingIds = new Set(pendingInvitations.map(inv => inv.invitee.id));
      setSearchResults(results.filter(u => !existingIds.has(u.id) && !pendingIds.has(u.id)));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!onCancelInvitation) return;
    setCancellingInvitationId(invitationId);
    try {
      await onCancelInvitation(invitationId);
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const handleInvite = async (user: InvitableUser) => {
    setIsInviting(user.id);
    try {
      await onInviteMember(user.id);
      setInvitedUsers(prev => new Set([...prev, user.id]));
    } catch (error) {
      console.error('Error inviting user:', error);
    } finally {
      setIsInviting(null);
    }
  };

  const handleKick = async () => {
    if (!selectedMember) return;
    setIsKicking(true);
    try {
      await onKickMember(selectedMember.id);
      setShowKickDialog(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error kicking member:', error);
    } finally {
      setIsKicking(false);
    }
  };

  const totalMembers = (owner ? 1 : 0) + members.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700">
            <Users className="h-5 w-5 text-neutral-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('members.title')}</h2>
            <p className="text-sm text-neutral-500">{totalMembers} members</p>
          </div>
        </div>

        {isOwner && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            size="sm"
            className="bg-white text-neutral-900 hover:bg-neutral-200 font-medium"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t('members.invite_btn')}
          </Button>
        )}
      </div>

      {/* Owner */}
      {owner && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Owner</p>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
            <div className="relative">
              <Avatar className="h-11 w-11">
                <AvatarImage src={owner.profileImage} alt={owner.name} />
                <AvatarFallback className="bg-amber-600 text-white font-semibold">
                  {owner.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-neutral-900">
                <Crown className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white truncate">{owner.name}</p>
                {currentUser?.id === owner.id && (
                  <span className="text-xs text-neutral-500">(you)</span>
                )}
              </div>
              <p className="text-sm text-neutral-400 truncate">{owner.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Members</p>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-neutral-700 bg-neutral-800/20">
            <Users className="h-8 w-8 text-neutral-600 mb-3" />
            <p className="text-neutral-400 text-sm">{t('members.no_members')}</p>
            {isOwner && (
              <Button
                variant="link"
                size="sm"
                className="mt-2 text-neutral-400 hover:text-white"
                onClick={() => setShowInviteDialog(true)}
              >
                Invite your first member
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors group"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profileImage} alt={member.name} />
                    <AvatarFallback className="bg-neutral-700 text-neutral-300 font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {member.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-neutral-200 truncate">{member.name}</p>
                    {currentUser?.id === member.id && (
                      <span className="text-xs text-neutral-500">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${member.isOnline ? 'text-emerald-500' : 'text-neutral-500'}`}>
                      {member.isOnline ? 'Online' : 'Offline'}
                    </span>
                    {member.roleId && (
                      <>
                        <span className="text-neutral-600">·</span>
                        <span className="text-xs text-neutral-500">
                          {roles.find(r => r.id === member.roleId)?.name || 'Member'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {(isOwner || canManagePermissions) && currentUser?.id !== member.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-neutral-200">
                      {(isOwner || canManagePermissions) && onUpdateMemberRole && (
                        <>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="focus:bg-neutral-800">
                              <Shield className="mr-2 h-4 w-4" />
                              {t('roles.change_role')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-neutral-900 border-neutral-800 text-neutral-200">
                              {roles.map((role) => {
                                const isCurrentRole = member.roleId === role.id || (!member.roleId && role.isDefault);
                                return (
                                  <DropdownMenuItem
                                    key={role.id}
                                    disabled={changingRoleFor === member.id}
                                    className="focus:bg-neutral-800"
                                    onClick={async () => {
                                      if (isCurrentRole) return;
                                      setChangingRoleFor(member.id);
                                      try {
                                        await onUpdateMemberRole(member.id, role.id);
                                      } finally {
                                        setChangingRoleFor(null);
                                      }
                                    }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full mr-2"
                                      style={{ backgroundColor: role.color }}
                                    />
                                    {role.name}
                                    {isCurrentRole && <Check className="ml-auto h-4 w-4" />}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator className="bg-neutral-800" />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowKickDialog(true);
                        }}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {isOwner && pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Pending</p>
            <span className="text-xs text-neutral-600 bg-neutral-800 px-1.5 py-0.5 rounded">
              {pendingInvitations.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-neutral-800/30 border border-neutral-800"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={invitation.invitee.profileImage} alt={invitation.invitee.name} />
                  <AvatarFallback className="bg-neutral-700 text-neutral-400">
                    {invitation.invitee.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-neutral-300 truncate">{invitation.invitee.name}</p>
                    <span className="text-xs text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 truncate">{invitation.invitee.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-500 hover:text-red-400 hover:bg-transparent"
                  onClick={() => handleCancelInvitation(invitation.id)}
                  disabled={cancellingInvitationId === invitation.id}
                >
                  {cancellingInvitationId === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-white">{t('members.invite_title')}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {t('members.invite_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('members.search_placeholder')}
                className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>

            <ScrollArea className="h-[280px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  {searchQuery.length < 2 ? t('members.search_short') : t('members.search_empty')}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((user) => {
                    const isInvited = invitedUsers.has(user.id);
                    const isLoading = isInviting === user.id;

                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.profileImage} alt={user.name} />
                          <AvatarFallback className="bg-neutral-700 text-neutral-300 text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-200 truncate text-sm">{user.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isInvited ? 'ghost' : 'secondary'}
                          disabled={isLoading || isInvited}
                          onClick={() => handleInvite(user)}
                          className={isInvited ? 'text-emerald-500' : 'bg-neutral-700 text-white hover:bg-neutral-600'}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isInvited ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            'Invite'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kick Dialog */}
      <AlertDialog open={showKickDialog} onOpenChange={setShowKickDialog}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('members.kick_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('members.kick_confirm').replace('{name}', selectedMember?.name || '')}
              {t('members.kick_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isKicking}
              className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKick}
              disabled={isKicking}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isKicking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
