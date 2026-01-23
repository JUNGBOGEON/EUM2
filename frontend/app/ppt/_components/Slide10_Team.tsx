'use client';

import { motion, Variants } from 'framer-motion';
import Image from 'next/image';

interface TeamMember {
    name: string;
    role: string;
    roleLabel: string;
    color: string;
    glowColor: string;
    image?: string; // 이미지 경로 (없으면 placeholder)
    imagePosition?: string; // 이미지 위치 조정
    isLeader?: boolean; // 팀장 여부
    colorTintOpacity?: number; // 색상 필터 강도 (기본 0.15)
}

const teamMembers: TeamMember[] = [
    {
        name: '위도훈',
        role: 'BACKEND',
        roleLabel: 'Backend',
        color: 'text-rose-400',
        glowColor: 'rgba(251, 113, 133, 0.4)',
        image: '/ppt/backend-1.png',
        imagePosition: 'object-[60%_10%]',
        colorTintOpacity: 0.05,
    },
    {
        name: '김가람',
        role: 'FRONTEND',
        roleLabel: 'Frontend',
        color: 'text-blue-400',
        glowColor: 'rgba(96, 165, 250, 0.4)',
        image: '/ppt/frontend-2.png',
        imagePosition: 'object-[60%_10%]',
    },
    {
        name: '정보건',
        role: 'AI / CI-CD',
        roleLabel: 'AI / CI-CD',
        color: 'text-emerald-400',
        glowColor: 'rgba(52, 211, 153, 0.4)',
        image: '/ppt/leader.png',
        imagePosition: 'object-[70%_30%]', // 오른쪽, 더 아래로
        isLeader: true,
        colorTintOpacity: 0.05,
    },
    {
        name: '성민혁',
        role: 'FRONTEND',
        roleLabel: 'Frontend',
        color: 'text-blue-400',
        glowColor: 'rgba(96, 165, 250, 0.4)',
        image: '/ppt/frontend-1.png',
        imagePosition: 'object-[50%_10%]',
    },
    {
        name: '김권희',
        role: 'BACKEND',
        roleLabel: 'Backend',
        color: 'text-rose-400',
        glowColor: 'rgba(251, 113, 133, 0.4)',
        image: '/ppt/backend-2.png',
        imagePosition: 'object-[40%_top]', // 약간 왼쪽
        colorTintOpacity: 0.05,
    },
];

