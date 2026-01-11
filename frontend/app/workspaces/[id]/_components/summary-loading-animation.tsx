'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
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
          <div className="absolute inset-0 w-20 h-20 bg-primary/20 rounded-full animate-ping" />
          <div className="absolute inset-0 w-20 h-20 bg-primary/10 rounded-full animate-pulse" />

          {/* 메인 아이콘 */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center border border-primary/30">
            <StageIcon className="w-8 h-8 text-primary animate-pulse" />
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
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {currentStageData.label}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentStageData.description}
          </p>
          {transcriptCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {transcriptCount}개의 발언을 처리하고 있습니다
            </p>
          )}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="max-w-xs mx-auto mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>진행률</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-300',
                isCompleted && 'bg-green-500/20 text-green-500',
                isCurrent && 'bg-primary/20 text-primary animate-pulse',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{stage.label.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* 하단 안내 메시지 */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <span
              className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <span
              className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            AI가 회의 내용을 정리하고 있습니다. 잠시만 기다려주세요.
          </span>
        </div>
      </div>
    </div>
  );
}
