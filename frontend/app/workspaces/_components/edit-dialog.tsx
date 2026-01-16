'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface EditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editName: string;
    editDescription: string;
    onEditNameChange: (value: string) => void;
    onEditDescriptionChange: (value: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function EditDialog({
    open,
    onOpenChange,
    editName,
    editDescription,
    onEditNameChange,
    onEditDescriptionChange,
    onSubmit,
    isSubmitting,
}: EditDialogProps) {

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onOpenChange(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">워크스페이스 수정</h3>
                            <button onClick={() => onOpenChange(false)} className="text-neutral-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Name</label>
                                <input
                                    value={editName}
                                    onChange={(e) => onEditNameChange(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="워크스페이스 이름"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => onEditDescriptionChange(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-colors min-h-[100px] resize-none"
                                    placeholder="설명을 입력하세요 (선택)"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={isSubmitting || !editName.trim()}
                                className="px-6 py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? '저장 중...' : '저장하기'}
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Keep the others standard for now, but export them again
export { LeaveDialog, DeleteDialog } from './workspace-dialogs-standard'; 
