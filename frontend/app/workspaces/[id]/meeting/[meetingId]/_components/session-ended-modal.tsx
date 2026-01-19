'use client';

import { AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { SessionEndedPayload } from '@/hooks/meeting';

interface SessionEndedModalProps {
  isOpen: boolean;
  payload: SessionEndedPayload | null;
  onConfirm: () => void;
}

export function SessionEndedModal({
  isOpen,
  payload,
  onConfirm,
}: SessionEndedModalProps) {
  if (!payload) return null;

  const getReasonMessage = (reason: string) => {
    switch (reason) {
      case 'host_ended':
        return payload.hostName
          ? `${payload.hostName}님이 회의를 종료했습니다.`
          : '호스트가 회의를 종료했습니다.';
      case 'timeout':
        return '회의 시간이 초과되어 종료되었습니다.';
      case 'error':
        return '오류로 인해 회의가 종료되었습니다.';
      default:
        return '회의가 종료되었습니다.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="bg-[#252525] border-white/10 text-white max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            회의 종료
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {getReasonMessage(payload.reason)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 회의 제목 표시 */}
          {payload.meetingTitle && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-sm font-medium text-white/60 mb-1">
                회의명
              </h4>
              <p className="text-base font-medium text-white">
                {payload.meetingTitle}
              </p>
            </div>
          )}

          {/* AI 요약 생성 안내 */}
          {payload.willGenerateSummary && (
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">
                    AI 요약 생성 중
                  </h4>
                  <p className="text-sm text-white/60">
                    회의 내용을 분석하여 AI 요약을 생성하고 있습니다.
                    완료되면 워크스페이스에서 확인하실 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!payload.willGenerateSummary && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/60 text-center">
                AI 요약 없이 회의가 종료되었습니다.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onConfirm}
            className="w-full bg-primary hover:bg-primary/90"
          >
            워크스페이스로 이동
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
