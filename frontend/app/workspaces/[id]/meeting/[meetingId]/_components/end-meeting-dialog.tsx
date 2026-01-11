'use client';

import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface EndMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (generateSummary: boolean) => void;
}

export function EndMeetingDialog({
  isOpen,
  onClose,
  onConfirm,
}: EndMeetingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#252525] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            회의 종료
          </DialogTitle>
          <DialogDescription className="text-white/60">
            회의를 종료하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-sm font-medium text-white mb-2">
              AI 회의 요약
            </h4>
            <p className="text-sm text-white/60">
              AWS Bedrock AI를 사용하여 회의 내용을 자동으로 요약합니다.
              회의 중 기록된 음성 자막을 바탕으로 주요 논의 사항, 결정 사항,
              액션 아이템 등을 정리합니다.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            요약 없이 종료
          </Button>
          <Button
            onClick={() => onConfirm(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            <FileText className="h-4 w-4 mr-2" />
            AI 요약 생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
