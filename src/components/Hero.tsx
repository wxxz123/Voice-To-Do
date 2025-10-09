import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-illustration.jpg";

interface HeroProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export const Hero = ({ onGetStarted, onLearnMore }: HeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 py-20 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Content */}
          <div className="space-y-8 animate-fade-up text-center">
            <div className="space-y-4">
              <h1 className="text-display md:text-display-lg font-bold text-foreground">
                说出来，
                <br />
                马上整理成待办
              </h1>
              <p className="text-heading-lg md:text-heading-xl font-medium text-muted-foreground">
                Upload or record your thoughts.
                <br />
                Get transcript, summary, and to-do in seconds.
              </p>
            </div>

            <p className="text-body-lg text-muted-foreground max-w-xl">
              一句话解释流程：上传或录音 → 自动转写 → 生成摘要 & 层级待办清单
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="touch-target text-body-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl"
              >
                直接使用
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onLearnMore}
                className="touch-target text-body-lg font-semibold border-2 hover:bg-secondary/50 transition-all duration-300 rounded-2xl"
              >
                <Play className="mr-2 h-5 w-5" />
                查看使用说明
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
