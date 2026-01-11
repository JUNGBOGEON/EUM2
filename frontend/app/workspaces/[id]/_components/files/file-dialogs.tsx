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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>파일 이름 변경</DialogTitle>
          <DialogDescription>
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
              className={fileExtension ? "rounded-r-none border-r-0" : ""}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onConfirm();
                }
              }}
            />
            {fileExtension && (
              <div className="flex items-center px-3 h-9 bg-muted border border-input rounded-r-md text-sm text-muted-foreground select-none">
                {fileExtension}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onConfirm} disabled={!newFileName.trim()}>
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>파일 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{file?.filename}</strong> 파일을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
