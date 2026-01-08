'use client';

import { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';

interface FileUploadAreaProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
  accept?: Accept;
  maxSize?: number;
}

export function FileUploadArea({
  onUpload,
  isUploading,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
  },
  maxSize = 10 * 1024 * 1024,
}: FileUploadAreaProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        mb-4 p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-[#e3e2e080] hover:border-[#37352f40]'}
        ${isDragReject ? 'border-red-500 bg-red-50' : ''}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 mb-3 rounded-full bg-[#f7f6f3] flex items-center justify-center">
          {isUploading ? (
            <svg
              className="w-6 h-6 text-[#37352f66] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-[#37352f66]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          )}
        </div>
        <p className="text-[14px] text-[#37352f] mb-1">
          {isUploading ? '업로드 중...' : '파일을 드래그하거나 클릭하여 업로드'}
        </p>
        <p className="text-[12px] text-[#37352f99]">
          이미지, PDF, Word, 텍스트 파일 지원 (최대 10MB)
        </p>
      </div>
    </div>
  );
}
