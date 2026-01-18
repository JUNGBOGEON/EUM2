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
import type { WorkspaceFile } from '../../_lib/types';

interface RenameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: WorkspaceFile | null;
  newFileName: string;
  fileExtension: string;
  onFileNameChange: (name: string) => void;
  onConfirm: () => void;
}

export function RenameDialog({
  isOpen,
  onOpenChange,
  newFileName,
  fileExtension,
  onFileNameChange,
  onConfirm,
}: RenameDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>파일 이름 변경</DialogTitle>
          <DialogDescription className="text-neutral-400">
            새로운 파일 이름을 입력하세요. 확장자는 변경할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="filename" className="sr-only">
            파일 이름
          </Label>
          <div className="flex items-center gap-0">
            <Input
              id="filename"
              value={newFileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              placeholder="파일 이름"
              className={`bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white/20 ${fileExtension ? "rounded-r-none border-r-0" : ""}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirm();
                }
              }}
            />
            {fileExtension && (
              <div className="flex items-center px-3 h-9 bg-white/5 border border-white/10 border-l-0 rounded-r-md text-sm text-neutral-400 select-none">
                {fileExtension}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!newFileName.trim()}
            className="bg-white text-black hover:bg-neutral-200"
          >
            변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: WorkspaceFile | null;
  onConfirm: () => void;
}

export function DeleteDialog({
  isOpen,
  onOpenChange,
  file,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500">파일 삭제</AlertDialogTitle>
          <AlertDialogDescription className="text-neutral-400">
            <span className="text-white font-medium">{file?.filename}</span> 파일을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-500 text-white hover:bg-red-600 border-none"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
