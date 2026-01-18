'use client';

import { motion, Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

// Multilingual words for ambient background
const WORDS = [
    "Hello", "Bonjour", "안녕하세요", "你好", "Hola", "Guten Tag",
    "Ciao", "Olá", "Привет", "مرحبا", "नमस्ते", "Sawasdee"
];

function FloatingBackground() {
    const [items, setItems] = useState<{ id: number; text: string; x: number; y: number; duration: number }[]>([]);

    useEffect(() => {
        const newItems = WORDS.map((text, i) => ({
            id: i,
            text,
            x: Math.random() * 100,
            y: Math.random() * 100,
            duration: 15 + Math.random() * 20
        }));
        setItems(newItems);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    className="absolute text-neutral-500 font-light font-['Presentation'] text-xl blur-[2px]"
                    initial={{ x: `${item.x}vw`, y: `110vh`, opacity: 0 }}
                    animate={{
                        y: `-10vh`,
                        opacity: [0, 0.3, 0],
                    }}
                    transition={{
                        duration: item.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 10
                    }}
                >
                    {item.text}
                </motion.div>
            ))}
        </div>
    );
}

// Simulated Translation Flow Component (Minimalist)
const TranslationDemo = () => {
    return (
        <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-6 md:gap-8 text-3xl md:text-5xl font-light text-neutral-500">
                <span>Hello World</span>
                <motion.span
                    animate={{ opacity: [0.3, 1, 0.3], x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-blue-500 font-thin"
                >
                    →
                </motion.span>
                <motion.span
                    className="text-white font-medium"
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
                >
                    안녕, 세상아
                </motion.span>
            </div>
            <div className="mt-4 text-xs text-blue-400/40 font-mono tracking-[0.5em] uppercase">
                Real-time Translation
            </div>
        </div>
    );
}

export default function Slide3_Language() {
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

            {/* Background Ambience */}
            <FloatingBackground />



            <motion.div
                className="max-w-7xl w-full flex flex-col items-center gap-6 text-center mt-[-2vh] relative z-10 px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
                    <span className="text-sm tracking-[0.4em] text-blue-400 font-medium uppercase">Solution 01</span>
                    <h2 className="text-5xl md:text-7xl font-['IncheonEducation'] text-white drop-shadow-xl leading-tight">
                        언어의 장벽,<br className="md:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">더 이상 문제가 아닙니다.</span>
                    </h2>
                </motion.div>

                {/* Core Message Text */}
                <motion.div variants={itemVariants} className="max-w-3xl">
                    <p className="text-xl md:text-2xl font-[300] font-['Presentation'] text-neutral-300 leading-relaxed word-keep-all">
                        <span className="text-white font-bold text-shadow-glow">실시간 AI 통역</span>으로<br className="md:hidden" /> 언어 걱정 없이 업무에만 집중하세요.
                    </p>
                </motion.div>

                {/* Visual Demo - Kept minimal */}
                <motion.div variants={itemVariants} className="w-full mt-4 mb-8">
                    <TranslationDemo />
                </motion.div>

                {/* Feature Stats (Architectural / Minimal) - No Cards */}
                <div className="flex flex-col md:flex-row justify-between w-full max-w-5xl px-8 md:px-0">
                    {[
                        { label: "Latency", value: "0.2s", desc: "말하는 즉시 통역" },
                        { label: "Accuracy", value: "Context", desc: "문맥 파악 번역" },
                        { label: "Seamless", value: "Natural", desc: "끊김 없는 대화 흐름" },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            className={`flex flex-col items-center flex-1 ${idx !== 2 ? 'md:border-r border-white/20' : ''}`}
                        >
                            <span className="text-xs font-mono text-blue-400 tracking-widest uppercase mb-2">{item.label}</span>
                            <div className="text-4xl md:text-5xl font-['IncheonEducation'] text-white mb-2">{item.value}</div>
                            <p className="text-neutral-400 font-['Presentation'] font-light text-sm">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </motion.div>

        </div>
    );
}
