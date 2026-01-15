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
    // Simple relative date formatting logic remains, or could be replaced by a localized lib
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('members.title')}</h2>
          <Badge variant="secondary">{totalMembers}</Badge>
        </div>
        {isOwner && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('members.invite_btn')}
          </Button>
        )}
      </div>

      {/* Owner Section */}
      {owner && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{t('members.admin')}</p>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={owner.profileImage} alt={owner.name} />
                <AvatarFallback className="text-lg">
                  {owner.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                <Crown className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{owner.name}</p>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-none">
                  {t('members.admin')}
                </Badge>
                {currentUser?.id === owner.id && (
                  <Badge variant="outline" className="text-xs">{t('members.me')}</Badge>
                )}
              </div>
              {owner.email && (
                <p className="text-sm text-muted-foreground">{owner.email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members Section */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t('members.title')} {members.length > 0 && `(${members.length})`}
        </p>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <Users className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('members.no_members')}</p>
            {isOwner && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setShowInviteDialog(true)}
              >
                {t('members.invite_btn')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profileImage} alt={member.name} />
                    <AvatarFallback>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {member.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{member.name}</p>
                    {currentUser?.id === member.id && (
                      <Badge variant="outline" className="text-xs">{t('members.me')}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {member.isOnline ? (
                      <span className="text-green-600">{t('members.online')}</span>
                    ) : (
                      t('members.offline')
                    )}
                  </p>
                </div>
                {isOwner && currentUser?.id !== member.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(isOwner || canManagePermissions) && onUpdateMemberRole && (
                        <>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Shield className="mr-2 h-4 w-4" />
                              {t('roles.change_role')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {roles.map((role) => {
                                const isCurrentRole = member.roleId === role.id ||
                                  (!member.roleId && role.isDefault);
                                return (
                                  <DropdownMenuItem
                                    key={role.id}
                                    disabled={changingRoleFor === member.id}
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
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
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
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('members.pending_invites')} ({pendingInvitations.length})
          </p>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => {
              const isCancelling = cancellingInvitationId === invitation.id;
              return (
                <div
                  key={invitation.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border bg-muted/30"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={invitation.invitee.profileImage} alt={invitation.invitee.name} />
                    <AvatarFallback>
                      {invitation.invitee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{invitation.invitee.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {t('members.pending')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{invitation.invitee.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('members.invited')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('members.invite_title')}</DialogTitle>
            <DialogDescription>
              {t('members.invite_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('members.search_placeholder')}
                className="pl-9"
              />
            </div>

            {/* Search Results */}
            <ScrollArea className="h-[250px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
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
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.profileImage} alt={user.name} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isInvited ? 'secondary' : 'default'}
                          disabled={isLoading || isInvited}
                          onClick={() => handleInvite(user)}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('members.kick_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('members.kick_confirm').replace('{name}', selectedMember?.name || '')}
              {t('members.kick_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isKicking}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKick}
              disabled={isKicking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
