import { Upload, FileText, CheckSquare } from "lucide-react";

interface StepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const Step = ({ icon, title, description, index }: StepProps) => (
  <div className="relative flex flex-col items-center text-center space-y-4 animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
    <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center elevation-2 transition-transform duration-300 hover:scale-110">
      <div className="text-accent">
        {icon}
      </div>
    </div>
    <h3 className="text-heading font-semibold text-foreground">{title}</h3>
    <p className="text-body text-muted-foreground max-w-xs">{description}</p>
  </div>
);

export const HowItWorks = () => {
  const steps = [
    {
      icon: <Upload className="w-10 h-10" />,
      title: "选择上传或录音",
      description: "上传已有音频文件或直接在浏览器中录制语音（最长 3 分钟）",
    },
    {
      icon: <FileText className="w-10 h-10" />,
      title: "自动转写并生成摘要",
      description: "AI 快速转写您的语音内容，提取关键信息生成简明摘要",
    },
    {
      icon: <CheckSquare className="w-10 h-10" />,
      title: "输出层级待办清单",
      description: "智能识别待办事项，生成结构化清单，支持一键复制",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-heading-xl md:text-display font-bold text-foreground">
            如何使用
          </h2>
          <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
            三步即可将您的语音转化为结构化待办清单
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, index) => (
            <Step key={index} {...step} index={index} />
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-16 max-w-4xl mx-auto ios-card p-8 md:p-10 bg-muted/30 text-center">
          <h4 className="text-heading font-semibold text-foreground mb-6">💡 小贴士</h4>
          <ul className="space-y-3 text-body text-muted-foreground">
            <li>• iPhone 用户建议选择 <code className="px-2 py-0.5 bg-card rounded-lg text-foreground font-mono text-body-sm">.m4a</code> 格式</li>
            <li>• 上传文件大小限制：最大 50MB</li>
            <li>• 录音时长限制：最长 3 分钟</li>
            <li>• 支持格式：m4a、mp3、wav、aac、3gp</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
