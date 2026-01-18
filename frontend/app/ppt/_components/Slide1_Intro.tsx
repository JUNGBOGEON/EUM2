'use client';

import { motion, Variants } from 'framer-motion';

export default function Slide1_Intro() {
    // Simple, robust animations
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.3 }
        }
    };

    const textVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        },
    };

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black">

            {/* Background Texture (Simplified) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />

            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[100px] pointer-events-none z-0" />

            {/* Main Content */}
            <motion.div
                className="z-10 flex flex-col items-center text-center max-w-5xl"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Top Label */}
                <motion.div variants={textVariants} className="mb-12">
                    <span className="text-xl md:text-2xl font-[300] font-['Presentation'] text-neutral-400 tracking-[0.5em] uppercase border-b border-neutral-800 pb-4">
                        Project Overview
                    </span>
                </motion.div>

                {/* Main Title */}
                <motion.h1
                    variants={textVariants}
                    className="text-[140px] md:text-[280px] font-[900] font-['Presentation'] leading-none tracking-tighter text-white mb-6 mix-blend-screen"
                >
                    이음
                </motion.h1>

                {/* Subtitle */}
                <motion.div variants={textVariants} className="flex flex-col items-center gap-6">
                    <p className="text-3xl md:text-5xl font-normal text-neutral-300 font-['IncheonEducation'] tracking-widest leading-relaxed">
                        공간을 넘어, <span className="text-white font-bold decoration-1 underline-offset-8">진정한 연결</span>을 짓다
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-4 mt-8 opacity-80">
                        <span className="px-6 py-2 border border-white/20 rounded-full text-sm font-['Presentation'] tracking-widest text-neutral-300">
                            WEB RTC
                        </span>
                        <span className="px-6 py-2 border border-white/20 rounded-full text-sm font-['Presentation'] tracking-widest text-neutral-300">
                            COLLABORATION
                        </span>
                        <span className="px-6 py-2 border border-white/20 rounded-full text-sm font-['Presentation'] tracking-widest text-neutral-300">
                            3D WORKSPACE
                        </span>
                    </div>
                </motion.div>

            </motion.div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute bottom-12 w-full px-12 flex justify-between items-end z-20"
            >
                <div>
                    <p className="text-neutral-500 font-['Presentation'] text-lg">01. INTRO</p>
                </div>
            </motion.div>

        </div>
    );
}
