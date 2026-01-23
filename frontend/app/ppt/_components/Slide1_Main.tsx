'use client';

import { motion, Variants } from 'framer-motion';
import { useState } from 'react';

// Pre-generate background text items outside component to avoid hydration issues
const generateBackgroundTexts = () => {
    const sentences = {
        KR: [
            "그럼 이번 회의는 여기까지 하겠습니다", "다음 안건으로 넘어가시죠", "이 부분에 대해 어떻게 생각하시나요?",
            "잠시 쉬었다가 10분 뒤에 다시 시작하겠습니다", "화면 공유 부탁드립니다", "마이크가 꺼져 있으신 것 같아요",
            "일정 확인 부탁드립니다", "오늘 회의록은 제가 정리해서 공유하겠습니다"
        ],
        EN: [
            "Let's wrap up the meeting for today", "Let's move on to the next agenda", "What are your thoughts on this?",
            "Let's take a 10-minute break and resume", "Could you please share your screen?", "I think your microphone is muted",
            "Please check the schedule", "I'll summarize today's minutes and share them"
        ],
        JP: [
            "では、本日の会議はここまでとさせていただきます", "次の議題に移りましょう", "この点についてどう思われますか？",
            "10分休憩して再開しましょう", "画面共有をお願いできますか？", "マイクがミュートになっているようです",
            "スケジュールをご確認ください", "本日の議事録は私がまとめて共有します"
        ],
        CN: [
            "今天的会议就到这里", "让我们进入下一个议程", "大家对这一点有什么看法？",
            "休息10分钟后继续", "请共享一下屏幕", "您的麦克风好像静音了",
            "请确认一下日程", "我会整理今天的会议纪要并分享给大家"
        ]
    };

    const allSentences = [...sentences.KR, ...sentences.EN, ...sentences.JP, ...sentences.CN];
    const items = [];

    // Pre-calculated random values for deterministic rendering
    const randomValues = [
        { left: 45, size: 0.85, duration: 42, delay: -15, initialY: 35 },
        { left: 12, size: 0.62, duration: 38, delay: -8, initialY: 72 },
        { left: 78, size: 0.45, duration: 51, delay: -3, initialY: 15 },
        { left: 34, size: 0.91, duration: 29, delay: -18, initialY: 88 },
        { left: 67, size: 0.33, duration: 47, delay: -12, initialY: 45 },
        { left: 23, size: 0.75, duration: 35, delay: -6, initialY: 62 },
        { left: 89, size: 0.58, duration: 43, delay: -14, initialY: 28 },
        { left: 56, size: 0.42, duration: 52, delay: -9, initialY: 95 },
        { left: 8, size: 0.88, duration: 31, delay: -17, initialY: 18 },
        { left: 71, size: 0.25, duration: 48, delay: -4, initialY: 55 },
        { left: 42, size: 0.68, duration: 39, delay: -11, initialY: 82 },
        { left: 95, size: 0.52, duration: 54, delay: -7, initialY: 38 },
        { left: 18, size: 0.95, duration: 28, delay: -19, initialY: 68 },
        { left: 63, size: 0.38, duration: 46, delay: -2, initialY: 12 },
        { left: 29, size: 0.78, duration: 36, delay: -16, initialY: 92 },
        { left: 84, size: 0.48, duration: 50, delay: -10, initialY: 25 },
        { left: 51, size: 0.65, duration: 33, delay: -5, initialY: 58 },
        { left: 6, size: 0.82, duration: 44, delay: -13, initialY: 78 },
        { left: 76, size: 0.28, duration: 55, delay: -1, initialY: 42 },
        { left: 38, size: 0.72, duration: 30, delay: -20, initialY: 8 },
        { left: 92, size: 0.55, duration: 41, delay: -8, initialY: 65 },
        { left: 15, size: 0.92, duration: 37, delay: -15, initialY: 32 },
        { left: 59, size: 0.35, duration: 49, delay: -6, initialY: 85 },
        { left: 26, size: 0.85, duration: 27, delay: -18, initialY: 22 },
        { left: 82, size: 0.45, duration: 53, delay: -3, initialY: 52 },
        { left: 48, size: 0.62, duration: 34, delay: -12, initialY: 75 },
        { left: 3, size: 0.88, duration: 45, delay: -9, initialY: 48 },
        { left: 69, size: 0.32, duration: 40, delay: -14, initialY: 98 },
        { left: 35, size: 0.75, duration: 32, delay: -7, initialY: 5 },
        { left: 88, size: 0.58, duration: 51, delay: -17, initialY: 62 },
        { left: 21, size: 0.42, duration: 38, delay: -4, initialY: 35 },
        { left: 74, size: 0.95, duration: 29, delay: -11, initialY: 88 },
        { left: 44, size: 0.68, duration: 47, delay: -2, initialY: 15 },
        { left: 97, size: 0.25, duration: 43, delay: -16, initialY: 72 },
        { left: 11, size: 0.78, duration: 52, delay: -10, initialY: 45 },
        { left: 65, size: 0.52, duration: 35, delay: -19, initialY: 28 },
        { left: 32, size: 0.82, duration: 48, delay: -5, initialY: 95 },
        { left: 79, size: 0.38, duration: 31, delay: -13, initialY: 18 },
    ];

    for (let i = 0; i < 38; i++) {
        const rv = randomValues[i];
        items.push({
            text: allSentences[i % allSentences.length],
            left: `${rv.left}%`,
            size: rv.size > 0.8 ? "text-3xl" : rv.size > 0.5 ? "text-xl" : "text-lg",
            duration: rv.duration,
            delay: rv.delay,
            initialY: `${rv.initialY}vh`
        });
    }
    return items;
};

