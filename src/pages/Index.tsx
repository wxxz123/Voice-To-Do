import { useState } from "react";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ModeSelector, Mode } from "@/components/ModeSelector";
import { UploadCard } from "@/components/UploadCard";
import { RecordCard } from "@/components/RecordCard";
import { ProgressBar, ProgressStep } from "@/components/ProgressBar";
import { ResultsTabs } from "@/components/ResultsTabs";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { transcribeFile } from "@/integrations/soniox";
import { analyzeTextWithOpenAI } from "@/integrations/analysis";

// Mock data for demo purposes (set USE_MOCK=true to enable)
const USE_MOCK = false;

interface TodoItem {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  children?: TodoItem[];
}

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<Mode>(null);
  const [currentStep, setCurrentStep] = useState<ProgressStep | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [highlights, setHighlights] = useState<string>("");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcribeDone, setTranscribeDone] = useState(false);
  const [analyzeDone, setAnalyzeDone] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleGetStarted = () => {
    scrollToSection("app");
  };

  const handleLearnMore = () => {
    scrollToSection("how-it-works");
  };

  // Simulate API workflow
  const simulateWorkflow = async () => {
    if (!USE_MOCK) {
      toast.info("API 调用", {
        description: "在此处接入您的真实 API 调用",
      });
      return;
    }

    // Step 1: Upload
    setCurrentStep("upload");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Transcribe
    setCurrentStep("transcribe");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockTranscript = `今天早上需要完成三件重要的事情。

第一，给客户发送项目提案邮件，包括详细的时间表和预算说明。这个比较紧急，最好在中午之前完成。

第二，整理本周的会议记录并分享给团队。会议记录里有几个重要的决策点需要突出标记，特别是关于新产品功能的讨论。

第三，预约下周的牙医检查。之前医生说要定期复查，已经拖了两个月了，这次一定要约上。

另外，如果有时间的话，可以浏览一下最近的技术博客文章，了解一下行业动态。这个不急，算是低优先级的任务。`;

    setTranscript(mockTranscript);

    // Step 3: Analyze
    setCurrentStep("analyze");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockHighlights = `📌 关键信息摘要：

• 今天有三个主要任务需要完成
• 优先级最高的是发送客户项目提案（中午前完成）
• 需要整理和分享本周会议记录，强调新产品功能讨论
• 预约牙医检查（已推迟两个月）
• 可选任务：浏览技术博客了解行业动态`;

    setHighlights(mockHighlights);

    const mockTodos: TodoItem[] = [
      {
        id: "1",
        title: "发送项目提案邮件给客户",
        priority: "high",
        category: "工作",
        children: [
          {
            id: "1-1",
            title: "包括详细的时间表",
            priority: "high",
            category: "工作",
          },
          {
            id: "1-2",
            title: "包括预算说明",
            priority: "high",
            category: "工作",
          },
        ],
      },
      {
        id: "2",
        title: "整理本周会议记录",
        priority: "medium",
        category: "工作",
        children: [
          {
            id: "2-1",
            title: "标记重要决策点",
            priority: "medium",
            category: "工作",
          },
          {
            id: "2-2",
            title: "突出新产品功能讨论",
            priority: "medium",
            category: "工作",
          },
          {
            id: "2-3",
            title: "分享给团队",
            priority: "medium",
            category: "工作",
          },
        ],
      },
      {
        id: "3",
        title: "预约下周牙医检查",
        priority: "medium",
        category: "个人",
      },
      {
        id: "4",
        title: "浏览技术博客文章",
        priority: "low",
        category: "学习",
      },
    ];

    setTodos(mockTodos);

    // Complete
    setCurrentStep("complete");
    toast.success("处理完成！", {
      description: "您的待办清单已生成",
    });
  };

  // Handler functions for API integration
  const handleStartUpload = async (file: File) => {
    console.log("📁 Upload started:", file.name);
    if (USE_MOCK) {
      await simulateWorkflow();
      return;
    }

    try {
      setErrorMessage(null);
      setBusy(true);
      setCurrentStep("upload");

      // Transcribe via Soniox
      setCurrentStep("transcribe");
      const { transcript: trText } = await transcribeFile(file);
      setTranscript(trText);
      setTranscribeDone(true);

      // Analyze via OpenAI-compatible API
      setCurrentStep("analyze");
      const a = await analyzeTextWithOpenAI(trText);
      setAnalysis(a);
      setHighlights(a.highlights || "");
      setTodos(Array.isArray(a.todos) ? a.todos : []);
      setAnalyzeDone(true);

      setCurrentStep("complete");
      toast.success("处理完成！", { description: "您的待办清单已生成" });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "处理失败，请稍后重试");
      toast.error("处理失败", { description: err?.message || "请稍后重试" });
      setCurrentStep(null);
    } finally {
      setBusy(false);
    }
  };

  const handleStartRecord = () => {
    console.log("🎤 Recording started");
  };

  const handlePauseRecord = () => {
    console.log("⏸️ Recording paused");
  };

  const handleResumeRecord = () => {
    console.log("▶️ Recording resumed");
  };

  const handleStopRecord = () => {
    console.log("⏹️ Recording stopped");
  };

  const handleDeleteRecord = () => {
    console.log("🗑️ Recording deleted");
  };

  const handleCompleteRecord = async (blob: Blob) => {
    console.log("✅ Recording complete:", blob.size, "bytes");
    // Convert Blob -> File and reuse upload flow
    const fileName = `recording-${Date.now()}.${blob.type.includes("webm") ? "webm" : "wav"}`;
    const file = new File([blob], fileName, { type: blob.type || "audio/webm" });
    await handleStartUpload(file);
  };

  const handleCopy = (
    type: "transcript" | "highlights" | "todos-md" | "todos-json",
    content: string
  ) => {
    console.log(`📋 Copied ${type}:`, content.substring(0, 50) + "...");
    // Additional analytics or callbacks can be added here
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Interactive App Section */}
      <section id="app" className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {errorMessage && (
              <div className="w-full rounded-xl bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3">
                {errorMessage}
              </div>
            )}
            {/* Mode Selector */}
            <ModeSelector selectedMode={selectedMode} onSelectMode={setSelectedMode} />

            {/* Upload Card */}
            {selectedMode === "upload" && <UploadCard onStartUpload={handleStartUpload} />}

            {/* Record Card */}
            {selectedMode === "record" && (
              <RecordCard
                onStartRecord={handleStartRecord}
                onPauseRecord={handlePauseRecord}
                onResumeRecord={handleResumeRecord}
                onStopRecord={handleStopRecord}
                onDeleteRecord={handleDeleteRecord}
                onCompleteRecord={handleCompleteRecord}
              />
            )}

            {/* Progress Bar */}
            {currentStep && currentStep !== "complete" && (
              <ProgressBar currentStep={currentStep} />
            )}

            {/* Results Tabs */}
            {currentStep === "complete" && (
              <ResultsTabs
                transcript={transcript}
                highlights={highlights}
                todos={todos}
                onCopy={handleCopy}
              />
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
