import { Upload, FileText, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProgressStep = "upload" | "transcribe" | "analyze" | "complete";

interface ProgressBarProps {
  currentStep: ProgressStep;
}

const steps = [
  { key: "upload", label: "上传", icon: Upload },
  { key: "transcribe", label: "转写", icon: FileText },
  { key: "analyze", label: "分析", icon: CheckSquare },
];

const getStepIndex = (step: ProgressStep): number => {
  const stepMap: Record<ProgressStep, number> = {
    upload: 0,
    transcribe: 1,
    analyze: 2,
    complete: 3,
  };
  return stepMap[step];
};

export const ProgressBar = ({ currentStep }: ProgressBarProps) => {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full py-8 animate-fade-up">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="relative">
          {/* Background Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-border rounded-full" />
          
          {/* Active Progress Line */}
          <div
            className="absolute top-6 left-0 h-1 bg-accent rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${(currentIndex / (steps.length - 1)) * 100}%`,
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                      isActive
                        ? "bg-accent border-accent text-accent-foreground shadow-lg"
                        : "bg-background border-border text-muted-foreground",
                      isCurrent && "scale-110 shadow-xl shadow-accent/50"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Step Label */}
                  <span
                    className={cn(
                      "mt-3 text-caption font-medium transition-colors duration-300",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Step Description */}
        <div className="mt-6 text-center">
          <p className="text-body text-muted-foreground">
            {currentStep === "upload" && "正在上传您的音频文件..."}
            {currentStep === "transcribe" && "AI 正在转写音频内容..."}
            {currentStep === "analyze" && "正在生成摘要和待办清单..."}
            {currentStep === "complete" && "✨ 处理完成！"}
          </p>
        </div>
      </div>
    </div>
  );
};
