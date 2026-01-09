'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Bell,
  Check,
  X,
  Users,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export interface WorkspaceInvitation {
  id: string;
  workspace: {
    id: string;
    name: string;
    icon?: string;
    thumbnail?: string;
  };
  inviter: {
    id: string;
    name: string;
    profileImage?: string;
  };
  message?: string;
  createdAt: string;
}

interface WorkspaceNotificationsProps {
  invitations: WorkspaceInvitation[];
  isLoading: boolean;
  onAccept: (invitationId: string) => Promise<void>;
  onReject: (invitationId: string) => Promise<void>;
}

export function WorkspaceNotifications({
  invitations,
  isLoading,
  onAccept,
  onReject,
}: WorkspaceNotificationsProps) {
  const [open, setOpen] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (invitationId: string) => {
    setProcessingIds((prev) => new Set(prev).add(invitationId));
    try {
      await onAccept(invitationId);
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
      await onReject(invitationId);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          {invitations.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive border-transparent text-primary-foreground"
            >
              {invitations.length > 9 ? '9+' : invitations.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">알림</h4>
          </div>
          {invitations.length > 0 && (
            <Badge variant="secondary">{invitations.length}개</Badge>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                새로운 알림이 없습니다
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invitations.map((invitation) => {
                const isProcessing = processingIds.has(invitation.id);
                return (
                  <div
                    key={invitation.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* Workspace Thumbnail */}
                      <div className="relative w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 overflow-hidden">
                        {invitation.workspace.thumbnail ? (
                          <Image
                            src={invitation.workspace.thumbnail}
                            alt={invitation.workspace.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {invitation.workspace.icon || '📁'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">
                          {invitation.workspace.name}
                        </h5>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={invitation.inviter.profileImage} />
                            <AvatarFallback className="text-[8px]">
                              {invitation.inviter.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {invitation.inviter.name}님의 초대
                          </span>
                        </div>
                        {invitation.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            &quot;{invitation.message}&quot;
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(invitation.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleReject(invitation.id)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        거절
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAccept(invitation.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
