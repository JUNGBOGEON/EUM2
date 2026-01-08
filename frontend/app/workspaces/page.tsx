'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bell, MessageCircle, Settings, LogOut, Plus, Pencil, Trash2, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface WorkspaceMember {
  id: string;
  name: string;
  profileImage?: string;
}

interface WorkspaceOwner {
  id: string;
  name: string;
  profileImage?: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  owner?: WorkspaceOwner;
  members?: WorkspaceMember[];
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // Form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData);

        const workspacesRes = await fetch(`${API_URL}/api/workspaces`, {
          credentials: 'include',
        });
        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          setWorkspaces(workspacesData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        credentials: 'include',
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Check if current user is the owner
  const isOwner = (workspace: Workspace) => {
    if (!user) return false;
    // If no owner info from API, safely assume NOT the owner
    if (!workspace.owner) return false;
    return workspace.owner.id === user.id;
  };

  // Open Edit Dialog
  const openEditDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setEditName(workspace.name);
    setEditDescription(workspace.description || '');
    setEditDialogOpen(true);
  };

  // Open Leave Dialog
  const openLeaveDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setLeaveDialogOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteConfirmName('');
    setDeleteDialogOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async () => {
    if (!selectedWorkspace || !editName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.id === selectedWorkspace.id
              ? { ...ws, name: editName.trim(), description: editDescription.trim() || undefined }
              : ws
          )
        );
        setEditDialogOpen(false);
        toast.success('워크스페이스가 수정되었습니다');
      } else {
        toast.error('워크스페이스 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to update workspace:', error);
      toast.error('워크스페이스 수정에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Leave
  const handleLeave = async () => {
    if (!selectedWorkspace) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspace.id}/leave`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace.id));
        setLeaveDialogOpen(false);
        toast.success('워크스페이스에서 나갔습니다');
      } else {
        toast.error('워크스페이스 나가기에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to leave workspace:', error);
      toast.error('워크스페이스 나가기에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedWorkspace || deleteConfirmName !== selectedWorkspace.name) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${selectedWorkspace.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace.id));
        setDeleteDialogOpen(false);
        toast.success('워크스페이스가 삭제되었습니다');
      } else {
        toast.error('워크스페이스 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error('워크스페이스 삭제에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo/eum_black.svg"
            alt="EUM"
            width={36}
            height={13}
            className="invert"
          />
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - 30% */}
        <aside className="w-[300px] border-r border-border flex flex-col shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Profile Section */}
              {user && (
                <div className="flex flex-col items-center mb-8">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={user.profileImage} alt={user.name} />
                    <AvatarFallback className="text-2xl font-medium bg-muted">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              )}

              {/* Welcome Message */}
              <div className="text-center mb-6">
                <p className="text-muted-foreground">
                  환영합니다, <span className="font-medium text-foreground">{user?.name}</span>님!
                </p>
              </div>

              <Separator className="my-6" />

              {/* Actions */}
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                  <Settings className="mr-3 h-4 w-4" />
                  설정
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content - 70% */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-semibold text-foreground">워크스페이스</h1>
                <Link href="/workspaces/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    새로 만들기
                  </Button>
                </Link>
              </div>

              {/* Empty State */}
              {workspaces.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-16 text-center">
                  <p className="text-muted-foreground mb-4">
                    아직 워크스페이스가 없습니다
                  </p>
                  <Link href="/workspaces/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      첫 워크스페이스 만들기
                    </Button>
                  </Link>
                </div>
              ) : (
                /* Workspace Grid - 3 columns */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workspaces.map((workspace) => {
                    const owner = workspace.owner || (user ? { id: user.id, name: user.name, profileImage: user.profileImage } : null);
                    const members = workspace.members || [];
                    const displayMembers = members.slice(0, 3);
                    const remainingCount = members.length > 3 ? members.length - 3 : 0;
                    const userIsOwner = isOwner(workspace);

                    return (
                      <ContextMenu key={workspace.id}>
                        <ContextMenuTrigger asChild>
                          <Link
                            href={`/workspaces/${workspace.id}`}
                            className="block group"
                          >
                            <div className="relative flex items-stretch rounded-xl overflow-hidden h-[120px] group-hover:ring-1 group-hover:ring-[#404040] transition-all">
                              {/* Creator Profile Image - Full Background */}
                              {owner?.profileImage && (
                                <div className="absolute right-0 top-0 bottom-0 w-[45%]">
                                  <Image
                                    src={owner.profileImage}
                                    alt={owner.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              {!owner?.profileImage && (
                                <div className="absolute right-0 top-0 bottom-0 w-[45%] bg-[#2a2a2a] flex items-center justify-center">
                                  <span className="text-3xl font-medium text-muted-foreground">
                                    {owner?.name.charAt(0).toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}

                              {/* Gradient Overlay - Seamless Transition */}
                              <div className="absolute inset-0 bg-gradient-to-r from-[#191919] via-[#191919] via-[55%] to-transparent group-hover:from-[#222222] group-hover:via-[#222222] transition-colors z-10" />

                              {/* Left Content */}
                              <div className="relative w-[65%] p-4 flex flex-col justify-center z-20">
                                {/* Workspace Name */}
                                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-white transition-colors truncate">
                                  {workspace.name}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                                  {workspace.description || `${owner?.name || '사용자'}님의 워크스페이스`}
                                </p>

                                {/* Member Avatars */}
                                <div className="flex items-center">
                                  <div className="flex -space-x-2">
                                    {displayMembers.length > 0 ? (
                                      displayMembers.map((member) => (
                                        <Avatar key={member.id} className="h-6 w-6 border-2 border-[#191919] group-hover:border-[#222222]">
                                          <AvatarImage src={member.profileImage} alt={member.name} />
                                          <AvatarFallback className="text-[10px] bg-[#373737] text-foreground">
                                            {member.name.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))
                                    ) : owner ? (
                                      <Avatar className="h-6 w-6 border-2 border-[#191919] group-hover:border-[#222222]">
                                        <AvatarImage src={owner.profileImage} alt={owner.name} />
                                        <AvatarFallback className="text-[10px] bg-[#373737] text-foreground">
                                          {owner.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : null}
                                    {remainingCount > 0 && (
                                      <div className="h-6 w-6 rounded-full bg-[#373737] border-2 border-[#191919] group-hover:border-[#222222] flex items-center justify-center">
                                        <span className="text-[10px] text-muted-foreground">+{remainingCount}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          {userIsOwner ? (
                            <>
                              <ContextMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  openEditDialog(workspace);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                수정
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openDeleteDialog(workspace);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </ContextMenuItem>
                            </>
                          ) : (
                            <ContextMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                openLeaveDialog(workspace);
                              }}
                            >
                              <DoorOpen className="mr-2 h-4 w-4" />
                              나가기
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>워크스페이스 수정</DialogTitle>
            <DialogDescription>
              워크스페이스 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">이름</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="워크스페이스 이름"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">설명 (선택)</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="워크스페이스 설명"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditSubmit} disabled={!editName.trim() || isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Alert Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>워크스페이스 나가기</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <span className="font-semibold text-foreground">{selectedWorkspace?.name}</span> 워크스페이스에서 나가시겠습니까?
              <br />
              나가면 더 이상 이 워크스페이스에 접근할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? '처리 중...' : '나가기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">워크스페이스 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 워크스페이스와 모든 데이터가 영구적으로 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="delete-confirm">
                삭제하려면 <span className="font-semibold text-foreground">{selectedWorkspace?.name}</span>을(를) 입력하세요
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="워크스페이스 이름 입력"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmName !== selectedWorkspace?.name || isSubmitting}
            >
              {isSubmitting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
