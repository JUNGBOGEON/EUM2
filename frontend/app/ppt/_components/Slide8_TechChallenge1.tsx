'use client';

import { motion, Variants } from 'framer-motion';

export default function Slide8_TechChallenge1() {
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
                className="max-w-7xl w-full h-full flex flex-col items-center justify-center gap-12 md:gap-20 relative z-10 px-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Header Section */}
                <div className="text-center flex flex-col items-center gap-6">
                    <motion.div variants={itemVariants} className="flex flex-col items-center">
                        <span className="text-xl md:text-2xl text-rose-400 font-['IncheonEducation'] mb-2">Technical Challenge #01</span>
                        <h2 className="text-5xl md:text-7xl font-['IncheonEducation'] text-white leading-tight">
                            "사람이 몰리면, <br className="md:hidden" />연결이 끊겼습니다"
                        </h2>
                        <p className="mt-4 text-xl md:text-2xl text-neutral-400 font-['Presentation'] font-light max-w-4xl">
                            화상회의 중 <span className="text-white font-bold">20명 이상</span>이 동시에 접속했을 때,<br className="hidden md:block" />
                            <span className="text-rose-400 font-bold">3명 중 1명</span>은 30초 안에 회의실에서 튕겨나갔습니다.
                        </p>
                    </motion.div>
                </div>

                {/* Core Narrative: BEFORE -> AFTER */}
                <div className="w-full flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">

                    {/* BEFORE: Problem */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center text-center group">
                        <div className="text-2xl md:text-3xl font-['IncheonEducation'] text-rose-400/80 mb-2">Before</div>
                        <div className="text-[8rem] md:text-[10rem] font-['IncheonEducation'] text-rose-500 leading-[0.8] drop-shadow-lg scale-90 md:scale-100">
                            38<span className="text-[4rem] md:text-[6rem]">%</span>
                        </div>
                        <div className="mt-4 text-xl md:text-xl text-neutral-400 font-['Presentation']">
                            비정상 종료율 (Fail rate)
                        </div>
                    </motion.div>

                    {/* Arrow / Transition */}
                    <motion.div
                        variants={itemVariants}
                        className="hidden md:flex flex-col items-center gap-2 opacity-50 pt-10"
                    >
                        <div className="w-24 h-[1px] bg-white/30" />
                    </motion.div>

                    {/* AFTER: Solution */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
                        <div className="text-2xl md:text-3xl font-['IncheonEducation'] text-emerald-400/80 mb-2">After</div>
                        <div className="text-[8rem] md:text-[10rem] font-['IncheonEducation'] text-emerald-400 leading-[0.8] drop-shadow-lg scale-90 md:scale-100">
                            0.2<span className="text-[4rem] md:text-[6rem]">%</span>
                        </div>
                        <div className="mt-4 text-xl md:text-xl text-neutral-400 font-['Presentation']">
                            안정화 성공
                        </div>
                    </motion.div>

                </div>

                {/* Usage of Solution - Friendly Text */}
                <motion.div
                    variants={itemVariants}
                    className="mt-4 md:mt-8 flex flex-col items-center gap-2 text-center"
                >
                    <p className="text-lg md:text-xl text-neutral-400 font-['Presentation']">
                        Socket.IO의 타임아웃 설정을 튜닝하고, 끊겨도 바로 붙는 <span className="text-emerald-300 font-bold">재연결 로직</span>을 더해<br className="hidden md:block" />
                        <span className="text-white">더 이상 대화가 끊기지 않도록</span> 만들었습니다.
                    </p>
                </motion.div>

            </motion.div>

            {/* CSS for glitch effect if needed, otherwise clean */}
        </div>
    );
}
