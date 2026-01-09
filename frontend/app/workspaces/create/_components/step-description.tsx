'use client';

import { ArrowRight, ArrowLeft } from 'lucide-react';

interface StepDescriptionProps {
  description: string;
  setDescription: (description: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function StepDescription({
  description,
  setDescription,
  onNext,
  onBack,
  onSkip,
}: StepDescriptionProps) {
  return (
    <div className="h-full flex flex-col justify-center">
      {/* Step Number */}
      <div className="mb-6">
        <span className="text-xs font-medium text-muted-foreground/50 tracking-widest">
          STEP 02
        </span>
      </div>

      {/* Title */}
      <div className="mb-12">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          설명 추가
        </h1>
        <p className="text-muted-foreground/70 mt-2 text-sm">
          워크스페이스에 대해 설명해주세요
        </p>
      </div>

      {/* Content */}
      <div className="mb-12">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="이 워크스페이스는..."
          maxLength={500}
          rows={4}
          className="w-full text-base bg-muted/20 border-0 rounded-xl p-4 resize-none outline-none focus:bg-muted/30 placeholder:text-muted-foreground/40 transition-colors"
          autoFocus
        />
        <p className="text-[10px] text-muted-foreground/40 text-right mt-2">
          {description.length}/500
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <button
          onClick={onNext}
          className="group flex items-center justify-center gap-2 w-full h-12 bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          다음
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            이전
          </button>
          <button
            onClick={onSkip}
            className="flex-1 h-10 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}
