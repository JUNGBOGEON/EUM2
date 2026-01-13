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
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (summaryData?.status === 'completed' && summaryData.content) {
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">{t('summary.completed')}</span>
          </div>
          {!summaryData.structuredSummary && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
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
          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
            {t('summary.legacy_notice')}
          </div>
        )}
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-table:text-foreground prose-th:text-foreground prose-td:text-foreground prose-th:border prose-td:border prose-th:border-border prose-td:border-border prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border-collapse">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {summaryData.content}
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
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <p className="text-foreground font-medium">
          {t('summary.failed')}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('summary.retry_desc')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
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
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7 text-yellow-500" />
        </div>
        <p className="text-foreground font-medium">
          {t('summary.skipped')}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('summary.skipped_desc')}
        </p>
      </div>
    );
  }

  // Default: no summary
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground font-medium">
        {t('summary.empty_title')}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {t('summary.empty_desc')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
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
