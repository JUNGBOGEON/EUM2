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

interface InvitableUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface PendingInvitation {
  id: string;
  invitee: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  status: string;
  createdAt: string;
}

interface MembersSectionProps {
  owner: WorkspaceOwner | null;
  members: WorkspaceMember[];
  currentUser: UserInfo | null;
  isOwner: boolean;
  pendingInvitations?: PendingInvitation[];
  onInviteMember: (userId: string) => Promise<void>;
  onKickMember: (memberId: string) => Promise<void>;
  onCancelInvitation?: (invitationId: string) => Promise<void>;
  onSearchUsers: (query: string) => Promise<InvitableUser[]>;
}

export function MembersSection({
  owner,
  members,
  currentUser,
  isOwner,
  pendingInvitations = [],
  onInviteMember,
  onKickMember,
  onCancelInvitation,
  onSearchUsers,
}: MembersSectionProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InvitableUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

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
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
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
          <h2 className="text-lg font-semibold">멤버</h2>
          <Badge variant="secondary">{totalMembers}명</Badge>
        </div>
        {isOwner && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            멤버 초대
          </Button>
        )}
      </div>

      {/* Owner Section */}
      {owner && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">관리자</p>
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
                  관리자
                </Badge>
                {currentUser?.id === owner.id && (
                  <Badge variant="outline" className="text-xs">나</Badge>
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
          멤버 {members.length > 0 && `(${members.length}명)`}
        </p>
        
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <Users className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">아직 멤버가 없습니다</p>
            {isOwner && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setShowInviteDialog(true)}
              >
                멤버 초대하기
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
                      <Badge variant="outline" className="text-xs">나</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {member.isOnline ? (
                      <span className="text-green-600">온라인</span>
                    ) : (
                      '오프라인'
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
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowKickDialog(true);
                        }}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        내보내기
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
            대기 중인 초대 ({pendingInvitations.length}건)
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
                        대기 중
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{invitation.invitee.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(invitation.createdAt)} 초대됨
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
                    <span className="ml-1">취소</span>
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
            <DialogTitle>멤버 초대</DialogTitle>
            <DialogDescription>
              이름이나 이메일로 사용자를 검색하여 초대하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="이름 또는 이메일 검색..."
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
                    ? '2글자 이상 입력하세요'
                    : '검색 결과가 없습니다'}
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
                              초대됨
                            </>
                          ) : (
                            '초대'
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
            <AlertDialogTitle>멤버 내보내기</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMember?.name}님을 워크스페이스에서 내보내시겠습니까?
              내보낸 멤버는 다시 초대받기 전까지 워크스페이스에 접근할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isKicking}>취소</AlertDialogCancel>
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
              내보내기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
