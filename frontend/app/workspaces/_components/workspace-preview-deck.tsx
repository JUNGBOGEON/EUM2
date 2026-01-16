'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Users, Clock, Settings, MoreHorizontal, Shield } from 'lucide-react';
import type { Workspace, UserInfo } from '../_lib/types';
import { formatRelativeTime } from '../_lib/utils';
import Image from 'next/image';

interface WorkspacePreviewDeckProps {
    workspace: Workspace | null;
    onEnter: (id: string) => void;
    onEdit: (workspace: Workspace) => void;
}

export function WorkspacePreviewDeck({ workspace, onEnter, onEdit }: WorkspacePreviewDeckProps) {

    if (!workspace) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 p-12">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/5 mb-6 flex items-center justify-center opacity-50">
                    <Image src="/logo/eum_black.svg" alt="EUM" width={40} height={40} className="invert opacity-20" />
                </div>
                <p className="font-mono text-sm tracking-widest uppercase">워크스페이스를 선택하세요</p>
            </div>
        );
    }

    const memberCount = workspace.members?.length || 0;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={workspace.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                className="relative w-full h-full flex flex-col overflow-hidden"
            >
                {/* 1. Ambient Background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {/* If thumbnail exists, use it as a massive blurred backdrop. Else use EUM logo pattern? Or just a refined gradient with noise */}
                    {workspace.thumbnail ? (
                        <Image src={workspace.thumbnail} alt="" fill className="object-cover blur-3xl opacity-20 scale-110" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Image
                                src="/logo/eum_black.svg"
                                alt=""
                                width={800}
                                height={800}
                                className="invert opacity-[0.03] blur-3xl scale-150"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-black opacity-90" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/20" /> {/* Dimmer */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>

                {/* 2. Actions Header */}
                <div className="relative z-10 h-20 px-8 flex items-center justify-end gap-2">
                    <button
                        onClick={() => onEdit(workspace)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="설정"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                {/* 3. Main Content (Center-Bottom Aligned) */}
                <div className="relative z-10 flex-1 flex flex-col justify-end p-12 md:p-16 pb-20">

                    {/* Meta Badge */}
                    <div className="flex items-center gap-3 mb-8">
                        {workspace.owner && (
                            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 text-[11px] font-mono tracking-wider text-white uppercase backdrop-blur-md">
                                {workspace.owner.name} 소유
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
                            <Clock size={12} />
                            마지막 업데이트 {formatRelativeTime(workspace.updatedAt || workspace.createdAt)}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
                        {workspace.name}
                    </h1>

                    {/* Description */}
                    <p className="text-lg text-white/60 max-w-2xl mb-12 font-light leading-relaxed">
                        {workspace.description || "설명이 없습니다."}
                    </p>

                    {/* The Detail Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-2xl">

                        {/* Team Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-white/40 font-bold tracking-widest uppercase">
                                <Users size={14} />
                                <span>팀 멤버</span>
                            </div>
                            <div className="flex items-center -space-x-3">
                                {workspace.members?.slice(0, 5).map((member, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-neutral-800 overflow-hidden relative" title={member.name}>
                                        {member.profileImage ? (
                                            <Image src={member.profileImage} alt={member.name || ''} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-white">{member.name?.[0]}</div>
                                        )}
                                    </div>
                                ))}
                                {memberCount > 5 && (
                                    <div className="w-10 h-10 rounded-full border-2 border-black bg-neutral-800 flex items-center justify-center text-xs text-white font-medium">
                                        +{memberCount - 5}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Primary Action - Modern Rectangular Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onEnter(workspace.id)}
                            className="
                            group relative px-6 py-4 bg-white text-black font-bold text-[16px] tracking-wide 
                            rounded-xl overflow-hidden hover:bg-neutral-200 transition-all duration-300
                            shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                        "
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                워크스페이스 입장 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>

                </div>

            </motion.div>
        </AnimatePresence>
    );
}
