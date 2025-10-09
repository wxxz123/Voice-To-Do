import { useRef, useState } from "react";
import { Upload, X, FileAudio, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadCardProps {
  onStartUpload: (file: File) => void;
}

export const UploadCard = ({ onStartUpload }: UploadCardProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ACCEPTED_FORMATS = "audio/*,.m4a,.mp3,.aac,.m4r,.3gp,.wav";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("文件过大", {
        description: `文件大小超过 50MB 限制，当前文件：${(file.size / 1024 / 1024).toFixed(1)}MB`,
      });
      return;
    }

    setSelectedFile(file);
    toast.success("文件已选择", {
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    });
  };

  const handleDelete = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("文件已移除");
  };

  const handleUpload = () => {
    if (selectedFile) {
      onStartUpload(selectedFile);
    }
  };

  return (
    <div className="ios-card p-8 space-y-6 animate-fade-up">
      {/* File Input Area */}
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-accent/50 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:bg-accent/5 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="选择音频文件"
          />
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
              <Upload className="w-10 h-10 text-accent" />
            </div>
            <div className="space-y-2">
              <p className="text-body-lg font-semibold text-foreground">
                点击选择音频文件
              </p>
              <p className="text-body-sm text-muted-foreground">
                或将文件拖放到此处
              </p>
            </div>
            <div className="text-caption text-muted-foreground space-y-1">
              <p>支持格式：m4a, mp3, wav, aac, 3gp</p>
              <p>最大文件大小：50MB</p>
            </div>
          </div>
        </div>
      ) : (
        /* File Preview */
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <FileAudio className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-caption text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive rounded-xl"
              aria-label="删除文件"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Optional: Audio Preview */}
          {selectedFile.type.startsWith("audio/") && (
            <audio
              controls
              className="w-full h-12 rounded-xl"
              src={URL.createObjectURL(selectedFile)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              className="flex-1 touch-target bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <Play className="mr-2 h-5 w-5" />
              开始转写
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="touch-target border-2 rounded-2xl"
            >
              重新选择
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
