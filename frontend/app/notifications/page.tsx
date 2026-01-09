'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvitations } from '../workspaces/_hooks/use-invitations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  const {
    pendingInvitations,
    acceptInvitation,
    rejectInvitation,
    isLoading,
  } = useInvitations({ userId: user?.id });

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (invitationId: string) => {
    setProcessingIds((prev) => new Set(prev).add(invitationId));
    try {
      await acceptInvitation(invitationId);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleReject = async (invitationId: string) => {
    setProcessingIds((prev) => new Set(prev).add(invitationId));
    try {
      await rejectInvitation(invitationId);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/workspaces')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">알림</h1>
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive">{pendingInvitations.length}</Badge>
            )}
          </div>
        </div>

        {/* Invitations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">워크스페이스 초대</h2>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border border-border rounded-xl">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">알림이 없습니다</h3>
              <p className="text-sm text-muted-foreground">
                새로운 워크스페이스 초대가 오면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => {
                const isProcessing = processingIds.has(invitation.id);
                return (
                  <div
                    key={invitation.id}
                    className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Workspace Thumbnail */}
                      <div className="relative w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0 overflow-hidden">
                        {invitation.workspace.thumbnail ? (
                          <Image
                            src={invitation.workspace.thumbnail}
                            alt={invitation.workspace.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {invitation.workspace.icon || '📁'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">
                          {invitation.workspace.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={invitation.inviter.profileImage} />
                            <AvatarFallback className="text-[10px]">
                              {invitation.inviter.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {invitation.inviter.name}님의 초대
                          </span>
                        </div>
                        {invitation.message && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            &quot;{invitation.message}&quot;
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(invitation.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleReject(invitation.id)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        거절
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleAccept(invitation.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            수락
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


