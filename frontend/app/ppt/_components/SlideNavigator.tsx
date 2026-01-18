'use client';

import { motion } from 'framer-motion';

interface SlideNavigatorProps {
    currentSlide: number;
    slides: { id: number; title: string; subtitle: string }[];
}

export default function SlideNavigator({ currentSlide, slides }: SlideNavigatorProps) {
    const ITEM_HEIGHT = 80; // Distance between items

    return (
        <div className="fixed left-12 top-1/2 -translate-y-1/2 h-screen w-[500px] overflow-hidden z-50 pointer-events-none select-none flex items-center">
            {/* Mask gradients removed for full transparency as requested */}
            {/* <div className="absolute top-0 left-0 w-full h-[100px] bg-gradient-to-b from-black to-transparent z-10" /> */}
            {/* <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-black to-transparent z-10" /> */}

            <div className="relative w-full h-full flex flex-col items-start justify-center">
                <motion.div
                    animate={{ y: -currentSlide * ITEM_HEIGHT - ITEM_HEIGHT / 2 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }} // Snappy yet smooth wheel physics
                    className="absolute top-1/2 flex flex-col items-start"
                >
                    {slides.map((slide, index) => {
                        const isActive = currentSlide === index;
                        const distance = Math.abs(currentSlide - index);

                        return (
                            <motion.div
                                key={slide.id}
                                style={{ height: ITEM_HEIGHT }}
                                initial={false}
                                animate={{
                                    opacity: isActive ? 1 : Math.max(0.3, 0.7 - distance * 0.15), // increased visibility
                                    scale: isActive ? 1 : Math.max(0.8, 1 - distance * 0.1),
                                    x: isActive ? 40 : 0,
                                    filter: isActive ? 'blur(0px)' : `blur(${Math.min(5, distance * 1.5)}px)` // reduced blur
                                }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col justify-center origin-left min-w-[300px]"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm tracking-widest font-light ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="h-[1px] w-8 bg-white"
                                            transition={{ duration: 0.3 }}
                                        />
                                    )}
                                </div>
                                <span className={`text-lg font-light tracking-wide mt-1 transition-colors duration-300 font-['Presentation'] ${isActive ? 'text-white' : 'text-neutral-600'}`}>
                                    {slide.title}
                                </span>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Selection Indicator Line (iPhone style) - Optional or subtle */}
            {/* <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-32 bg-white/10 rounded-full" /> */}
        </div>
    );
}
