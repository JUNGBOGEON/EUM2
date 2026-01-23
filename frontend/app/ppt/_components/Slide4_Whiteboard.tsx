'use client';

import { motion, Variants } from 'framer-motion';

// Simulated Cursors
const Cursor = ({ color, label, delay }: { color: string, label: string, delay: number }) => (
    <motion.div
        className="absolute pointer-events-none z-20 flex items-start gap-1"
        initial={{ opacity: 0, x: 0, y: 0 }}
        animate={{
            opacity: [0, 1, 1, 0],
            x: [0, 100, 150, 200, 50],
            y: [0, 50, -50, 0, 100]
        }}
        transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1,
            delay: delay
        }}
    >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.7841 12.3673H5.65376Z" fill={color} stroke="white" strokeWidth="1" />
        </svg>
        <span className="px-2 py-0.5 rounded-full text-sm font-bold text-white bg-opacity-80 backdrop-blur-sm" style={{ backgroundColor: color }}>
            {label}
        </span>
    </motion.div>
);

// Collaborative Whiteboard Demo
const WhiteboardDemo = () => {
    return (
        <div className="relative w-full max-w-3xl mx-auto h-[300px] my-8 rounded-xl border border-white/5 bg-neutral-900/20 backdrop-blur-sm overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Drawing Area */}
            <div className="relative w-full h-full flex items-center justify-center">

                {/* Simulated Path 1 (Circle) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <motion.circle
                        cx="40%" cy="50%" r="50"
                        stroke="#3B82F6" strokeWidth="4" fill="transparent"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5, delay: 0.5 }}
                    />
                </svg>

                {/* Simulated Path 2 (Checkmark) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <motion.path
                        d="M55% 50% L60% 55% L70% 40%" // Checkmark roughly
                        stroke="#10B981" strokeWidth="4" fill="transparent"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 3, delay: 2 }}
                    />
                </svg>

                {/* Simulated Path 3 (Connecting Line) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <motion.path
                        d="M45% 50% Q 50% 30% 60% 45%"
                        stroke="#8B5CF6" strokeWidth="2" strokeDasharray="5,5" fill="transparent"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.5 }}
                        transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5, delay: 1.2 }}
                    />
                </svg>

                {/* Cursors */}
                <div className="absolute top-[40%] left-[35%] w-full h-full">
                    <Cursor color="#3B82F6" label="Jung" delay={0} />
                </div>
                <div className="absolute top-[45%] left-[55%] w-full h-full">
                    <Cursor color="#10B981" label="Kim" delay={1.5} />
                </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-white/50">✎</div>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400">□</div>
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-white/50">T</div>
            </div>
        </div>
    );
}

export default function Slide4_Whiteboard() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            },
        },
        // Removed exit animation to allow global slide transition to handle the exit
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
                    <span className="text-xl tracking-[0.4em] text-purple-400 font-medium uppercase">Solution 02</span>
                    <h2 className="text-5xl md:text-7xl font-['IncheonEducation'] text-white drop-shadow-xl leading-tight">
                        실시간 협업,<br className="md:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">아이디어가 흐르는 공간</span>
                    </h2>
                </motion.div>

                {/* Core Message Text */}
                <motion.div variants={itemVariants} className="max-w-3xl">
                    <p className="text-xl md:text-2xl font-[300] font-['Presentation'] text-neutral-300 leading-relaxed word-keep-all">
                        <span className="text-white font-bold text-shadow-glow">무한한 화이트보드</span>에서<br className="md:hidden" /> 말보다 빠른 시각적 소통을 경험하세요.
                    </p>
                </motion.div>

                {/* Visual Demo - Interactive & Minimal */}
                <motion.div variants={itemVariants} className="w-full mt-4 mb-6">
                    <WhiteboardDemo />
                </motion.div>

                {/* Feature Stats (Architectural / Minimal) */}
                <div className="flex flex-col md:flex-row justify-between w-full max-w-5xl px-8 md:px-0">
                    {[
                        { label: "Performance", value: "Live Sync", desc: "딜레이 없는 동기화" },
                        { label: "Canvas", value: "Infinite", desc: "무한한 아이디어 공간" },
                        { label: "Collab", value: "Multi-User", desc: "팀원 동시 접속/편집" },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            className={`flex flex-col items-center flex-1 ${idx !== 2 ? 'md:border-r border-white/20' : ''}`}
                        >
                            <span className="text-lg font-mono text-purple-400 tracking-widest uppercase mb-2">{item.label}</span>
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
