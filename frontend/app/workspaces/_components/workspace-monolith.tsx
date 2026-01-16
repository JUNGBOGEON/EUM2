'use client';

import { motion } from 'framer-motion';
import { Users, Activity, ExternalLink } from 'lucide-react';
import type { Workspace, UserInfo } from '../_lib/types';
import { formatRelativeTime } from '../_lib/utils';
import Image from 'next/image';

interface WorkspaceMonolithProps {
    workspace: Workspace;
    user: UserInfo | null;
    onSelect: (workspace: Workspace) => void;
}

export function WorkspaceMonolith({ workspace, user, onSelect }: WorkspaceMonolithProps) {
    const membersCount = workspace.members?.length || 1;
    // Mock active sessions as it's not strictly in the type yet, or use a random/placeholder for the concept
    const activeSessions = Math.floor(Math.random() * 3);

    return (
        <motion.div
            whileHover="hover"
            initial="idle"
            onClick={() => onSelect(workspace)}
            className="group relative w-[240px] h-[360px] flex-shrink-0 cursor-pointer overflow-hidden border border-white/20 bg-black transition-colors duration-500"
        >
            {/* Background Ignition (White Fill) */}
            <motion.div
                variants={{
                    idle: { height: '0%' },
                    hover: { height: '100%' },
                }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                className="absolute bottom-0 left-0 w-full bg-white z-0"
            />

            {/* Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 mix-blend-difference text-white">

                {/* Top: Meta Info */}
                <div className="flex justify-between items-start opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono text-[10px] tracking-widest uppercase">
                        SEC-{(workspace.name.substring(0, 3)).toUpperCase()}-{workspace.id.substring(0, 4)}
                    </span>
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Center: Abstract Icon/Visual (Optional) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center">
                    {/* Can allow image if present, otherwise minimal text */}
                    {workspace.thumbnail ? (
                        // If thumbnail spans full bg, it might conflict with ignition. 
                        // For Monolith, maybe just a small symbol.
                        <div className="w-12 h-12 border border-white mx-auto rotate-45" />
                    ) : (
                        <div className="w-16 h-[1px] bg-white/50 mx-auto" />
                    )}
                </div>

                {/* Bottom: Title & Stats */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="text-[20px] font-bold leading-tight tracking-tight uppercase">
                            {workspace.name}
                        </h3>
                        <p className="text-[11px] font-mono opacity-60 mt-1 line-clamp-1">
                            {workspace.description || "NO DATA"}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 border-t border-white/50 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-2">
                            <Users size={12} />
                            <span className="text-[10px] font-mono">{membersCount} OPERATIVES</span>
                        </div>
                        {activeSessions > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="text-[10px] font-mono">{activeSessions} LIVE</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
