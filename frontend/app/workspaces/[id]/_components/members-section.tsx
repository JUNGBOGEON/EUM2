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
  ShieldCheck,
  X,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

import { useLanguage } from '@/contexts/LanguageContext';

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
      // Filter out existing members and pending invitations
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {t('members.title')}
              <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none ml-2">
                {totalMembers}
              </Badge>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Manage access and roles for your team</p>
          </div>
        </div>

        {isOwner && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-white text-black hover:bg-neutral-200 border-none font-semibold shadow-lg shadow-white/10"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t('members.invite_btn')}
          </Button>
        )}
      </div>

      {/* Owner Section */}
      {owner && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest px-1">{t('members.admin')}</p>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 backdrop-blur-sm">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-yellow-500/30">
                <AvatarImage src={owner.profileImage} alt={owner.name} />
                <AvatarFallback className="bg-neutral-800 text-white font-bold">
                  {owner.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
                <Crown className="h-3 w-3 text-black fill-black" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-lg">{owner.name}</p>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                  {t('members.admin')}
                </Badge>
                {currentUser?.id === owner.id && (
                  <Badge variant="outline" className="text-xs border-white/20 text-neutral-300">{t('members.me')}</Badge>
                )}
              </div>
              {owner.email && (
                <p className="text-sm text-neutral-400">{owner.email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members Section */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest px-1">
          {t('members.title')}
        </p>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-neutral-500" />
            </div>
            <p className="text-neutral-400 font-medium">{t('members.no_members')}</p>
            {isOwner && (
              <Button
                variant="link"
                className="mt-2 text-indigo-400 hover:text-indigo-300"
                onClick={() => setShowInviteDialog(true)}
              >
                {t('members.invite_btn')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-neutral-900/40 hover:bg-white/5 transition-all duration-300 group"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-1 ring-white/10 transition-all group-hover:ring-white/30">
                    <AvatarImage src={member.profileImage} alt={member.name} />
                    <AvatarFallback className="bg-neutral-800 text-neutral-300">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {member.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-neutral-900 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-neutral-200 group-hover:text-white truncate">{member.name}</p>
                    {currentUser?.id === member.id && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-white/10 text-neutral-400">{t('members.me')}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-neutral-500">
                      {member.isOnline ? (
                        <span className="text-green-400 font-medium">{t('members.online')}</span>
                      ) : (
                        t('members.offline')
                      )}
                    </p>
                    {member.roleId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/5">
                        {roles.find(r => r.id === member.roleId)?.name || 'Member'}
                      </span>
                    )}
                  </div>
                </div>
                {(isOwner || canManagePermissions) && currentUser?.id !== member.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10 text-white p-1">
                      {(isOwner || canManagePermissions) && onUpdateMemberRole && (
                        <>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="focus:bg-white/10 focus:text-white rounded-md">
                              <Shield className="mr-2 h-4 w-4" />
                              {t('roles.change_role')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-neutral-900 border-white/10 text-white p-1">
                              {roles.map((role) => {
                                const isCurrentRole = member.roleId === role.id ||
                                  (!member.roleId && role.isDefault);
                                return (
                                  <DropdownMenuItem
                                    key={role.id}
                                    disabled={changingRoleFor === member.id}
                                    className="focus:bg-white/10 focus:text-white rounded-md"
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
                                    {isCurrentRole && (
                                      <Check className="ml-auto h-4 w-4" />
                                    )}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator className="bg-white/10" />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10 rounded-md"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowKickDialog(true);
                        }}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        {t('common.leave')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {isOwner && pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2">
            {t('members.pending_invites')} <span className="text-white">({pendingInvitations.length})</span>
          </p>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => {
              const isCancelling = cancellingInvitationId === invitation.id;
              return (
                <div
                  key={invitation.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Avatar className="h-10 w-10 ring-1 ring-white/10">
                    <AvatarImage src={invitation.invitee.profileImage} alt={invitation.invitee.name} />
                    <AvatarFallback className="bg-neutral-800 text-neutral-400">
                      {invitation.invitee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{invitation.invitee.name}</p>
                      <Badge variant="secondary" className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {t('members.pending')}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-400 truncate">{invitation.invitee.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    <span className="ml-1">{t('common.cancel')}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{t('members.invite_title')}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {t('members.invite_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-focus-within:text-white" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('members.search_placeholder')}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white/20"
              />
            </div>

            {/* Search Results */}
            <ScrollArea className="h-[250px] pr-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  {searchQuery.length < 2
                    ? t('members.search_short')
                    : t('members.search_empty')}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => {
                    const isInvited = invitedUsers.has(user.id);
                    const isLoading = isInviting === user.id;

                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors"
                      >
                        <Avatar className="h-10 w-10 ring-1 ring-white/10">
                          <AvatarImage src={user.profileImage} alt={user.name} />
                          <AvatarFallback className="bg-neutral-800 text-neutral-300">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-neutral-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isInvited ? 'secondary' : 'default'}
                          disabled={isLoading || isInvited}
                          onClick={() => handleInvite(user)}
                          className={isInvited ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black hover:bg-neutral-200"}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isInvited ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t('members.invited')}
                            </>
                          ) : (
                            t('members.invite')
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

      {/* Kick Confirmation Dialog */}
      <AlertDialog open={showKickDialog} onOpenChange={setShowKickDialog}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('members.kick_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('members.kick_confirm').replace('{name}', selectedMember?.name || '')}
              {t('members.kick_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isKicking} className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKick}
              disabled={isKicking}
              className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
            >
              {isKicking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              {t('members.kick_title')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
