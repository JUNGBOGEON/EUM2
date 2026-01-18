'use client';

import { motion, Variants } from 'framer-motion';

// Minimalist Text Step
const TextStep = ({
    number,
    title,
    tech,
    desc,
    delay
}: {
    number: string,
    title: string,
    tech: string,
    desc: string,
    delay: number
}) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay, duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-start min-w-[200px] max-w-[280px] relative"
    >
        <span className="text-6xl md:text-8xl font-['IncheonEducation'] text-white/15 absolute -translate-y-8 -translate-x-4 z-0">
            {number}
        </span>
        <div className="relative z-10">
            <h3 className="text-2xl md:text-4xl font-['IncheonEducation'] text-white mb-2">
                {title}
            </h3>
            <p className="text-blue-400 font-mono text-xs md:text-sm uppercase tracking-wider mb-2">
                {tech}
            </p>
            <p className="text-neutral-400 font-['Presentation'] font-light text-sm md:text-base leading-relaxed break-keep">
                {desc}
            </p>
        </div>
    </motion.div>
);

// Clean Line Visualizer (No Box)
const LineVisualizer = () => {
    return (
        <div className="relative w-full max-w-4xl h-48 flex items-center justify-center my-8">
            {/* 1. Jittery Line (Red) */}
            <motion.svg className="absolute w-full h-full overflow-visible" viewBox="0 0 600 120">
                <motion.path
                    // A jittery approximation of a sine wave
                    d="M0,60 L20,50 L40,40 L60,20 L80,30 L100,10 L120,20 L140,40 L160,50 L180,60 L200,60 L220,70 L240,90 L260,80 L280,100 L300,110 L320,100 L340,90 L360,70 L380,80 L400,60 L420,50 L440,30 L460,40 L480,20 L500,10 L520,20 L540,40 L560,50 L580,60 L600,60"
                    fill="none"
                    stroke="rgba(244, 63, 94, 0.5)" // Rose-500
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: [0, 1, 1, 1],
                        opacity: [1, 1, 0, 0]
                    }}
                    transition={{
                        duration: 4,
                        times: [0, 0.3, 0.5, 1], // Draw in 30%, Stay till 50%, Fade
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            </motion.svg>

            {/* 2. Smooth Curve (Blue) - Draws over */}
            <motion.svg className="absolute w-full h-full overflow-visible" viewBox="0 0 600 120">
                <motion.path
                    // A perfect sine wave matching the jitter
                    d="M0,60 C100,-20 200,-20 300,60 C400,140 500,140 600,60"
                    fill="none"
                    stroke="#60A5FA" // Blue-400
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: [0, 1, 1],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 4,
                        times: [0.3, 0.6, 1], // Start drawing at 30% (after Red), finish at 60%, fade
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.svg>

            {/* 3. Optimization Points (White/Green Dots) */}
            <div className="absolute w-full h-full top-0 left-0 pointer-events-none">
                {/* Position dots along the curve approximated by % left/top */}
                {/* Start(0,60), Peak(150, ~10), Mid(300,60), Valley(450, ~110), End(600,60) */}
                {[
                    { left: '0%', top: '50%' },
                    { left: '25%', top: '15%' },
                    { left: '50%', top: '50%' },
                    { left: '75%', top: '85%' },
                    { left: '100%', top: '50%' },
                ].map((pos, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-4 h-4 bg-emerald-400 rounded-full box-shadow-glow border-2 border-white"
                        style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                        transition={{
                            delay: 2.4 + (i * 0.1), // Appear after Blue is drawn
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 2.5
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default function Slide9_TechChallenge2() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: "easeOut" }
        },
    };

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center z-20 overflow-hidden">

            <motion.div
                className="max-w-7xl w-full h-full flex flex-col items-center justify-center gap-12 md:gap-16 relative z-10 px-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Header Section */}
                <div className="text-center flex flex-col items-center gap-6">
                    <motion.div variants={itemVariants} className="flex flex-col items-center">
                        <span className="text-xl md:text-2xl text-blue-400 font-['IncheonEducation'] mb-2">Technical Challenge #02</span>
                        <h2 className="text-5xl md:text-7xl font-['IncheonEducation'] text-white leading-tight">
                            {'"종이에 쓰는 듯한 필기감"'}
                        </h2>
                        <p className="mt-4 text-xl md:text-2xl text-neutral-400 font-['Presentation'] font-light max-w-4xl break-keep">
                            화상회의 중 <span className="text-rose-400 font-bold">손이 떨리거나 글씨가 끊기면</span> 몰입이 깨집니다.<br className="hidden md:block" />
                            이를 해결하기 위해 <span className="text-white font-bold">3단계 보정 파이프라인</span>을 구축했습니다.
                        </p>
                    </motion.div>
                </div>

                {/* Main Visual: The Line */}
                <motion.div variants={itemVariants} className="w-full flex justify-center">
                    <LineVisualizer />
                </motion.div>

                {/* Narrative Steps - Clean & Friendly */}
                <div className="w-full flex flex-col md:flex-row items-start justify-center gap-12 md:gap-16">
                    <TextStep
                        number="01"
                        title="흔들림 보정"
                        tech="One Euro Filter"
                        desc="미세한 손떨림을 실시간으로 감지하고 걸러냅니다."
                        delay={0.6}
                    />

                    {/* Divider/Arrow for mobile? Hidden for clean desktop */}

                    <TextStep
                        number="02"
                        title="곡선화 처리"
                        tech="Bezier Curve"
                        desc="딱딱한 직선을 부드러운 곡선으로 자연스럽게 연결합니다."
                        delay={0.8}
                    />

                    <TextStep
                        number="03"
                        title="데이터 경량화"
                        tech="Douglas-Peucker Algorithm"
                        desc="불필요한 좌표를 지워 전송 속도를 40% 더 빠르게 만듭니다."
                        delay={1.0}
                    />
                </div>

                {/* Summary Text */}
                <motion.p
                    variants={itemVariants}
                    className="mt-8 text-xl md:text-2xl text-neutral-400 font-['Presentation'] font-light text-center max-w-4xl"
                >
                    <span className="text-white font-bold">다단계 보정 기술</span>로
                    네트워크 너머에서도<br className="md:hidden" /> <span className="text-blue-400">자연스러운 드로잉</span>을 구현했습니다.
                </motion.p>

            </motion.div>
        </div>
    );
}
