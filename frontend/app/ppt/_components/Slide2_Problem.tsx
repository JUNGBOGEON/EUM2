'use client';

import { motion, Variants } from 'framer-motion';
import { useState, useEffect } from 'react';

// Words for typewriter effect (outside component to avoid dependency issues)
const TYPEWRITER_WORDS = ["안녕하세요", "HELLO", "こんにちは", "你好"];

// Typewriter Effect Component
const TypewriterBackground = () => {
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [currentText, setCurrentText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const typeSpeed = 150;
        const deleteSpeed = 100;
        const delayGap = 2000;

        const handleTyping = () => {
            const fullWord = TYPEWRITER_WORDS[currentWordIndex];

            if (isDeleting) {
                setCurrentText(fullWord.substring(0, currentText.length - 1));
            } else {
                setCurrentText(fullWord.substring(0, currentText.length + 1));
            }

            if (!isDeleting && currentText === fullWord) {
                setTimeout(() => setIsDeleting(true), delayGap);
            } else if (isDeleting && currentText === "") {
                setIsDeleting(false);
                setCurrentWordIndex((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
            }
        };

        const timer = setTimeout(handleTyping, isDeleting ? deleteSpeed : typeSpeed);
        return () => clearTimeout(timer);
    }, [currentText, isDeleting, currentWordIndex]);

    return (
        <div className="text-[15vw] font-bold text-neutral-800/20 font-['IncheonEducation'] whitespace-nowrap">
            {currentText}
            <span className="animate-pulse">|</span>
        </div>
    );
};



// Glitch Text Component for "Communication Limit"
const GlitchText = ({ text }: { text: string }) => {
    // ... existing GlitchText ...
    return (
        <div className="relative inline-block">
            <span className="relative z-10">{text}</span>
            <motion.span
                className="absolute top-0 left-0 -z-10 text-red-500 opacity-70"
                animate={{ x: [-2, 2, -1, 0], y: [1, -1, 0] }}
                transition={{ repeat: Infinity, duration: 0.2, repeatDelay: 3 }}
            >
                {text}
            </motion.span>
            <motion.span
                className="absolute top-0 left-0 -z-10 text-blue-500 opacity-70"
                animate={{ x: [2, -2, 1, 0], y: [-1, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.2, repeatDelay: 3, delay: 0.1 }}
            >
                {text}
            </motion.span>
        </div>
    );
};

export default function Slide2_Problem() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
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
        <div className="w-full h-full relative flex flex-col items-center justify-center z-20">

            {/* Background Ambience - Typewriter Effect */}
            <div className="absolute inset-0 bg-black pointer-events-none -z-10 flex items-center justify-center opacity-30 select-none overflow-hidden">
                <TypewriterBackground />
            </div>

            <motion.div
                className="max-w-7xl w-full flex flex-col items-center gap-10 text-center mt-[-3vh]"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* 1. The Context (Light) */}
                <motion.div variants={itemVariants} className="flex flex-col gap-2 opacity-80">
                    <p className="text-xl md:text-2xl font-[300] font-['Presentation'] text-neutral-400 tracking-wide">
                        글로벌 협업이 일상이 된 지금,
                    </p>
                    <p className="text-2xl md:text-3xl font-[300] font-['Presentation'] text-white">
                        화상회의로 언제든 만날 수 있지만...
                    </p>
                </motion.div>

                {/* 2. The Problem Header (Impact) */}
                <motion.div variants={itemVariants} className="py-4">
                    <h2 className="text-6xl md:text-8xl font-['IncheonEducation'] text-white leading-tight tracking-tight">
                        <GlitchText text="소통의 한계" />
                        <span className="text-4xl md:text-6xl text-neutral-500 font-normal ml-4">
                            까지<br className="md:hidden" /> 사라진 건 아닙니다.
                        </span>
                    </h2>
                </motion.div>

                {/* 3. The Pain Points (Clean & Minimalist) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full px-12 mt-4">
                    {[
                        { title: "01. 언어의 장벽", desc: "뉘앙스를 놓치고\n오해가 쌓이는 대화" },
                        { title: "02. 설명의 한계", desc: "복잡한 내용을\n말로만 설명하다 답답함" },
                        { title: "03. 기록의 압박", desc: "받아적느라\n눈을 맞추지 못하는 순간" }
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            className="flex flex-col items-start text-left p-6 border-l border-white/20 hover:border-blue-500/50 transition-colors duration-500"
                        >
                            <h3 className="text-xl md:text-2xl font-bold font-['Presentation'] text-white mb-3 tracking-wide">
                                {item.title}
                            </h3>
                            <p className="text-lg text-neutral-400 font-['Presentation'] font-light whitespace-pre-line leading-relaxed">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* 4. The Solution Hook */}
                <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-2">
                    <p className="text-xl text-neutral-400 font-light">다들 한 번쯤 경험해보셨을 이 문제들,</p>
                    <h3 className="text-3xl md:text-4xl font-bold font-['Presentation'] text-white">
                        이음은 <span className="text-blue-400 underline decoration-1 underline-offset-8 decoration-blue-400/30">세 가지 핵심 기능</span>으로 해결합니다.
                    </h3>
                </motion.div>

            </motion.div>

        </div>
    );
}
