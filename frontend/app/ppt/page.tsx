'use client';

import { AnimatePresence, motion, Variants } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import Slide1_Main from './_components/Slide1_Main';
import Slide2_Problem from './_components/Slide2_Problem';
import Slide3_Language from './_components/Slide3_Language';
import Slide4_Whiteboard from './_components/Slide4_Whiteboard';
import Slide5_Minutes from './_components/Slide5_Minutes';
import Slide6_Outro from './_components/Slide6_Outro';
import Slide7_Architecture from './_components/Slide7_Architecture';
import Slide8_TechChallenge1 from './_components/Slide8_TechChallenge1';
import Slide9_TechChallenge2 from './_components/Slide9_TechChallenge2';
import Slide10_Team from './_components/Slide10_Team';
import SlideNavigator from './_components/SlideNavigator';

const SLIDES = [
    { id: 0, title: "시작", subtitle: "개요 및 소개" },
    { id: 1, title: "문제", subtitle: "글로벌 협업의 장벽" },
    { id: 2, title: "언어", subtitle: "실시간 AI 통역" },
    { id: 3, title: "화이트보드", subtitle: "실시간 협업" },
    { id: 4, title: "자동 회의록", subtitle: "AI 요약 및 정리" },
    { id: 5, title: "시연", subtitle: "데모 및 마무리" },
    { id: 6, title: "아키텍처", subtitle: "시스템 구조" },
    { id: 7, title: "안정성", subtitle: "기술적 챌린지" },
    { id: 8, title: "손글씨", subtitle: "드로잉 최적화" },
    { id: 9, title: "팀", subtitle: "TEAM 이음" }
];

const MAX_SLIDES = SLIDES.length;

export default function PresentationPage() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    const nextSlide = useCallback(() => {
        if (currentSlide < MAX_SLIDES - 1) {
            setDirection(1);
            setCurrentSlide(prev => prev + 1);
        }
    }, [currentSlide]);

    const prevSlide = useCallback(() => {
        if (currentSlide > 0) {
            setDirection(-1);
            setCurrentSlide(prev => prev - 1);
        }
    }, [currentSlide]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
        }
    }, [nextSlide, prevSlide]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const slideVariants: Variants = {
        enter: (direction: number) => ({
            y: direction > 0 ? '100%' : '-100%',
            opacity: 1,
            zIndex: 10,
        }),
        center: {
            y: 0,
            opacity: 1,
            zIndex: 10,
            transition: {
                duration: 0.8,
                ease: "easeInOut"
            }
        },
        exit: (direction: number) => ({
            y: direction > 0 ? '-100%' : '100%',
            opacity: 1,
            zIndex: 0,
            transition: {
                duration: 0.8,
                ease: "easeInOut"
            }
        })
    };

    return (
        <div
            className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center relative overflow-hidden cursor-none selection:bg-white selection:text-black"
            onClick={nextSlide}
        >
            {/* Global Navigation - iPhone Scroll Wheel Style */}
            <SlideNavigator currentSlide={currentSlide} slides={SLIDES} />

            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-neutral-900 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-neutral-900 to-transparent" />
            </div>

            {/* Global Bottom Glow Transition - Seamless Color Change */}
            <motion.div
                className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] blur-[100px] pointer-events-none z-0"
                animate={{
                    backgroundColor:
                        currentSlide === 2 ? 'rgba(37, 99, 235, 0.2)' : // Slide 3 (Blue)
                            currentSlide === 3 ? 'rgba(147, 51, 234, 0.2)' : // Slide 4 (Purple)
                                currentSlide === 4 ? 'rgba(16, 185, 129, 0.2)' : // Slide 5 (Emerald)
                                    currentSlide === 5 ? 'rgba(255, 255, 255, 0.15)' : // Slide 6 (White/Pure)
                                        currentSlide === 6 ? 'rgba(59, 130, 246, 0.1)' : // Slide 7 (Tech Blue)
                                            currentSlide === 7 ? 'rgba(244, 63, 94, 0.2)' : // Slide 8 (Rose/Warning)
                                                currentSlide === 8 ? 'rgba(96, 165, 250, 0.2)' : // Slide 9 (Blue/Creative)
                                                currentSlide === 9 ? 'rgba(168, 85, 247, 0.15)' : // Slide 10 (Purple/Team)
                                                    'rgba(0, 0, 0, 0)' // Others (Transparent)
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* Slide Content Area */}
            <div className="w-full flex-1 relative z-10 perspective-[1000px]">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={currentSlide}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="absolute inset-0 w-full h-full bg-black overflow-hidden" // Added bg-black and overflow-hidden
                    >
                        {currentSlide === 0 && <Slide1_Main />}
                        {currentSlide === 1 && <Slide2_Problem />}
                        {currentSlide === 2 && <Slide3_Language />}
                        {currentSlide === 3 && <Slide4_Whiteboard />}
                        {currentSlide === 4 && <Slide5_Minutes />}
                        {currentSlide === 5 && <Slide6_Outro />}
                        {currentSlide === 6 && <Slide7_Architecture />}
                        {currentSlide === 7 && <Slide8_TechChallenge1 />}
                        {currentSlide === 8 && <Slide9_TechChallenge2 />}
                        {currentSlide === 9 && <Slide10_Team />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Removed old dot indicator */}
        </div>
    );
}
