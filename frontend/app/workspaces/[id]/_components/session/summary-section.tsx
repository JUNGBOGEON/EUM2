'use client';

import { FileText, RefreshCw, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SummaryLoadingAnimation } from '../summary-loading-animation';
import type { SummaryData } from './hooks/use-session-data';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * JSON 형식의 content를 마크다운으로 변환
 * content가 JSON 문자열인 경우 sections를 추출해서 마크다운으로 합침
 */
function parseContentToMarkdown(content: string | null): string {
  if (!content) return '';
  
  // JSON인지 확인
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    // 일반 마크다운 텍스트
    return content;
  }
  
  try {
    const parsed = JSON.parse(content);
    
    // sections 배열이 있는 경우
    if (parsed.sections && Array.isArray(parsed.sections)) {
      return parsed.sections
        .map((section: { content?: string }) => section.content || '')
        .join('\n\n');
    }
    
    // markdown 필드가 있는 경우
    if (parsed.markdown) {
      return parsed.markdown;
    }
    
    // content 필드가 있는 경우
    if (parsed.content) {
      return parsed.content;
    }
    
    // 파싱했지만 알 수 없는 구조 - 원본 반환
    return content;
  } catch {
    // JSON 파싱 실패 - 일반 텍스트로 간주
    return content;
  }
}

interface SummarySectionProps {
  summaryData: SummaryData | null;
  transcriptCount: number;
  isLoading: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

export function SummarySection({
  summaryData,
  transcriptCount,
  isLoading,
  isRegenerating,
  onRegenerate,
}: SummarySectionProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="py-4 space-y-4">
        <Skeleton className="h-4 w-full bg-white/5" />
        <Skeleton className="h-4 w-full bg-white/5" />
        <Skeleton className="h-4 w-3/4 bg-white/5" />
      </div>
    );
  }

  if (summaryData?.status === 'completed' && summaryData.content) {
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">{t('summary.completed')}</span>
          </div>
          {!summaryData.structuredSummary && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {t('summary.regenerating')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('summary.regenerate_format')}
                </>
              )}
            </Button>
          )}
        </div>
        {!summaryData.structuredSummary && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4 text-sm text-neutral-400">
            {t('summary.legacy_notice')}
          </div>
        )}
        <div className="prose prose-sm max-w-none prose-invert prose-headings:text-neutral-200 prose-p:text-neutral-300 prose-li:text-neutral-300 prose-strong:text-indigo-400 prose-table:text-neutral-300 prose-th:text-neutral-400 prose-td:text-neutral-300 prose-th:border-white/10 prose-td:border-white/10 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border-collapse">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {summaryData.structuredSummary?.markdown || parseContentToMarkdown(summaryData.content)}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  if (summaryData?.status === 'processing' || summaryData?.status === 'pending') {
    return <SummaryLoadingAnimation transcriptCount={transcriptCount} />;
  }

  if (summaryData?.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4 ring-1 ring-red-500/20">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <p className="text-white font-medium">
          {t('summary.failed')}
        </p>
        <p className="text-sm text-neutral-500 mt-1">
          {t('summary.retry_desc')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 bg-white/5 border-white/10 text-white hover:bg-white/10"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('summary.regenerating')}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('summary.regenerate')}
            </>
          )}
        </Button>
      </div>
    );
  }

  if (summaryData?.status === 'skipped') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4 ring-1 ring-yellow-500/20">
          <AlertCircle className="h-7 w-7 text-yellow-500" />
        </div>
        <p className="text-white font-medium">
          {t('summary.skipped')}
        </p>
        <p className="text-sm text-neutral-500 mt-1">
          {t('summary.skipped_desc')}
        </p>
      </div>
    );
  }

  // Default: no summary
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
        <FileText className="h-7 w-7 text-neutral-500" />
      </div>
      <p className="text-neutral-400 font-medium">
        {t('summary.empty_title')}
      </p>
      <p className="text-sm text-neutral-600 mt-1">
        {t('summary.empty_desc')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 bg-white/5 border-white/10 text-white hover:bg-white/10"
        onClick={onRegenerate}
        disabled={isRegenerating}
      >
        {isRegenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('summary.creating')}
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            {t('summary.create')}
          </>
        )}
      </Button>
    </div>
  );
}
