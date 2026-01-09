'use client';

interface DeviceSettingsModalProps {
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

export function DeviceSettingsModal({
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
}: DeviceSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252525] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-medium text-[#ffffffcf]">장치 설정</h2>
          <button onClick={onClose} className="text-[#ffffff71] hover:text-white">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {!devicesInitialized ? (
          <div className="text-center py-8">
            <p className="text-[14px] text-[#ffffff71] mb-4">
              장치를 사용하려면 먼저 권한을 허용해야 합니다.
            </p>
            <button
              onClick={onSelectDevices}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[14px] rounded-lg transition-colors"
            >
              권한 허용하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Camera Selection */}
            <div>
              <label className="block text-[13px] text-[#ffffff71] mb-2">
                카메라
              </label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => onChangeVideoDevice(e.target.value)}
                className="w-full bg-[#191919] border border-[#ffffff14] rounded-lg px-3 py-2 text-[14px] text-[#ffffffcf] focus:outline-none focus:border-[#ffffff29]"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `카메라 ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Selection */}
            <div>
              <label className="block text-[13px] text-[#ffffff71] mb-2">
                마이크
              </label>
              <select
                value={selectedAudioDevice}
                onChange={(e) => onChangeAudioDevice(e.target.value)}
                className="w-full bg-[#191919] border border-[#ffffff14] rounded-lg px-3 py-2 text-[14px] text-[#ffffffcf] focus:outline-none focus:border-[#ffffff29]"
              >
                {audioInputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `마이크 ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2 bg-[#ffffff14] hover:bg-[#ffffff29] text-white text-[14px] rounded-lg transition-colors"
            >
              완료
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
