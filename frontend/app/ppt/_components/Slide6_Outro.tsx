'use client';

import { motion, Variants } from 'framer-motion';

// Pulse Connection Animation
const ConnectionPulse = () => {
    return (
        <div className="relative flex items-center justify-center gap-8 md:gap-16 my-12 opacity-80">
            {/* Left Dot (You) */}
            <div className="relative">
                <motion.div
                    className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full z-10 relative"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
            </div>

            {/* Connecting Line */}
            <div className="relative w-32 md:w-64 h-[1px] bg-white/20 overflow-hidden">
                <motion.div
                    className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            </div>

            {/* Right Dot (Me) */}
            <div className="relative">
                <motion.div
                    className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full z-10 relative"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    animate={{ scale: [1, 3], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
                />
            </div>
        </div>
    );
};

export default function Slide6_Outro() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3,
                delayChildren: 0.3,
            },
        },
        // Removed exit animation
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: "easeOut" }
        },
    };

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center z-20 overflow-hidden">

            {/* Background Ambience (Subtle Stars/Particles could be added here later) */}

            <motion.div
                className="max-w-6xl w-full flex flex-col items-center gap-4 text-center relative z-10 px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Intro Text */}
                <motion.p variants={itemVariants} className="text-xl md:text-2xl font-light text-neutral-400 font-['Presentation'] tracking-wide">
                    이음은 전 세계 어디에 있든
                </motion.p>

                {/* Main Headline */}
                <motion.h2
                    variants={itemVariants}
                    className="text-5xl md:text-7xl lg:text-8xl font-['IncheonEducation'] text-white leading-tight drop-shadow-2xl my-2"
                >
                    마치 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">옆자리처럼</span>
                </motion.h2>

                {/* Sub Headline */}
                <motion.p variants={itemVariants} className="text-xl md:text-3xl font-[300] text-neutral-300 font-['Presentation']">
                    연결되는 경험을 제공합니다.
                </motion.p>

                {/* Visual Connector */}
                <motion.div variants={itemVariants} className="w-full flex justify-center">
                    <ConnectionPulse />
                </motion.div>

                {/* Call To Action */}
                <motion.div variants={itemVariants} className="mt-8">
                    <div className="px-8 py-4 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white font-['Presentation'] text-lg md:text-xl font-light tracking-widest uppercase hover:bg-white/10 transition-colors duration-500">
                        지금 바로 시연으로 보여드리겠습니다
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
}
