'use client';

interface MeetingHeaderProps {
  title: string;
  participantCount: number;
}

export function MeetingHeader({ title, participantCount }: MeetingHeaderProps) {
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-[#ffffff14]">
      <div className="flex items-center gap-4">
        <h1 className="text-[15px] font-medium text-[#ffffffcf]">{title}</h1>
        <span className="text-[13px] text-[#ffffff71]">
          {participantCount}명 참여 중
        </span>
      </div>
    </header>
  );
}
