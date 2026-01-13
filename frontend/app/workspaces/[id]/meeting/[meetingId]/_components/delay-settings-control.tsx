'use client';

import { useState } from 'react';
import {
  Clock,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

interface DelaySettingsControlProps {
  delayEnabled: boolean;
  delayMs: number;
  isLoading?: boolean;
  onToggleDelay: () => void;
  onDelayMsChange: (ms: number) => void;
}

const PRESET_DELAYS = [
  { label: '1초', value: 1000 },
  { label: '1.5초', value: 1500 },
  { label: '2초', value: 2000 },
  { label: '3초', value: 3000 },
];

/**
 * DelaySettingsControl - 미디어 딜레이 설정 컨트롤
 *
 * 원격 참가자의 영상/음성에 딜레이를 적용하여
 * 자막 싱크를 맞추는 기능을 제어합니다.
 */
export function DelaySettingsControl({
  delayEnabled,
  delayMs,
  isLoading = false,
  onToggleDelay,
  onDelayMsChange,
}: DelaySettingsControlProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatDelay = (ms: number) => {
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}초`;
  };

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`h-12 px-3 rounded-full transition-colors gap-1.5 ${
                delayEnabled
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">딜레이</span>
              {delayEnabled && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                  {formatDelay(delayMs)}
                </span>
              )}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>자막 싱크 딜레이 설정</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        className="w-72 bg-[#252525] border-white/10 p-4"
        align="center"
        side="top"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white font-medium">자막 싱크 딜레이</span>
          </div>
          <Switch
            checked={delayEnabled}
            onCheckedChange={onToggleDelay}
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <p className="text-xs text-white/50 mb-4">
          영상에만 딜레이를 적용하여 번역 자막과 싱크를 맞춥니다. (음성은 실시간)
        </p>

        {delayEnabled && (
          <>
            {/* Preset Buttons */}
            <div className="flex gap-2 mb-4">
              {PRESET_DELAYS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelayMsChange(preset.value)}
                  className={`flex-1 h-8 text-xs ${
                    delayMs === preset.value
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">커스텀 딜레이</span>
                <span className="text-xs text-white/60 font-mono">
                  {formatDelay(delayMs)}
                </span>
              </div>
              <Slider
                value={[delayMs]}
                onValueChange={([v]: number[]) => onDelayMsChange(v)}
                min={500}
                max={5000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>0.5초</span>
                <span>5초</span>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
