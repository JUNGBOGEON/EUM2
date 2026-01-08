'use client';

import { forwardRef, useCallback, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

// 마크다운 요약에서 구조화된 데이터 추출
interface ParsedSummary {
  title: string;
  keyPoints: string[];
  discussions: string[];
  decisions: string[];
  actionItems: ActionItem[];
  notes: string[];
}

interface ActionItem {
  assignee: string;
  task: string;
  deadline: string;
}

function parseSummaryMarkdown(markdown: string): ParsedSummary {
  const result: ParsedSummary = {
    title: '',
    keyPoints: [],
    discussions: [],
    decisions: [],
    actionItems: [],
    notes: [],
  };

  const lines = markdown.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // 제목 추출 (# 으로 시작)
    if (trimmed.startsWith('# ') && !result.title) {
      result.title = trimmed.replace(/^#\s+/, '');
      continue;
    }

    // 섹션 감지
    if (trimmed.includes('3줄 요약') || trimmed.includes('요약')) {
      currentSection = 'keyPoints';
      continue;
    }
    if (trimmed.includes('논의 안건') || trimmed.includes('논의')) {
      currentSection = 'discussions';
      continue;
    }
    if (trimmed.includes('결정 사항') || trimmed.includes('Decision')) {
      currentSection = 'decisions';
      continue;
    }
    if (trimmed.includes('액션 아이템') || trimmed.includes('Action Item')) {
      currentSection = 'actionItems';
      continue;
    }
    if (trimmed.includes('메모') || trimmed.includes('기술적')) {
      currentSection = 'notes';
      continue;
    }

    // 테이블 행 처리 (액션 아이템)
    if (currentSection === 'actionItems' && trimmed.startsWith('|') && !trimmed.includes('---')) {
      const cells = trimmed.split('|').filter(c => c.trim());
      if (cells.length >= 2 && !cells[0].includes('담당자')) {
        result.actionItems.push({
          assignee: cells[0]?.trim() || '',
          task: cells[1]?.trim() || '',
          deadline: cells[2]?.trim() || '미정',
        });
      }
      continue;
    }

    // 리스트 아이템 처리
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-*]\s+/, '');
      if (content && !content.startsWith('(')) {
        switch (currentSection) {
          case 'keyPoints':
            result.keyPoints.push(content);
            break;
          case 'discussions':
            result.discussions.push(content);
            break;
          case 'decisions':
            result.decisions.push(content);
            break;
          case 'notes':
            result.notes.push(content);
            break;
        }
      }
    }
  }

  return result;
}

// 날짜 포맷
function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface SummaryCardProps {
  content: string;
  sessionTitle?: string;
  sessionDate?: string;
  participantCount?: number;
  duration?: string;
}

// 색상 상수 (html2canvas 호환을 위해 hex 사용)
const COLORS = {
  background: '#f8fafc',
  backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
  white: '#ffffff',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  indigo600: '#4f46e5',
  green500: '#22c55e',
  amber400: '#fbbf24',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  blueBorder: 'rgba(219, 234, 254, 0.5)',
  greenBorder: 'rgba(220, 252, 231, 0.5)',
  amberBorder: 'rgba(254, 243, 199, 0.5)',
};

// 이미지 캡처용 카드 컴포넌트 (인라인 스타일로 html2canvas 호환)
const SummaryCardContent = forwardRef<HTMLDivElement, SummaryCardProps>(
  ({ content, sessionTitle, sessionDate, participantCount, duration }, ref) => {
    const parsed = parseSummaryMarkdown(content);
    const displayTitle = parsed.title || sessionTitle || '회의 요약';
    const displayDate = sessionDate
      ? new Date(sessionDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : formatDate(new Date());

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          background: COLORS.backgroundGradient,
          padding: 32,
          fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif",
        }}
      >
        {/* 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${COLORS.blue500} 0%, ${COLORS.indigo600} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.blue600, letterSpacing: '0.05em' }}>
              MEETING SUMMARY
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.slate800, lineHeight: 1.3, marginBottom: 8 }}>
            {displayTitle}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: COLORS.slate500 }}>
            <span>{displayDate}</span>
            {participantCount && (
              <>
                <span>•</span>
                <span>{participantCount}명 참석</span>
              </>
            )}
            {duration && (
              <>
                <span>•</span>
                <span>{duration}</span>
              </>
            )}
          </div>
        </div>

        {/* 3줄 요약 */}
        {parsed.keyPoints.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.slate700 }}>핵심 요약</h2>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${COLORS.blueBorder}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {parsed.keyPoints.slice(0, 3).map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: idx < 2 ? 8 : 0 }}>
                  <span style={{ color: COLORS.blue500, marginTop: 2 }}>•</span>
                  <span style={{ fontSize: 14, color: COLORS.slate700 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 결정 사항 */}
        {parsed.decisions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.slate700 }}>결정 사항</h2>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${COLORS.greenBorder}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {parsed.decisions.map((decision, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: idx < parsed.decisions.length - 1 ? 8 : 0 }}>
                  <span style={{ color: COLORS.green500, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 14, color: COLORS.slate700 }}>{decision}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 액션 아이템 */}
        {parsed.actionItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.slate700 }}>Action Items</h2>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${COLORS.amberBorder}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {parsed.actionItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: idx < parsed.actionItems.length - 1 ? 12 : 0 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: `2px solid ${COLORS.amber400}`,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: COLORS.slate700, marginBottom: 4 }}>{item.task}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          padding: '2px 8px',
                          backgroundColor: COLORS.slate100,
                          color: COLORS.slate600,
                          borderRadius: 9999,
                        }}
                      >
                        {item.assignee}
                      </span>
                      {item.deadline !== '미정' && (
                        <span style={{ fontSize: 12, color: COLORS.slate500 }}>
                          📅 {item.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: `1px solid ${COLORS.slate200}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${COLORS.blue500} 0%, ${COLORS.indigo600} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>EUM</span>
            </div>
            <span style={{ fontSize: 10, color: COLORS.slate400 }}>Powered by Claude AI</span>
          </div>
          <span style={{ fontSize: 10, color: COLORS.slate400 }}>
            Generated on {formatDate(new Date())}
          </span>
        </div>
      </div>
    );
  }
);

SummaryCardContent.displayName = 'SummaryCardContent';

// 메인 export 컴포넌트 - 이미지 저장 기능 포함
export function SummaryCard({
  content,
  sessionTitle,
  sessionDate,
  participantCount,
  duration,
}: SummaryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const handleExportImage = useCallback(async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // 고해상도
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      // Blob으로 변환
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
      });

      // 다운로드
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `회의요약_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export image:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      alert('이미지가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('클립보드 복사에 실패했습니다. 다운로드를 이용해주세요.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* 버튼 그룹 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCard(!showCard)}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {showCard ? '카드 숨기기' : '이미지 카드 보기'}
        </button>

        {showCard && (
          <>
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isExporting ? '저장 중...' : '이미지 저장'}
            </button>

            <button
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              클립보드 복사
            </button>
          </>
        )}
      </div>

      {/* 카드 프리뷰 */}
      {showCard && (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="inline-block rounded-2xl shadow-lg overflow-hidden">
            <SummaryCardContent
              ref={cardRef}
              content={content}
              sessionTitle={sessionTitle}
              sessionDate={sessionDate}
              participantCount={participantCount}
              duration={duration}
            />
          </div>
        </div>
      )}
    </div>
  );
}
