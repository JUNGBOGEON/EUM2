'use client';

import { useCallback } from 'react';
import { useWorkspaceFiles } from '@/hooks/workspace/useWorkspaceFiles';
import { FileUploadArea } from './FileUploadArea';
import type { WorkspaceFile, WorkspaceFileType } from './types';

interface WorkspaceStorageProps {
  workspaceId: string;
}

type FilterTab = 'all' | WorkspaceFileType;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'image', label: '이미지' },
  { key: 'document', label: '문서' },
  { key: 'summary', label: 'AI 요약' },
];

export function WorkspaceStorage({ workspaceId }: WorkspaceStorageProps) {
  const {
    files,
    total,
    isLoading,
    error,
    hasMore,
    selectedType,
    setSelectedType,
    loadMore,
    uploadFile,
    deleteFile,
    getDownloadUrl,
    isUploading,
  } = useWorkspaceFiles(workspaceId);

  const handleUpload = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
          await uploadFile(file);
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
    },
    [uploadFile]
  );

  const handleDownload = useCallback(
    async (fileId: string) => {
      try {
        const url = await getDownloadUrl(fileId);
        window.open(url, '_blank');
      } catch (err) {
        console.error('Download failed:', err);
      }
    },
    [getDownloadUrl]
  );

  const handleDelete = useCallback(
    async (fileId: string) => {
      if (confirm('이 파일을 삭제하시겠습니까?')) {
        try {
          await deleteFile(fileId);
        } catch (err) {
          console.error('Delete failed:', err);
        }
      }
    },
    [deleteFile]
  );

  return (
    <div className="mx-6 mt-8 pb-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-[#37352f] flex items-center gap-2">
          <svg
            className="w-5 h-5 text-[#37352f99]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          파일 저장소
        </h2>
        <span className="text-[13px] text-[#37352f99]">{total}개 파일</span>
      </div>

      {/* 업로드 영역 */}
      <FileUploadArea onUpload={handleUpload} isUploading={isUploading} />

      {/* 필터 탭 */}
      <div className="flex gap-1 p-1 bg-[#f7f6f3] rounded-lg mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-md transition-all ${
              selectedType === tab.key
                ? 'bg-white text-[#37352f] shadow-sm'
                : 'text-[#37352f99] hover:text-[#37352f]'
            }`}
          >
            <FilterIcon type={tab.key} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-[13px] rounded-lg">
          {error}
        </div>
      )}

      {/* 파일 목록 */}
      <div className="bg-white rounded-xl border border-[#e3e2e080]">
        {!isLoading && files.length === 0 ? (
          <EmptyState selectedType={selectedType} />
        ) : (
          <div className="divide-y divide-[#e3e2e080]">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                onDownload={() => handleDownload(file.id)}
                onDelete={() => handleDelete(file.id)}
              />
            ))}

            {/* 더 보기 */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-4 py-2 text-[13px] text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? '로딩 중...' : '더 보기'}
                </button>
              </div>
            )}

            {/* 로딩 표시 */}
            {isLoading && files.length === 0 && (
              <div className="p-8 text-center">
                <svg
                  className="w-8 h-8 mx-auto text-[#37352f66] animate-spin"
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 서브 컴포넌트 =====

function FilterIcon({ type }: { type: FilterTab }) {
  switch (type) {
    case 'all':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      );
    case 'image':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'document':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'summary':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      );
  }
}

function EmptyState({ selectedType }: { selectedType: FilterTab }) {
  const getMessage = () => {
    switch (selectedType) {
      case 'image':
        return { title: '이미지가 없습니다', subtitle: '이미지 파일을 업로드해보세요' };
      case 'document':
        return { title: '문서가 없습니다', subtitle: '문서 파일을 업로드해보세요' };
      case 'summary':
        return {
          title: 'AI 요약이 없습니다',
          subtitle: '회의 종료 후 자동으로 AI 요약이 생성됩니다',
        };
      default:
        return {
          title: '파일이 없습니다',
          subtitle: '파일을 업로드하거나 AI 요약이 생성되면 여기에 표시됩니다',
        };
    }
  };

  const message = getMessage();

  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-[#f7f6f3] flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-[#37352f66]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-[15px] text-[#37352f99] mb-1">{message.title}</p>
      <p className="text-[13px] text-[#37352f66]">{message.subtitle}</p>
    </div>
  );
}

const FILE_TYPE_ICONS: Record<WorkspaceFileType, { icon: React.ReactNode; bgColor: string }> = {
  image: {
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    bgColor: 'bg-purple-100',
  },
  document: {
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    bgColor: 'bg-blue-100',
  },
  summary: {
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    bgColor: 'bg-green-100',
  },
};

function FileItem({
  file,
  onDownload,
  onDelete,
}: {
  file: WorkspaceFile;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const typeConfig = FILE_TYPE_ICONS[file.fileType];

  return (
    <div className="p-4 hover:bg-[#f7f6f3] transition-colors group">
      <div className="flex items-center gap-3">
        {/* 파일 타입 아이콘 */}
        <div
          className={`w-10 h-10 rounded-lg ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}
        >
          {typeConfig.icon}
        </div>

        {/* 파일 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[14px] font-medium text-[#37352f] truncate">
              {file.filename}
            </h4>
            {file.fileType === 'summary' && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-600 rounded-full">
                AI 요약
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#37352f99]">
            <span>{formatFileSize(file.size)}</span>
            <span>·</span>
            <span>{formatDate(file.createdAt)}</span>
            {file.uploader && (
              <>
                <span>·</span>
                <span>{file.uploader.name}</span>
              </>
            )}
            {file.session?.title && (
              <>
                <span>·</span>
                <span className="truncate">{file.session.title}</span>
              </>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onDownload}
            className="p-2 rounded-lg hover:bg-white text-[#37352f99] hover:text-[#37352f]"
            title="다운로드"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-[#37352f99] hover:text-red-600"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
