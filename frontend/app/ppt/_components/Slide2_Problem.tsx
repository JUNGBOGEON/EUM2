'use client';

import { motion, Variants } from 'framer-motion';

export default function Slide2_Problem() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const textVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } // Custom easing for premium feel
        },
    };

    const lineVariants: Variants = {
        hidden: { width: 0 },
        visible: {
            width: "100%",
            transition: { duration: 1.5, ease: "easeInOut", delay: 0.5 }
        }
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">

            {/* Dark Overlay for depth (Fades in slowly) */}
            <motion.div
                className="absolute inset-0 bg-black/60 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2.5 }}
            />

            {/* 1. Subtle Background Element: Organic Gradient Mesh (Fades in) */}
            <motion.div
                className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 3, delay: 0.5, ease: "easeOut" }}
            />
            <motion.div
                className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 3, delay: 0.5, ease: "easeOut" }}
            />

            <motion.div
                className="max-w-[85vw] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 ml-[80px] z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Left Column: The Statement (Headline) */}
                <div className="lg:col-span-7 flex flex-col justify-center pr-4">
                    <motion.div variants={textVariants}>
                        <p className="text-blue-400 font-mono text-sm tracking-[0.2em] mb-6 uppercase opacity-80">
                            The Challenge
                        </p>
                    </motion.div>

                    <motion.h2
                        variants={textVariants}
                        className="text-6xl md:text-7xl lg:text-8xl font-['IncheonEducation'] text-white leading-[1.1] tracking-tight"
                    >
                        소통의 한계<span className="text-white/30">까지<br /></span>
                        <span className="text-white/30">사라진 건 아닙니다.</span>
                    </motion.h2>

                    <motion.div variants={lineVariants} className="h-[1px] bg-white/20 mt-12 mb-12 origin-left" />

                    <motion.p
                        variants={textVariants}
                        className="text-2xl md:text-3xl text-neutral-400 font-['Presentation'] font-light leading-relaxed max-w-2xl text-balance"
                    >
                        글로벌 협업이 일상이 된 시대,<br />
                        우리는 <span className="text-white font-medium">화상회의</span>로 언제든 만날 수 있지만<br />
                        진정한 의미의 <span className="text-white font-medium">연결</span>은 여전히 어렵습니다.
                    </motion.p>
                </div>

                {/* Right Column: The Narrative (Editorial) */}
                <div className="lg:col-span-5 flex flex-col justify-center gap-10 border-l border-white/5 pl-0 lg:pl-16">
                    <motion.div variants={textVariants} className="space-y-6">
                        <p className="text-lg md:text-xl text-neutral-300 font-['Aggravo'] leading-loose opacity-90 break-keep">
                            "해외 팀원이나 클라이언트와 협업할 일이 많아졌습니다.
                            하지만 <span className="text-rose-400 border-b border-rose-400/30 pb-0.5">언어 장벽</span> 때문에 중요한 뉘앙스를 놓치거나,
                            <span className="text-rose-400 border-b border-rose-400/30 pb-0.5 ml-2">회의록 정리</span>에 급급해 눈을 맞추지 못하는 순간들이 있습니다."
                        </p>
                    </motion.div>

                    <motion.div variants={textVariants} className="space-y-2">
                        <span className="text-8xl text-white/5 font-serif absolute -translate-x-6 -translate-y-8 select-none">“</span>
                        <p className="text-2xl md:text-3xl font-['IncheonEducation'] text-white relative z-10 leading-snug">
                            얼마나 답답할까,<br />
                            그런 고민에서 <span className="text-blue-400">이음</span>이 시작됐습니다.
                        </p>
                    </motion.div>

                    {/* Bottom Hook */}
                    <motion.div variants={textVariants} className="mt-8 pt-8 border-t border-white/10">
                        <div className="flex items-center gap-4 group cursor-pointer">
                            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                            <span className="text-xl text-white/60 font-light group-hover:text-white transition-colors duration-300">
                                이를 해결할 <span className="text-white font-medium">세 가지 해법</span>을 소개합니다.
                            </span>
                        </div>
                    </motion.div>
                </div>

            </motion.div>
        </div>
    );
}
