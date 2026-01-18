'use client';

import { motion, Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

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

    const [backgroundTexts, setBackgroundTexts] = useState<any[]>([]);

    useEffect(() => {
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

        // Generate 38 items (Reduced by another 25%, total 38)
        for (let i = 0; i < 38; i++) {
            items.push({
                text: allSentences[i % allSentences.length],
                left: `${Math.random() * 100}%`,
                // Sentences need responsive sizing, slightly smaller max size to fit
                size: Math.random() > 0.8 ? "text-3xl" : Math.random() > 0.5 ? "text-xl" : "text-lg",
                duration: 25 + Math.random() * 30, // 25-55s duration (Much slower)
                delay: Math.random() * -20 // Negative delay to start mid-animation
            });
        }
        setBackgroundTexts(items);
    }, []);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black">
            {/* Falling Outline Typography Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
                {backgroundTexts.map((item, index) => (
                    <motion.div
                        key={index}
                        variants={fallingVariants(item.duration, item.delay)}
                        animate="animate"
                        initial={{ y: Math.random() * 100 + 'vh' }} // Random start pos
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
                        <span className="text-sm md:text-base text-neutral-400 font-[200] font-['Presentation'] tracking-widest uppercase border border-neutral-700 px-6 py-2 rounded-full backdrop-blur-sm bg-black/30">
                            SMART WORKSPACE
                        </span>
                        <span className="text-sm md:text-base text-neutral-400 font-[200] font-['Presentation'] tracking-widest uppercase border border-neutral-700 px-6 py-2 rounded-full backdrop-blur-sm bg-black/30">
                            REAL-TIME SYNC
                        </span>
                    </div>
                </motion.div>
            </motion.div>


        </div>
    );
}
