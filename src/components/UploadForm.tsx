"use client";
import { useRef, useState } from 'react';

type Props = {
  onComplete: (transcript: string) => void;
};

export default function UploadForm({ onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > 100 * 1024 * 1024) { // 100MB
      setError('文件过大（>100MB）');
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('请先选择音频文件');
      return;
    }
    setIsUploading(true);
    setProgressText('上传中...');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `网络错误（${res.status}）`);
      }
      setProgressText('转写处理中...');
      const data = await res.json();
      if (!data?.transcript) {
        throw new Error('未获取到转写文本');
      }
      onComplete(data.transcript as string);
      setProgressText('完成');
    } catch (e: any) {
      setError(e.message || '未知错误');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="audio/wav,.wav,audio/*"
          onChange={onFileChange}
          className="block w-full text-sm"
        />
        <p className="mt-2 text-xs text-gray-500">
          支持格式：WAV、MP3、M4A、AAC、OGG、WEBM、FLAC、3GP、AMR、MP4（≤100MB）。
          若手机上看不到 WAV，请从“文件/文件管理器”选择，或先在语音备忘录中“共享/导出到浏览器”后再上传；也可先改名为 .m4a/.mp3（后端可识别 WAV）。
        </p>
      </div>
      {progressText && (
        <div className="text-sm text-gray-600">{progressText}</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      <button
        type="submit"
        disabled={!file || isUploading}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-white"
      >
        {isUploading ? '上传中…' : '上传并转写'}
      </button>
    </form>
  );
}

