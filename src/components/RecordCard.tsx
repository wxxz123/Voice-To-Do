import { useState, useEffect, useRef } from "react";
import { Mic, Square, Play, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecordCardProps {
  onStartRecord: () => void;
  onPauseRecord: () => void;
  onResumeRecord: () => void;
  onStopRecord: () => void;
  onDeleteRecord: () => void;
  onCompleteRecord: (blob: Blob) => void;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

const MAX_RECORDING_TIME = 180; // 3 minutes in seconds

export const RecordCard = ({
  onStartRecord,
  onPauseRecord,
  onResumeRecord,
  onStopRecord,
  onDeleteRecord,
  onCompleteRecord,
}: RecordCardProps) => {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [timeLeft, setTimeLeft] = useState(MAX_RECORDING_TIME);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [blobSize, setBlobSize] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        return;
      }

      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === "https:" || 
                      window.location.hostname === "localhost" ||
                      window.location.hostname === "127.0.0.1";
      
      if (!isSecure) {
        setHasPermission(false);
        return;
      }

      setHasPermission(true);
    };

    checkPermission();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current + pausedTimeRef.current) / 1000);
      const remaining = MAX_RECORDING_TIME - elapsed;

      if (remaining <= 0) {
        handleStop();
      } else {
        setTimeLeft(remaining);
      }
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Clean up blob URL
  const cleanupBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  // Clean up media stream
  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  const handleStart = async () => {
    if (!hasPermission) {
      toast.error("无法访问麦克风", {
        description: "请确保使用 HTTPS 连接并授予麦克风权限",
      });
      return;
    }

    try {
      // Clean up any existing resources
      cleanupBlobUrl();
      cleanupStream();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      
      // Try different MIME types in order of preference
      const mimeTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { 
            type: selectedMimeType || 'audio/webm' 
          });
          
          if (blob.size > 0) {
            setRecordedBlob(blob);
            setBlobSize(blob.size);
          } else {
            console.warn("录音数据为空");
            toast.warning("录音数据为空，请重试");
          }
        } catch (error) {
          console.error("创建录音 Blob 时出错:", error);
          toast.error("录音处理失败", {
            description: "请重试录音",
          });
        } finally {
          cleanupStream();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder 错误:", event);
        toast.error("录音过程中出现错误", {
          description: "请重试录音",
        });
        cleanupStream();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;

      setRecordingState("recording");
      pausedTimeRef.current = 0;
      startTimer();
      onStartRecord();

      toast.success("开始录音");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      cleanupStream();
      toast.error("无法访问麦克风", {
        description: "请检查麦克风权限设置",
      });
      setHasPermission(false);
    }
  };

  const handlePause = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      pausedTimeRef.current += Date.now() - startTimeRef.current;
      setRecordingState("paused");
      onPauseRecord();
      toast.info("录音已暂停");
    }
  };

  const handleResume = () => {
    if (mediaRecorderRef.current && recordingState === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      startTimer();
      onResumeRecord();
      toast.info("继续录音");
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      stopTimer();
      setRecordingState("stopped");
      onStopRecord();
      toast.success("录音完成");
    }
  };

  const handleDelete = () => {
    // Clean up resources
    cleanupBlobUrl();
    cleanupStream();
    
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    // Reset state
    setRecordedBlob(null);
    setBlobSize(0);
    setTimeLeft(MAX_RECORDING_TIME);
    setRecordingState("idle");
    pausedTimeRef.current = 0;
    chunksRef.current = [];
    stopTimer();
    
    onDeleteRecord();
    toast.info("录音已删除");
  };

  const handleComplete = () => {
    if (recordedBlob) {
      try {
        // Create a copy of the blob to avoid potential issues
        const blobCopy = new Blob([recordedBlob], { type: recordedBlob.type });
        onCompleteRecord(blobCopy);
        toast.success("开始上传并转写");
        
        // Clean up after successful completion
        cleanupBlobUrl();
      } catch (error) {
        console.error("处理录音完成时出错:", error);
        toast.error("处理录音失败", {
          description: "请重试",
        });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      cleanupBlobUrl();
      cleanupStream();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.warn("停止录音时出错:", error);
        }
      }
    };
  }, []);

  if (hasPermission === false) {
    return (
      <div className="ios-card p-8 animate-fade-up">
        <Alert variant="destructive" className="border-2 rounded-2xl">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-body">
            无法访问麦克风。请确保：
            <ul className="mt-2 ml-4 space-y-1 text-body-sm">
              <li>• 使用 HTTPS 连接访问本站</li>
              <li>• 已授予浏览器麦克风权限</li>
              <li>• 麦克风设备正常工作</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="ios-card p-8 space-y-6 animate-fade-up">
      {/* Timer Display */}
      <div className="text-center space-y-2">
        <div className="text-display-lg font-bold tabular-nums">
          {formatTime(timeLeft)}
        </div>
        <p className="text-body-sm text-muted-foreground">
          {recordingState === "idle" && "点击按钮开始录制"}
          {recordingState === "recording" && "正在录音中..."}
          {recordingState === "paused" && "录音已暂停"}
          {recordingState === "stopped" && "录音已完成"}
        </p>
      </div>

      {/* Main Recording Button */}
      <div className="flex justify-center">
        {recordingState === "idle" && (
          <Button
            onClick={handleStart}
            size="lg"
            className="w-32 h-32 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-2xl hover:shadow-accent/50 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="开始录音"
          >
            <Mic className="w-12 h-12" />
          </Button>
        )}

        {recordingState === "recording" && (
          <Button
            onClick={handlePause}
            size="lg"
            className="w-32 h-32 rounded-full bg-warning hover:bg-warning/90 text-warning-foreground shadow-2xl hover:shadow-warning/50 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="暂停录音"
          >
            <Square className="w-12 h-12" />
          </Button>
        )}

        {recordingState === "paused" && (
          <Button
            onClick={handleResume}
            size="lg"
            className="w-32 h-32 rounded-full bg-success hover:bg-success/90 text-success-foreground shadow-2xl hover:shadow-success/50 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="继续录音"
          >
            <Play className="w-12 h-12" />
          </Button>
        )}

        {recordingState === "stopped" && recordedBlob && (
          <div className="w-32 h-32 rounded-full bg-success/20 border-4 border-success flex items-center justify-center">
            <Check className="w-12 h-12 text-success" />
          </div>
        )}
      </div>

      {/* Action Buttons for Recording/Paused State */}
      {(recordingState === "recording" || recordingState === "paused") && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleStop}
            variant="outline"
            className="touch-target border-2 rounded-2xl"
          >
            <Square className="mr-2 h-5 w-5" />
            完成录音
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            className="touch-target text-destructive hover:text-destructive hover:bg-destructive-bg rounded-2xl"
          >
            <Trash2 className="mr-2 h-5 w-5" />
            删除
          </Button>
        </div>
      )}

      {/* Action Buttons for Stopped State */}
      {recordingState === "stopped" && recordedBlob && (
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-2xl space-y-2">
            <div className="flex justify-between text-body-sm">
              <span className="text-muted-foreground">录制时长</span>
              <span className="font-medium text-foreground">
                {formatTime(MAX_RECORDING_TIME - timeLeft)}
              </span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-muted-foreground">文件大小</span>
              <span className="font-medium text-foreground">
                {(blobSize / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleComplete}
              className="flex-1 touch-target bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <Check className="mr-2 h-5 w-5" />
              完成并上传
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="touch-target border-2 rounded-2xl"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
