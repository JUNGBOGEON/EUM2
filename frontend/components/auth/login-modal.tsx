'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-[400px] pointer-events-auto"
                        >
                            <div className="relative bg-black border border-white/10 p-8 md:p-12 shadow-[0_0_100px_-20px_rgba(255,255,255,0.1)]">
                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* Content */}
                                <div className="flex flex-col items-center text-center">
                                    {/* Title */}
                                    <h2 className="text-[24px] font-bold tracking-tight text-white mb-2">
                                        환영합니다
                                    </h2>

                                    {/* Sub-text */}
                                    <p className="text-[13px] text-white/60 mb-12">
                                        EUM과 함께 새로운 대화를 시작하세요.
                                    </p>

                                    <div className="w-full">
                                        <GoogleLoginButton />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
