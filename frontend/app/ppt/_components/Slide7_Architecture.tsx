'use client';

import { motion, Variants } from 'framer-motion';
import Image from 'next/image';

export default function Slide7_Architecture() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" }
        },
    };

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center z-20 overflow-hidden">

            <motion.div
                className="max-w-7xl w-full h-full flex flex-col items-center justify-center gap-8 text-center relative z-10 px-4 py-12"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-2 shrink-0">
                    <span className="text-sm tracking-[0.4em] text-neutral-500 font-medium uppercase">System Architecture</span>
                    <h2 className="text-4xl md:text-5xl font-['IncheonEducation'] text-white drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">
                        시스템 아키텍처
                    </h2>
                </motion.div>

                {/* Architecture Image Container - Raw Image (No Border) */}
                <motion.div
                    variants={itemVariants}
                    className="relative w-full max-w-[95vw] flex-1 min-h-[500px] flex items-center justify-center p-0"
                >
                    <div className="relative w-full h-full">
                        <Image
                            src="/ppt/arc.png"
                            alt="System Architecture"
                            fill
                            className="object-contain" // Preserves aspect ratio
                        />
                    </div>
                </motion.div>

                {/* Caption */}
                <motion.div variants={itemVariants} className="shrink-0">
                    <p className="text-xl md:text-2xl font-[300] font-['Presentation'] text-neutral-400">
                        자세한 설명은 <span className="text-white font-bold">포스터 섹션</span>에서 설명드리겠습니다.
                    </p>
                </motion.div>

            </motion.div>

        </div>
    );
}
