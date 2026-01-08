'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Trash2, DoorOpen, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { formatRelativeTime } from '../_lib/utils';
import type { Workspace, UserInfo, WorkspaceOwner } from '../_lib/types';

interface WorkspaceCardProps {
  workspace: Workspace;
  user: UserInfo | null;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
  onLeave: (workspace: Workspace) => void;
}

export function WorkspaceCard({
  workspace,
  user,
  onEdit,
  onDelete,
  onLeave,
}: WorkspaceCardProps) {
  const members = workspace.members || [];
  const owner: WorkspaceOwner | null = workspace.owner ||
    (user ? { id: user.id, name: user.name, profileImage: user.profileImage } : null);
  const displayMembers = members.length > 0 ? members.slice(0, 4) : (owner ? [owner] : []);
  const remainingCount = members.length > 4 ? members.length - 4 : 0;
  const isOwner = user && workspace.owner && workspace.owner.id === user.id;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link href={`/workspaces/${workspace.id}`}>
          <Card
            className="group overflow-hidden bg-card border border-border rounded-xl
                       hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
                       hover:-translate-y-1 transition-[transform,border-color,box-shadow] duration-200 cursor-pointer"
          >
            {/* Workspace Thumbnail */}
            <div className="relative h-36 bg-muted overflow-hidden">
              {workspace.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={workspace.thumbnail}
                  alt={workspace.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-accent">
                  <Image
                    src="/logo/logo_white.svg"
                    alt="EUM"
                    width={64}
                    height={64}
                    className="opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                  />
                </div>
              )}
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            </div>

            {/* Card Content */}
            <CardContent className="p-4">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {workspace.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {workspace.description || `${owner?.name || '사용자'}님의 워크스페이스`}
              </p>

              {/* Meta Info: Member Avatars + Time */}
              <div className="flex items-center justify-between mt-3">
                {/* Member Avatars */}
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {displayMembers.map((member, index) => (
                      <Avatar key={member.id || index} className="h-7 w-7 border-2 border-card">
                        <AvatarImage src={member.profileImage} alt={member.name} />
                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                          {member.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {remainingCount > 0 && (
                      <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">+{remainingCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time */}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRelativeTime(workspace.updatedAt || workspace.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isOwner ? (
          <>
            <ContextMenuItem
              onClick={(e) => {
                e.preventDefault();
                onEdit(workspace);
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
                onDelete(workspace);
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
              onLeave(workspace);
            }}
          >
            <DoorOpen className="mr-2 h-4 w-4" />
            나가기
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
