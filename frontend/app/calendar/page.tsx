'use client';

import { useRouter } from 'next/navigation';
import { Calendar, ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/workspaces')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">캘린더</h1>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Construction className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">준비 중입니다</h2>
          <p className="text-muted-foreground max-w-sm">
            캘린더 기능은 곧 제공될 예정입니다.
            회의 일정을 한눈에 확인하고 관리할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