export default function Slide1_Main() {
    // Animation variants for staggered entrance (Disabled for Slide 1 Entrance)
    const containerVariants: Variants = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0, // No stagger
            },
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 1, y: 0, filter: 'blur(0px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: 0 }
        },
    };

    // Falling animation for background text
    const fallingVariants = (duration: number, delay: number): Variants => ({
        animate: {
            y: ['-20vh', '120vh'], // Fall from above to below viewport
            transition: {
                duration: duration * 0.8, // Slightly slower for "Matrix" feel
                repeat: Infinity,
                ease: "linear",
                delay: delay,
            }
        }
    });

    // Use lazy initializer to generate background texts once
    const [backgroundTexts] = useState(generateBackgroundTexts);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black">
            {/* Falling Outline Typography Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
                {backgroundTexts.map((item, index) => (
                    <motion.div
                        key={index}
                        variants={fallingVariants(item.duration, item.delay)}
                        animate="animate"
                        initial={{ y: item.initialY }} // Pre-calculated random start pos
                        className={`absolute font-['Presentation'] font-[900] ${item.size} text-transparent whitespace-nowrap`}
                        style={{
                            left: item.left,
                            WebkitTextStroke: '1px rgba(255, 255, 255, 0.8)', // Stronger stroke
                            filter: 'blur(1.5px)', // ~15% blur (Original 5% + Added 10%)
                            opacity: 0.7 // Higher opacity
                        }}
                    >
                        {item.text}
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <motion.div
                className="z-10 flex flex-col items-center justify-center text-center gap-6 mt-[-5vh]" // Slight upward adjustment for optical center
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >

                {/* Intro Label */}
                <motion.div variants={itemVariants} className="flex items-center gap-6">
                    <div className="h-[1px] bg-white/50 w-[60px] md:w-[100px]" />
                    <span className="text-xl md:text-2xl font-[300] font-['Presentation'] uppercase tracking-[0.4em] text-white/80">
                        프로젝트 소개
                    </span>
                    <div className="h-[1px] bg-white/50 w-[60px] md:w-[100px]" />
                </motion.div>

                {/* Title */}
                <motion.h1
                    variants={itemVariants}
                    className="text-[120px] md:text-[200px] font-[900] font-['Presentation'] leading-none tracking-tighter text-white/90"
                    style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}
                >
                    이음
                </motion.h1>

                {/* Subtitle / Description */}
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
                    <p className="text-3xl md:text-5xl font-normal text-white/80 font-['IncheonEducation'] tracking-widest">
                        현대적인 협업을 위한 공간
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-base md:text-lg text-neutral-400 font-[200] font-['Presentation'] tracking-widest uppercase border border-neutral-700 px-6 py-2 rounded-full backdrop-blur-sm bg-black/30">
                            SMART WORKSPACE
                        </span>
                        <span className="text-base md:text-lg text-neutral-400 font-[200] font-['Presentation'] tracking-widest uppercase border border-neutral-700 px-6 py-2 rounded-full backdrop-blur-sm bg-black/30">
                            REAL-TIME SYNC
                        </span>
                    </div>
                </motion.div>
            </motion.div>


        </div>
    );
}
