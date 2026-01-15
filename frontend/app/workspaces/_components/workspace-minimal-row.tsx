'use client';

import { Users, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { Workspace } from '../_lib/types';
import Image from 'next/image';

interface WorkspaceMinimalRowProps {
    workspace: Workspace;
    onSelect: (workspace: Workspace) => void;
    onEdit?: (workspace: Workspace) => void;
}

export function WorkspaceMinimalRow({ workspace, onSelect, onEdit }: WorkspaceMinimalRowProps) {
    const memberCount = workspace.members?.length || 0;

    // Consistent gradient or solid color icon based on ID
    const startChar = workspace.name.charAt(0).toUpperCase();
    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600'];
    const bgClass = colors[workspace.id.charCodeAt(0) % colors.length];

    return (
        <div
            onClick={() => onSelect(workspace)}
            className="group flex items-center gap-4 py-4 px-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
        >
            {/* 1. Icon/Thumbnail */}
            <div className={`relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${bgClass} text-white font-bold text-lg`}>
                {workspace.thumbnail ? (
                    <Image src={workspace.thumbnail} alt="" fill className="object-cover" />
                ) : (
                    <span>{startChar}</span>
                )}
            </div>

            {/* 2. Text Info */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                        {workspace.name}
                    </h3>
                    {/* Badge (Mock) */}
                    {/* <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/60">TEAM</span> */}
                </div>
                <p className="text-[13px] text-neutral-500 truncate max-w-[400px]">
                    {workspace.description || "설명이 없습니다."}
                </p>
            </div>

            {/* 3. Metadata & Actions */}
            <div className="flex items-center gap-6 flex-shrink-0">

                {/* Members */}
                <div className="hidden sm:flex items-center text-neutral-500 text-[13px] gap-1.5">
                    <Users size={14} />
                    <span>{memberCount}</span>
                </div>

                {/* Edit Trigger */}
                {onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(workspace); }}
                        className="p-1.5 text-neutral-600 hover:text-white rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                )}

                {/* Arrow */}
                <ChevronRight size={18} className="text-neutral-600 group-hover:text-white transition-colors" />
            </div>
        </div>
    );
}
