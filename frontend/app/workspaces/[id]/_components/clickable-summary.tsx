'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MessageSquareQuote } from 'lucide-react';
import type { SummarySection, TranscriptItem } from '../_lib/types';

interface ParsedItem {
  id: string;
  content: string;
  transcriptRefs: string[];
  type: 'heading' | 'list-item' | 'table-row' | 'paragraph';
  sectionType: SummarySection['type'];
}

interface ClickableSummaryProps {
  sections: SummarySection[];
  transcripts: TranscriptItem[];
}

// 마크다운 섹션을 개별 클릭 가능한 아이템으로 파싱
function parseSectionToItems(section: SummarySection): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = section.content.split('\n').filter((line) => line.trim());
  const refsPerItem = Math.ceil(section.transcriptRefs.length / Math.max(lines.length, 1));

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 참조 분배: 각 라인에 균등하게 참조 배정
    const startRef = idx * refsPerItem;
    const endRef = Math.min(startRef + refsPerItem, section.transcriptRefs.length);
    const itemRefs = section.transcriptRefs.slice(startRef, endRef);

    let type: ParsedItem['type'] = 'paragraph';
    if (trimmed.startsWith('#')) {
      type = 'heading';
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      type = 'list-item';
    } else if (trimmed.startsWith('|')) {
      type = 'table-row';
    }

    items.push({
      id: `${section.id}-item-${idx}`,
      content: trimmed,
      transcriptRefs: itemRefs,
      type,
      sectionType: section.type,
    });
  });

  return items;
}

// 참조된 대화 말풍선 컴포넌트
function TranscriptPopover({
  item,
  transcripts,
  children,
}: {
  item: ParsedItem;
  transcripts: TranscriptItem[];
  children: React.ReactNode;
}) {
  const referencedTranscripts = transcripts.filter((t) =>
    item.transcriptRefs.includes(t.resultId)
  );

  if (referencedTranscripts.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-80 overflow-auto p-0 bg-neutral-900 border-white/10 text-white"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="p-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <MessageSquareQuote className="h-4 w-4 text-indigo-400" />
            참조된 대화 ({referencedTranscripts.length}개)
          </div>
        </div>
        <div className="p-2 space-y-2">
          {referencedTranscripts.map((transcript) => (
            <div
              key={transcript.id}
              className="p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-neutral-300">
                    {(transcript.speaker?.name || '?')[0]}
                  </span>
                </div>
                <span className="text-sm font-medium text-indigo-300">
                  {transcript.speaker?.name || '참가자'}
                </span>
                {transcript.relativeStartSec !== undefined && (
                  <span className="text-xs text-neutral-500">
                    {Math.floor(transcript.relativeStartSec / 60)}:
                    {Math.floor(transcript.relativeStartSec % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                )}
              </div>
              <p className="text-sm pl-7 text-neutral-300">{transcript.originalText}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ClickableSummary({
  sections,
  transcripts,
}: ClickableSummaryProps) {
  // 모든 섹션을 개별 아이템으로 파싱
  const allItems = useMemo(() => {
    return sections.flatMap((section) => parseSectionToItems(section));
  }, [sections]);

  // 테이블 아이템들을 그룹화
  const groupedItems = useMemo(() => {
    const result: (ParsedItem | ParsedItem[])[] = [];
    let tableGroup: ParsedItem[] = [];

    allItems.forEach((item, idx) => {
      if (item.type === 'table-row') {
        tableGroup.push(item);
        // 다음 아이템이 테이블 행이 아니거나 마지막이면 그룹 종료
        const nextItem = allItems[idx + 1];
        if (!nextItem || nextItem.type !== 'table-row') {
          result.push([...tableGroup]);
          tableGroup = [];
        }
      } else {
        result.push(item);
      }
    });

    return result;
  }, [allItems]);

  const renderItem = (item: ParsedItem) => {
    const hasRefs = item.transcriptRefs.length > 0;

    // 헤딩은 클릭 불가능
    if (item.type === 'heading') {
      return (
        <div
          key={item.id}
          className="prose prose-sm max-w-none prose-invert prose-headings:text-white"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
        </div>
      );
    }

    const element = (
      <div
        className={cn(
          'rounded-md px-2 py-1 -mx-2 transition-all',
          hasRefs &&
          'cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/10'
        )}
      >
        <div className="prose prose-sm max-w-none prose-invert prose-headings:text-neutral-200 prose-p:text-neutral-300 prose-li:text-neutral-300 prose-p:my-0 prose-li:my-0 prose-strong:text-indigo-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
        </div>
        {hasRefs && (
          <span className="text-[10px] text-neutral-500 ml-1">
            💬 {item.transcriptRefs.length}
          </span>
        )}
      </div>
    );

    if (hasRefs) {
      return (
        <TranscriptPopover key={item.id} item={item} transcripts={transcripts}>
          {element}
        </TranscriptPopover>
      );
    }

    return <div key={item.id}>{element}</div>;
  };

  const renderTable = (tableItems: ParsedItem[]) => {
    // 첫 번째 행은 헤더
    const headerItem = tableItems[0];
    const bodyItems = tableItems.slice(2); // 구분선(---) 제외

    return (
      <div key={`table-${tableItems[0]?.id}`} className="my-2">
        <table className="w-full text-sm border-collapse border border-white/10">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {headerItem?.content
                .split('|')
                .filter((cell) => cell.trim())
                .map((cell, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 text-left font-medium text-neutral-300"
                  >
                    {cell.trim()}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {bodyItems.map((item) => {
              const hasRefs = item.transcriptRefs.length > 0;
              const cells = item.content.split('|').filter((cell) => cell.trim());

              const row = (
                <tr
                  className={cn(
                    'border-b border-white/10 transition-all text-neutral-300',
                    hasRefs && 'cursor-pointer hover:bg-white/5'
                  )}
                >
                  {cells.map((cell, idx) => (
                    <td key={idx} className="px-3 py-2">
                      {cell.trim()}
                    </td>
                  ))}
                  {hasRefs && (
                    <td className="px-2 py-2 text-[10px] text-neutral-500">
                      💬 {item.transcriptRefs.length}
                    </td>
                  )}
                </tr>
              );

              if (hasRefs) {
                return (
                  <TranscriptPopover
                    key={item.id}
                    item={item}
                    transcripts={transcripts}
                  >
                    {row}
                  </TranscriptPopover>
                );
              }

              return <tbody key={item.id}>{row}</tbody>;
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {groupedItems.map((itemOrGroup, idx) => {
        if (Array.isArray(itemOrGroup)) {
          return renderTable(itemOrGroup);
        }
        return renderItem(itemOrGroup);
      })}
    </div>
  );
}

export type { ParsedItem };
