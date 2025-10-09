import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ = () => {
  const faqs = [
    {
      question: "支持哪些音频格式？",
      answer:
        "目前支持 m4a、mp3、wav、aac、3gp 等常见音频格式。推荐 iPhone 用户使用语音备忘录录制后保存为 .m4a 格式。",
    },
    {
      question: "文件大小和时长有限制吗？",
      answer:
        "上传文件最大支持 50MB。实时录音功能限制最长 3 分钟，这样可以确保快速处理和最佳体验。",
    },
    {
      question: "iPhone 用户如何上传录音？",
      answer:
        "在 iPhone 的「语音备忘录」中录制完成后，点击分享按钮，选择「存储到文件」，然后在本应用中选择该文件即可上传。建议选择 .m4a 格式以获得最佳兼容性。",
    },
    {
      question: "我的音频数据安全吗？",
      answer:
        "我们非常重视您的隐私安全。所有上传的音频仅用于生成转写和待办清单，不会被存储或分享给第三方。处理完成后，文件将被自动删除。",
    },
    {
      question: "为什么需要麦克风权限？",
      answer:
        "实时录音功能需要访问您的麦克风。我们承诺仅在您主动点击录音按钮时才会访问麦克风，且录制的内容仅用于生成待办清单，不会被用于其他目的。",
    },
    {
      question: "生成的待办清单可以编辑吗？",
      answer:
        "当前版本提供一键复制功能，您可以将生成的待办清单（Markdown 或 JSON 格式）复制到其他应用中进行编辑和管理。",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-heading-xl md:text-display font-bold text-foreground">
              常见问题
            </h2>
            <p className="text-body-lg text-muted-foreground">
              关于 Voice To-Do 的使用说明
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="ios-card px-6 border-none"
              >
                <AccordionTrigger className="text-body-lg font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-body text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
