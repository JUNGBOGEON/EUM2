'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Workspace } from '../_lib/types';


interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
  onLeave: () => void;
  isSubmitting: boolean;
}

export function LeaveDialog({
  open,
  onOpenChange,
  workspace,
  onLeave,
  isSubmitting,
}: LeaveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>워크스페이스 나가기</AlertDialogTitle>
          <AlertDialogDescription>
            정말로{' '}
            <span className="font-semibold text-foreground">{workspace?.name}</span>{' '}
            워크스페이스에서 나가시겠습니까?
            <br />
            나가면 더 이상 이 워크스페이스에 접근할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeave}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? '처리 중...' : '나가기'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
  deleteConfirmName: string;
  onDeleteConfirmNameChange: (value: string) => void;
  onDelete: () => void;
  isSubmitting: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  workspace,
  deleteConfirmName,
  onDeleteConfirmNameChange,
  onDelete,
  isSubmitting,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">워크스페이스 삭제</DialogTitle>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다. 워크스페이스와 모든 데이터가 영구적으로 삭제됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm">
              삭제하려면{' '}
              <span className="font-semibold text-foreground">{workspace?.name}</span>
              을(를) 입력하세요
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmName}
              onChange={(e) => onDeleteConfirmNameChange(e.target.value)}
              placeholder="워크스페이스 이름 입력"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={deleteConfirmName !== workspace?.name || isSubmitting}
          >
            {isSubmitting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
