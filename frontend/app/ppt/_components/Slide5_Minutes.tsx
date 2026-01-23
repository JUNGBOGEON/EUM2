'use client';

import { motion, Variants } from 'framer-motion';

// Pre-calculated random delays for AudioWave
const AUDIO_WAVE_DELAYS = [0.12, 0.35, 0.08, 0.42, 0.25, 0.18, 0.38, 0.05, 0.32, 0.22];

// Simulated Audio Visualizer (Minimalist)
const AudioWave = () => (
    <div className="flex items-center gap-1 h-8">
        {[...Array(10)].map((_, i) => (
            <motion.div
                key={i}
                className="w-1 bg-emerald-500 rounded-full"
                animate={{
                    height: [4, 16, 8, 24, 4],
                    opacity: [0.3, 1, 0.5]
                }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1,
                    repeatDelay: AUDIO_WAVE_DELAYS[i]
                }}
            />
        ))}
    </div>
);

// Simulated Typing/Summarizing Demo
const MinutesDemo = () => {
    return (
        <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-8">
            {/* Audio Input Indication */}
            <div className="mb-6 opacity-80">
                <AudioWave />
            </div>

            {/* Transcription Flow */}
            <div className="flex flex-col items-center gap-2 text-xl md:text-3xl font-light text-neutral-500">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0 }}
                >
                    {'"이번 프로젝트의 핵심 목표는..."'}
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.5 }}
                >
                    {'"사용자 경험을 최우선으로..."'}
                </motion.div>

                {/* Visual Transformation Arrow */}
                <motion.div
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                    className="text-emerald-500 font-thin text-2xl my-2"
                >
                    ↓
                </motion.div>

                {/* Final Summary */}
                <motion.div
                    className="text-white font-medium bg-gradient-to-r from-emerald-500/10 to-transparent px-6 py-2 rounded-lg border-l-2 border-emerald-500"
                    initial={{ opacity: 0, filter: "blur(5px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, delay: 3 }}
                >
                    핵심 목표: <span className="text-emerald-400">사용자 경험(UX) 극대화</span>
                </motion.div>
            </div>

            <div className="mt-6 text-lg text-emerald-400/40 font-mono tracking-[0.5em] uppercase">
                AI Speech-to-Text & Summary
            </div>
        </div>
    );
}

export default function Slide5_Minutes() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
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
            transition: { duration: 0.6, ease: "easeOut" }
        },
    };

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center z-20 overflow-hidden">

            <motion.div
                className="max-w-7xl w-full flex flex-col items-center gap-6 text-center mt-[-2vh] relative z-10 px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
                    <span className="text-xl tracking-[0.4em] text-emerald-400 font-medium uppercase">Solution 03</span>
                    <h2 className="text-5xl md:text-7xl font-['IncheonEducation'] text-white drop-shadow-xl leading-tight">
                        AI 자동 회의록,<br className="md:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400">기록은 AI에게 맡기세요.</span>
                    </h2>
                </motion.div>

                {/* Core Message Text */}
                <motion.div variants={itemVariants} className="max-w-3xl">
                    <p className="text-xl md:text-2xl font-[300] font-['Presentation'] text-neutral-300 leading-relaxed word-keep-all">
                        이제 받아 적을 필요 없습니다.<br className="md:hidden" /> <span className="text-white font-bold text-shadow-glow">대화 그 자체에만 몰입</span>하세요.
                    </p>
                </motion.div>

                {/* Visual Demo - Interactive & Minimal */}
                <motion.div variants={itemVariants} className="w-full mt-4 mb-6">
                    <MinutesDemo />
                </motion.div>

                {/* Feature Stats (Architectural / Minimal) */}
                <div className="flex flex-col md:flex-row justify-between w-full max-w-5xl px-8 md:px-0">
                    {[
                        { label: "Accuracy", value: "99%", desc: "정확한 음성 인식률" },
                        { label: "Efficiency", value: "Auto-Summary", desc: "핵심 내용 자동 요약" },
                        { label: "Result", value: "Action Items", desc: "할 일 자동 추출" },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            className={`flex flex-col items-center flex-1 ${idx !== 2 ? 'md:border-r border-white/20' : ''}`}
                        >
                            <span className="text-lg font-mono text-emerald-400 tracking-widest uppercase mb-2">{item.label}</span>
                            <div className="text-4xl md:text-5xl font-['IncheonEducation'] text-white mb-2">{item.value}</div>
                            <p className="text-neutral-400 font-['Presentation'] font-light text-xl">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </motion.div>

        </div>
    );
}
