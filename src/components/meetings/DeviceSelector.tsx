import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mic, Video, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceSelectorProps {
  selectedMic: string;
  selectedCamera: string;
  onMicChange: (deviceId: string) => void;
  onCameraChange: (deviceId: string) => void;
  trigger?: React.ReactNode;
}

export const DeviceSelector = ({
  selectedMic,
  selectedCamera,
  onMicChange,
  onCameraChange,
  trigger
}: DeviceSelectorProps) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enumerateDevices();
  }, []);

  const enumerateDevices = async () => {
    try {
      // Request permission first
      // Note: In real flows, we might want to check permission state or avoid asking here if not needed
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'));

      // Set defaults if not selected
      if (!selectedMic && audioDevices.length > 0) {
        onMicChange(audioDevices[0].deviceId);
      }
      if (!selectedCamera && videoDevices.length > 0) {
        onCameraChange(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const Content = (
    <div className="grid gap-4 min-w-[300px]">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Audio & Video Settings</h4>
        <p className="text-sm text-muted-foreground">
          Choose your default microphone and camera.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label htmlFor="mic" className="flex items-center gap-2 text-xs">
              <Mic className="w-3.5 h-3.5" /> Microphone
            </Label>
            <select
              id="mic"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedMic}
              onChange={(e) => onMicChange(e.target.value)}
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
              {audioDevices.length === 0 && <option value="">No microphones found</option>}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="camera" className="flex items-center gap-2 text-xs">
              <Video className="w-3.5 h-3.5" /> Camera
            </Label>
            <select
              id="camera"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCamera}
              onChange={(e) => onCameraChange(e.target.value)}
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
              {videoDevices.length === 0 && <option value="">No cameras found</option>}
            </select>
          </div>
        </div>
      )}
    </div>
  );

  if (trigger) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          {Content}
        </PopoverContent>
      </Popover>
    );
  }

  return <div className="p-4 border rounded-lg bg-card/50">{Content}</div>;
};