export default function Slide10_Team() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.12,
                delayChildren: 0.3,
            },
        },
    };

    const memberVariants: Variants = {
        hidden: { opacity: 0, y: 60, scale: 0.9 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
        },
    };

    const headerVariants: Variants = {
        hidden: { opacity: 0, y: -40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 1, ease: "easeOut" }
        },
    };

    return (
        <div className="w-full h-full relative overflow-hidden">

            {/* Team Members - Full Screen */}
            <motion.div
                className="absolute inset-0 flex"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="w-full h-full flex">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={index}
                            variants={memberVariants}
                            className="relative flex-1 flex flex-col items-center justify-end overflow-hidden"
                        >
                            {/* Background Image - LoL Style */}
                            <div className="absolute inset-0 overflow-hidden">
                                {member.image ? (
                                    <>
                                        {/* Background base for areas not covered by image */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-neutral-950 to-neutral-900" />

                                        {/* Ambient glow behind image */}
                                        <motion.div
                                            className="absolute inset-0 opacity-40"
                                            style={{
                                                background: `radial-gradient(circle at 50% 30%, ${member.glowColor} 0%, transparent 60%)`
                                            }}
                                            animate={{
                                                opacity: [0.3, 0.5, 0.3],
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        />

                                        {/* The actual image */}
                                        <Image
                                            src={member.image}
                                            alt={member.name}
                                            fill
                                            className={`object-cover scale-110 ${member.imagePosition || 'object-top'}`}
                                            sizes="20vw"
                                        />
                                        {/* Dark gradient overlay from bottom */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                        {/* Color tint overlay */}
                                        <div
                                            className="absolute inset-0 mix-blend-color"
                                            style={{
                                                background: member.glowColor.replace('0.4', '1'),
                                                opacity: member.colorTintOpacity ?? 0.15
                                            }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* Rich abstract background for members without images */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-neutral-950 to-neutral-900/50" />

                                        {/* Animated gradient mesh */}
                                        <motion.div
                                            className="absolute inset-0 opacity-30"
                                            style={{
                                                background: `radial-gradient(circle at 50% 20%, ${member.glowColor} 0%, transparent 50%),
                                                             radial-gradient(circle at 80% 60%, ${member.glowColor.replace('0.4', '0.2')} 0%, transparent 40%),
                                                             radial-gradient(circle at 20% 80%, ${member.glowColor.replace('0.4', '0.15')} 0%, transparent 35%)`
                                            }}
                                            animate={{
                                                opacity: [0.3, 0.5, 0.3],
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                delay: index * 0.5
                                            }}
                                        />

                                        {/* Geometric pattern overlay */}
                                        <div
                                            className="absolute inset-0 opacity-[0.03]"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, ${member.glowColor} 20px, ${member.glowColor} 21px),
                                                                 repeating-linear-gradient(-45deg, transparent, transparent 20px, ${member.glowColor} 20px, ${member.glowColor} 21px)`
                                            }}
                                        />

                                        {/* Particle effects */}
                                        {[...Array(8)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-1 h-1 rounded-full"
                                                style={{
                                                    background: member.glowColor,
                                                    left: `${20 + (i % 3) * 30}%`,
                                                    top: `${10 + (i % 4) * 25}%`,
                                                }}
                                                animate={{
                                                    y: [0, -30, 0],
                                                    opacity: [0.2, 0.6, 0.2],
                                                    scale: [1, 1.5, 1],
                                                }}
                                                transition={{
                                                    duration: 3 + i * 0.3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: i * 0.4 + index * 0.2,
                                                }}
                                            />
                                        ))}

                                        {/* Vertical light streak */}
                                        <motion.div
                                            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-full opacity-20"
                                            style={{
                                                background: `linear-gradient(to bottom, transparent 0%, ${member.glowColor} 40%, ${member.glowColor} 60%, transparent 100%)`
                                            }}
                                            animate={{
                                                opacity: [0.1, 0.3, 0.1],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                delay: index * 0.3
                                            }}
                                        />

                                        {/* Circular gradient accent */}
                                        <motion.div
                                            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-20"
                                            style={{
                                                background: `radial-gradient(circle, ${member.glowColor} 0%, transparent 70%)`
                                            }}
                                            animate={{
                                                scale: [0.8, 1.2, 0.8],
                                                opacity: [0.15, 0.25, 0.15],
                                            }}
                                            transition={{
                                                duration: 5,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                delay: index * 0.4
                                            }}
                                        />
                                    </>
                                )}
                            </div>

                            {/* Enhanced Glow Effects */}

                            {/* Bottom Glow Effect */}
                            <motion.div
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[40%] rounded-full blur-[60px] opacity-50 pointer-events-none"
                                style={{ background: `radial-gradient(ellipse, ${member.glowColor} 0%, transparent 70%)` }}
                            />

                            {/* Edge lighting - left side */}
                            <div
                                className="absolute left-0 top-[20%] bottom-[20%] w-[2px] opacity-30"
                                style={{
                                    background: `linear-gradient(to bottom, transparent 0%, ${member.glowColor} 50%, transparent 100%)`
                                }}
                            />

                            {/* Edge lighting - right side */}
                            <div
                                className="absolute right-0 top-[20%] bottom-[20%] w-[2px] opacity-30"
                                style={{
                                    background: `linear-gradient(to bottom, transparent 0%, ${member.glowColor} 50%, transparent 100%)`
                                }}
                            />

                            {/* Top accent glow */}
                            <motion.div
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[30%] rounded-full blur-[40px] opacity-15 pointer-events-none"
                                style={{ background: `radial-gradient(ellipse, ${member.glowColor} 0%, transparent 70%)` }}
                                animate={{
                                    opacity: [0.1, 0.15, 0.1],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: index * 0.3
                                }}
                            />

                            {/* Divider Lines */}
                            {index < teamMembers.length - 1 && (
                                <div className="absolute right-0 top-[15%] bottom-[15%] w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent z-20" />
                            )}

                            {/* Leader Enhancement - Subtle Premium */}
                            {member.isLeader && (
                                <motion.div
                                    className="absolute inset-0 pointer-events-none z-5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {/* Subtle elevated border glow - top */}
                                    <motion.div
                                        className="absolute top-0 left-0 right-0 h-[1px]"
                                        style={{
                                            background: 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)'
                                        }}
                                        animate={{
                                            opacity: [0.3, 0.6, 0.3],
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                    {/* Subtle elevated border glow - bottom */}
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 h-[1px]"
                                        style={{
                                            background: 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)'
                                        }}
                                        animate={{
                                            opacity: [0.3, 0.6, 0.3],
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            delay: 2,
                                        }}
                                    />
                                    {/* Minimal ambient enhancement */}
                                    <motion.div
                                        className="absolute inset-0 opacity-0"
                                        style={{
                                            background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 60%)'
                                        }}
                                        animate={{
                                            opacity: [0, 0.15, 0],
                                        }}
                                        transition={{
                                            duration: 5,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                </motion.div>
                            )}

                            {/* Content - Bottom Aligned */}
                            <div className="relative z-10 flex flex-col items-center pb-12 md:pb-16 lg:pb-20 px-2">
                                {/* Subtle Leader Indicator - Minimalist Line */}
                                {member.isLeader && (
                                    <motion.div
                                        className="mb-4 flex flex-col items-center gap-2"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                    >
                                        {/* Premium double-line accent */}
                                        <div className="flex gap-[3px]">
                                            <motion.div
                                                className="w-6 md:w-8 h-[1.5px] bg-white/80"
                                                animate={{
                                                    opacity: [0.6, 1, 0.6],
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                            />
                                            <motion.div
                                                className="w-6 md:w-8 h-[1.5px] bg-white/80"
                                                animate={{
                                                    opacity: [0.6, 1, 0.6],
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: 1.5,
                                                }}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {/* Name */}
                                <motion.h3
                                    className={`text-2xl md:text-3xl lg:text-4xl font-['Aggravo'] font-bold mb-2 text-center drop-shadow-lg ${member.isLeader ? 'text-white/95' : 'text-white'}`}
                                >
                                    {member.name}
                                </motion.h3>

                                {/* Subtle Leader Text - Small & Refined */}
                                {member.isLeader && (
                                    <motion.div
                                        className="mb-2"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.7, duration: 0.8 }}
                                    >
                                        <span className="text-lg md:text-2xl font-['Presentation'] font-[400] tracking-[0.3em] text-white/40 uppercase">
                                            [ 팀장 ]
                                        </span>
                                    </motion.div>
                                )}

                                {/* Role Label */}
                                <span className={`
                                    text-lg md:text-xl lg:text-2xl
                                    ${member.color}
                                    font-['Presentation'] font-[600]
                                    tracking-[0.15em] md:tracking-[0.2em]
                                    uppercase
                                    drop-shadow-lg
                                `}>
                                    {member.roleLabel}
                                </span>

                                {/* Bottom Accent Line */}
                                <motion.div
                                    className={`
                                        mt-4 h-[2px] w-12 md:w-16
                                        ${member.color.replace('text-', 'bg-')}
                                    `}
                                    style={member.isLeader ? {
                                        boxShadow: `0 0 8px ${member.glowColor.replace('0.4', '0.6')}`
                                    } : undefined}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Header - Overlay on top */}
            <motion.div
                className="absolute top-8 md:top-12 left-0 right-0 z-30 flex flex-col items-center pointer-events-none"
                variants={headerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex items-center gap-4 md:gap-6 mb-3 md:mb-4">
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent w-[60px] md:w-[150px]" />
                    <span className="text-lg md:text-xl font-[300] font-['Presentation'] uppercase tracking-[0.4em] md:tracking-[0.5em] text-white/60">
                        TEAM
                    </span>
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent w-[60px] md:w-[150px]" />
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-[900] font-['IncheonEducation'] text-white tracking-tight drop-shadow-2xl">
                    TEAM 이음
                </h1>
            </motion.div>

        </div>
    );
}
