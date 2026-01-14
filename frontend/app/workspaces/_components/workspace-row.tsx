'use client';

import Link from 'next/link';
import { Pencil, Trash2, DoorOpen, Clock, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '../_lib/utils';
import type { Workspace, UserInfo, WorkspaceOwner } from '../_lib/types';

interface WorkspaceRowProps {
    workspace: Workspace;
    user: UserInfo | null;
    onEdit: (workspace: Workspace) => void;
    onDelete: (workspace: Workspace) => void;
    onLeave: (workspace: Workspace) => void;
}

export function WorkspaceRow({
    workspace,
    user,
    onEdit,
    onDelete,
    onLeave,
}: WorkspaceRowProps) {
    const members = workspace.members || [];
    const owner: WorkspaceOwner | null = workspace.owner ||
        (user ? { id: user.id, name: user.name, profileImage: user.profileImage } : null);
    const displayMembers = members.length > 0 ? members.slice(0, 3) : (owner ? [owner] : []);
    const remainingCount = members.length > 3 ? members.length - 3 : 0;
    const isOwner = user && workspace.owner && workspace.owner.id === user.id;

    return (
        <div className="group flex items-center justify-between py-4 px-4 border-b border-white/10 hover:bg-white/5 transition-colors">

            {/* Name & Meta */}
            <div className="flex items-center gap-6 flex-1 min-w-0">
                {/* Status Indicator (Purely Visual) */}
                <div className="h-2 w-2 rounded-full bg-white/20 group-hover:bg-white transition-colors" />

                <Link href={`/workspaces/${workspace.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-mono text-[14px] font-bold text-white group-hover:underline decoration-1 underline-offset-4 truncate">
                            {workspace.name}
                        </h3>
                        <span className="text-[10px] text-white/30 font-mono border border-white/10 px-1.5 py-0.5 rounded uppercase">
                            {isOwner ? 'OWNER' : 'MEMBER'}
                        </span>
                    </div>
                    <p className="text-[12px] text-white/40 font-mono mt-1 truncate">
                        {workspace.description || "No description provided."}
                    </p>
                </Link>
            </div>

            {/* Columns: Members & Time */}
            <div className="flex items-center gap-8 md:gap-12 mr-4">

                {/* Members */}
                <div className="hidden md:flex items-center -space-x-2">
                    {displayMembers.map((member, index) => (
                        <Avatar key={member.id || index} className="h-6 w-6 border border-black bg-black">
                            <AvatarImage src={member.profileImage} alt={member.name} />
                            <AvatarFallback className="text-[8px] bg-white/10 text-white font-mono">
                                {member.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {remainingCount > 0 && (
                        <div className="h-6 w-6 rounded-full bg-white/10 border border-black flex items-center justify-center">
                            <span className="text-[8px] text-white font-mono">+{remainingCount}</span>
                        </div>
                    )}
                </div>

                {/* Updated Time */}
                <span className="hidden sm:flex items-center gap-2 text-[11px] text-white/30 font-mono">
                    <Clock size={12} />
                    {formatRelativeTime(workspace.updatedAt || workspace.createdAt)}
                </span>
            </div>

            {/* Actions */}
            <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded outline-none focus:opacity-100">
                    <MoreHorizontal size={16} className="text-white/60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black border border-white/20 text-white min-w-[160px]">
                    <Link href={`/workspaces/${workspace.id}`}>
                        <DropdownMenuItem className="focus:bg-white focus:text-black font-mono text-[12px] cursor-pointer">
                            <DoorOpen size={14} className="mr-2" />
                            ENTER CONSOLE
                        </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {isOwner ? (
                        <>
                            <DropdownMenuItem
                                onClick={() => onEdit(workspace)}
                                className="focus:bg-white focus:text-black font-mono text-[12px] cursor-pointer"
                            >
                                <Pencil size={14} className="mr-2" />
                                EDIT DETAILS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDelete(workspace)}
                                className="focus:bg-red-500 focus:text-white text-red-500 font-mono text-[12px] cursor-pointer"
                            >
                                <Trash2 size={14} className="mr-2" />
                                DELETE SYSTEM
                            </DropdownMenuItem>
                        </>
                    ) : (
                        <DropdownMenuItem
                            onClick={() => onLeave(workspace)}
                            className="focus:bg-red-500 focus:text-white text-red-500 font-mono text-[12px] cursor-pointer"
                        >
                            <DoorOpen size={14} className="mr-2" />
                            LEAVE SYSTEM
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
