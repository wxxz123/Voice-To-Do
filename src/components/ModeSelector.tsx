import { Upload, Mic, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Mode = "upload" | "record" | null;

interface ModeSelectorProps {
  selectedMode: Mode;
  onSelectMode: (mode: Mode) => void;
}

export const ModeSelector = ({ selectedMode, onSelectMode }: ModeSelectorProps) => {
  // If a mode is selected, show back button
  if (selectedMode) {
    return (
      <div className="mb-6 animate-fade-up">
        <Button
          variant="ghost"
          onClick={() => onSelectMode(null)}
          className="text-body font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          返回模式选择
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-heading-lg font-bold text-foreground">选择输入模式</h3>
        <p className="text-body text-muted-foreground">
          选择最适合您的方式开始
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Card */}
        <button
          onClick={() => onSelectMode("upload")}
          className="group ios-card p-8 text-left transition-all duration-300 hover:elevation-4 hover:scale-[1.02] hover:border-accent/30 active:scale-[0.98] animate-scale-in"
        >
          <div className="flex flex-col items-start space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h4 className="text-heading font-semibold text-foreground">
                📁 上传音频
              </h4>
              <p className="text-body-sm text-muted-foreground">
                适合已有录音文件
              </p>
              <div className="pt-2 space-y-1">
                <p className="text-caption text-muted-foreground">
                  • 支持格式：m4a / mp3 / wav / aac / 3gp
                </p>
                <p className="text-caption text-muted-foreground">
                  • 文件大小：≤ 50MB
                </p>
              </div>
            </div>
          </div>
        </button>

        {/* Record Card */}
        <button
          onClick={() => onSelectMode("record")}
          className="group ios-card p-8 text-left transition-all duration-300 hover:elevation-4 hover:scale-[1.02] hover:border-accent/30 active:scale-[0.98] animate-scale-in"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex flex-col items-start space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
              <Mic className="w-8 h-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h4 className="text-heading font-semibold text-foreground">
                🎤 实时录音
              </h4>
              <p className="text-body-sm text-muted-foreground">
                适合快速口述灵感
              </p>
              <div className="pt-2 space-y-1">
                <p className="text-caption text-muted-foreground">
                  • 时长限制：最长 3 分钟
                </p>
                <p className="text-caption text-muted-foreground">
                  • 即时录制，无需下载
                </p>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
