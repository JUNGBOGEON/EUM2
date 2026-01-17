'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  ListChecks,
  FileEdit,
} from 'lucide-react';

interface SummaryLoadingAnimationProps {
  transcriptCount?: number;
}

const STAGES = [
  {
    id: 'analyze',
    label: '자막 분석 중',
    description: '회의 내용을 분석하고 있습니다',
    icon: MessageSquare,
    duration: 3000,
  },
  {
    id: 'extract',
    label: '핵심 내용 추출 중',
    description: '중요한 논의 사항을 추출하고 있습니다',
    icon: ListChecks,
    duration: 4000,
  },
  {
    id: 'generate',
    label: 'AI 요약 생성 중',
    description: '요약 문서를 작성하고 있습니다',
    icon: Brain,
    duration: 5000,
  },
  {
    id: 'format',
    label: '문서 정리 중',
    description: '보기 좋게 포맷팅하고 있습니다',
    icon: FileEdit,
    duration: 3000,
  },
];

export function SummaryLoadingAnimation({
  transcriptCount = 0,
}: SummaryLoadingAnimationProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 단계별 진행
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 4000);

    // 프로그레스 바 애니메이션
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 95) {
          // 95%에서 멈춤 (완료 시 100%)
          return prev + Math.random() * 2;
        }
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const currentStageData = STAGES[currentStage];
  const StageIcon = currentStageData.icon;

  return (
    <div className="py-8 px-4">
      {/* 메인 애니메이션 영역 */}
      <div className="flex flex-col items-center mb-8">
        {/* 아이콘 애니메이션 */}
        <div className="relative mb-6">
          {/* 배경 원 - 펄스 애니메이션 */}
          <div className="absolute inset-0 w-20 h-20 bg-indigo-500/20 rounded-full animate-ping" />
          <div className="absolute inset-0 w-20 h-20 bg-indigo-500/10 rounded-full animate-pulse" />

          {/* 메인 아이콘 */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500/30 to-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <StageIcon className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>

          {/* Sparkles 장식 */}
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-bounce" />
          <Sparkles
            className="absolute -bottom-1 -left-1 w-4 h-4 text-yellow-400 animate-bounce"
            style={{ animationDelay: '0.3s' }}
          />
        </div>

        {/* 현재 단계 텍스트 */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-1">
            {currentStageData.label}
          </h3>
          <p className="text-sm text-neutral-400">
            {currentStageData.description}
          </p>
          {transcriptCount > 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              {transcriptCount}개의 발언을 처리하고 있습니다
            </p>
          )}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="max-w-xs mx-auto mb-6">
        <div className="flex justify-between text-xs text-neutral-500 mb-2">
          <span>진행률</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 단계 표시기 */}
      <div className="flex justify-center gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < currentStage;
          const isCurrent = idx === currentStage;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-300 border',
                isCompleted
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : isCurrent
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                    : 'bg-white/5 text-neutral-500 border-white/5'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline font-medium">{stage.label.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* 하단 안내 메시지 */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            <span
              className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <span
              className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
          <span className="text-xs text-neutral-400">
            AI가 회의 내용을 정리하고 있습니다. 잠시만 기다려주세요.
          </span>
        </div>
      </div>
    </div>
  );
}
