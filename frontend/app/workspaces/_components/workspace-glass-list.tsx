'use client';

import { ChevronRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Workspace } from '../_lib/types';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface WorkspaceGlassListProps {
    workspaces: Workspace[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
}

export function WorkspaceGlassList({ workspaces, selectedId, onSelect, onCreate }: WorkspaceGlassListProps) {
    const { t } = useLanguage();

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">{t('workspaces.title')}</h2>
                <button
                    onClick={onCreate}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {workspaces.map((workspace) => {
                    const isSelected = selectedId === workspace.id;

                    return (
                        <motion.div
                            key={workspace.id}
                            onClick={() => onSelect(workspace.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                group relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300 border
                ${isSelected
                                    ? 'bg-white/10 border-white/20 shadow-lg'
                                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}
              `}
                        >
                            {/* Active Indicator Line */}
                            {isSelected && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-full"
                                />
                            )}

                            {/* Icon */}
                            <div className={`
                 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white overflow-hidden
                 ${isSelected ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700'}
                 transition-colors relative
              `}>
                                {workspace.thumbnail ? (
                                    <Image src={workspace.thumbnail} alt="" fill className="object-cover" />
                                ) : (
                                    <Image
                                        src="/logo/eum_black.svg"
                                        alt="EUM"
                                        width={20}
                                        height={20}
                                        className={`object-contain ${isSelected ? '' : 'invert opacity-50'}`}
                                    />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                                    {workspace.name}
                                </h3>
                                {workspace.description && (
                                    <p className="text-xs text-neutral-600 truncate group-hover:text-neutral-500">
                                        {workspace.description}
                                    </p>
                                )}
                            </div>

                            {/* Arrow */}
                            {isSelected && (
                                <ChevronRight size={16} className="text-white animate-in slide-in-from-left-2 fade-in duration-300" />
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
