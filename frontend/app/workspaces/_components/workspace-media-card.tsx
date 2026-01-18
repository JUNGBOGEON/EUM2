'use client';

import { Users, MoreHorizontal, Clock } from 'lucide-react';
import type { Workspace, UserInfo } from '../_lib/types';
import { formatRelativeTime } from '../_lib/utils';
import Image from 'next/image';

interface WorkspaceMediaCardProps {
    workspace: Workspace;
    onSelect: (workspace: Workspace) => void;
    onEdit?: (workspace: Workspace) => void;
}

export function WorkspaceMediaCard({ workspace, onSelect, onEdit }: WorkspaceMediaCardProps) {
    const memberCount = workspace.members?.length || 0;
    // Generate a consistent gradient based on ID if no thumbnail
    const gradientSeed = workspace.id.charCodeAt(0) % 5;
    const gradients = [
        'from-blue-900 to-slate-900',
        'from-emerald-900 to-slate-900',
        'from-purple-900 to-slate-900',
        'from-rose-900 to-slate-900',
        'from-amber-900 to-slate-900',
    ];
    const bgGradient = gradients[gradientSeed];

    return (
        <div
            onClick={() => onSelect(workspace)}
            className="group flex flex-col bg-neutral-900 border border-white/5 rounded-xl overflow-hidden hover:border-white/20 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 cursor-pointer"
        >
            {/* 1. Media Banner / Thumbnail */}
            <div className={`relative h-32 w-full bg-gradient-to-br ${bgGradient}`}>
                {workspace.thumbnail && (
                    <Image
                        src={workspace.thumbnail}
                        alt={workspace.name}
                        fill
                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                )}

                {/* Active Indicator (Mock) */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-white font-medium">Active</span>
                </div>
            </div>

            {/* 2. Content Body */}
            <div className="flex-1 p-5 flex flex-col gap-4">

                {/* Title & Desc */}
                <div>
                    <div className="flex items-start justify-between">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                            {workspace.name}
                        </h3>
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(workspace); }}
                                className="text-neutral-500 hover:text-white p-1 rounded-md hover:bg-white/10"
                            >
                                <MoreHorizontal size={16} />
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-neutral-400 mt-1 line-clamp-2 min-h-[40px]">
                        {workspace.description || "설명이 없는 워크스페이스입니다."}
                    </p>
                </div>

                {/* 3. Footer: Members & Meta */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">

                    {/* Members Pile */}
                    <div className="flex items-center -space-x-2">
                        {workspace.members?.slice(0, 4).map((member, i) => (
                            <div key={i} className="w-7 h-7 rounded-full border-2 border-neutral-900 bg-neutral-800 overflow-hidden relative">
                                {member.profileImage ? (
                                    <Image src={member.profileImage} alt="" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] text-white">
                                        {member.name?.[0] || 'U'}
                                    </div>
                                )}
                            </div>
                        ))}
                        {memberCount > 4 && (
                            <div className="w-7 h-7 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-[9px] text-neutral-400 font-medium">
                                +{memberCount - 4}
                            </div>
                        )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <Clock size={12} />
                        <span>{formatRelativeTime(workspace.updatedAt || workspace.createdAt)}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
