'use client';

import { Camera, Mic, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DeviceSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  devicesInitialized: boolean;
  videoDevices: MediaDeviceInfo[];
  audioInputDevices: MediaDeviceInfo[];
  selectedVideoDevice: string;
  selectedAudioDevice: string;
  onSelectDevices: () => Promise<void>;
  onChangeVideoDevice: (deviceId: string) => void;
  onChangeAudioDevice: (deviceId: string) => void;
}

export function DeviceSettingsDialog({
  isOpen,
  onClose,
  devicesInitialized,
  videoDevices,
  audioInputDevices,
  selectedVideoDevice,
  selectedAudioDevice,
  onSelectDevices,
  onChangeVideoDevice,
  onChangeAudioDevice,
}: DeviceSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#252525] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>장치 설정</DialogTitle>
          <DialogDescription className="text-white/60">
            카메라와 마이크 설정을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        {!devicesInitialized ? (
          // Permission not granted
          <div className="space-y-4 py-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-white/30" />
              </div>
              <p className="text-white/60 text-sm mb-4">
                카메라와 마이크 접근 권한이 필요합니다.
              </p>
              <Button
                onClick={onSelectDevices}
                className="bg-primary hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                권한 요청
              </Button>
            </div>
          </div>
        ) : (
          // Device selection
          <div className="space-y-6 py-4">
            {/* Camera Selection */}
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                카메라
              </Label>
              <Select
                value={selectedVideoDevice}
                onValueChange={onChangeVideoDevice}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="카메라 선택" />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  {videoDevices.length === 0 ? (
                    <SelectItem value="none" disabled className="text-white/50">
                      사용 가능한 카메라가 없습니다
                    </SelectItem>
                  ) : (
                    videoDevices.map((device) => (
                      <SelectItem
                        key={device.deviceId}
                        value={device.deviceId}
                        className="text-white hover:bg-white/10 focus:bg-white/10"
                      >
                        {device.label || `카메라 ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Microphone Selection */}
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Mic className="h-4 w-4" />
                마이크
              </Label>
              <Select
                value={selectedAudioDevice}
                onValueChange={onChangeAudioDevice}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="마이크 선택" />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  {audioInputDevices.length === 0 ? (
                    <SelectItem value="none" disabled className="text-white/50">
                      사용 가능한 마이크가 없습니다
                    </SelectItem>
                  ) : (
                    audioInputDevices.map((device) => (
                      <SelectItem
                        key={device.deviceId}
                        value={device.deviceId}
                        className="text-white hover:bg-white/10 focus:bg-white/10"
                      >
                        {device.label || `마이크 ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Devices */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectDevices}
                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                장치 새로고침
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
