import { useMemo, useState } from "react";
import { Copy, Check, FileText, Sparkles, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TodoItem {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  children?: TodoItem[];
}

interface ResultsTabsProps {
  transcript?: string;
  highlights?: string;
  todos?: TodoItem[];
  onCopy: (type: "transcript" | "highlights" | "todos-md" | "todos-json", content: string) => void;
}

export const ResultsTabs = ({ transcript, highlights, todos, onCopy }: ResultsTabsProps) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const isCompleted = (id: string) => completedIds.has(id);

  const handleCopy = async (type: "transcript" | "highlights" | "todos-md" | "todos-json", content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedType(type);
      onCopy(type, content);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedType(null), 2000);
    } catch (error) {
      toast.error("复制失败", {
        description: "请检查浏览器权限设置",
      });
    }
  };

  const renderTodoTree = (items: TodoItem[], level = 0) => {
    return (
      <ul className={cn("space-y-2", level > 0 && "ml-6 mt-2")}>
        {items.map((item) => (
          <li key={item.id} className="group focus-within:bg-[#f5f5f5] rounded-xl">
            <div
              className={cn(
                "grid grid-cols-[48px_1fr] items-start gap-x-3 p-2 md:p-3 rounded-xl",
                "hover:bg-muted/50 transition-colors duration-200"
              )}
            >
              <label className="w-12 h-12 flex items-center justify-center cursor-pointer select-none" aria-label={item.title}>
                <input
                  type="checkbox"
                  checked={isCompleted(item.id)}
                  onChange={() => toggleComplete(item.id)}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 border-border text-accent",
                    "focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all"
                  )}
                />
              </label>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-body",
                    isCompleted(item.id) ? "line-through text-[#888888]" : "text-foreground",
                    "transition-all duration-200"
                  )}
                >
                  {item.title}
                </p>
                {(item.priority || item.category) && (
                  <div className="flex gap-2 mt-1">
                    {item.priority && (
                      <span
                        className={cn(
                          "text-caption px-2 py-0.5 rounded-lg font-medium",
                          item.priority === "high" && "bg-destructive-bg text-destructive",
                          item.priority === "medium" && "bg-warning-bg text-warning",
                          item.priority === "low" && "bg-success-bg text-success"
                        )}
                      >
                        {item.priority === "high" && "高优先级"}
                        {item.priority === "medium" && "中优先级"}
                        {item.priority === "low" && "低优先级"}
                      </span>
                    )}
                    {item.category && (
                      <span className="text-caption px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                        {item.category}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {item.children && item.children.length > 0 && renderTodoTree(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  const todosToMarkdown = (items: TodoItem[], level = 0): string => {
    return items
      .map((item) => {
        const indent = "  ".repeat(level);
        const priority = item.priority ? ` [${item.priority}]` : "";
        const category = item.category ? ` (${item.category})` : "";
        let md = `${indent}- [ ] ${item.title}${priority}${category}`;
        if (item.children && item.children.length > 0) {
          md += "\n" + todosToMarkdown(item.children, level + 1);
        }
        return md;
      })
      .join("\n");
  };

  const groupByCategory = (items: TodoItem[]) => {
    const map = new Map<string, TodoItem[]>();
    const order: string[] = [];
    for (const it of items) {
      const key = it.category || "未分类";
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(it);
    }
    return order.map((k) => ({ category: k, items: map.get(k)! }));
  };

  const CopyButton = ({
    type,
    content,
    label,
  }: {
    type: "transcript" | "highlights" | "todos-md" | "todos-json";
    content: string;
    label: string;
  }) => {
    const isCopied = copiedType === type;
    return (
      <Button
        onClick={() => handleCopy(type, content)}
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl border-2 transition-all duration-200 hover:scale-105"
      >
        {isCopied ? (
          <>
            <Check className="w-4 h-4 text-success" />
            已复制
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            {label}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className="ios-card p-6 md:p-8 animate-fade-up">
      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/30 p-1 rounded-2xl">
          <TabsTrigger
            value="transcript"
            className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-200"
          >
            <FileText className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">转录文本</span>
            <span className="sm:hidden">转录</span>
          </TabsTrigger>
          <TabsTrigger
            value="highlights"
            className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-200"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">摘要</span>
            <span className="sm:hidden">摘要</span>
          </TabsTrigger>
          <TabsTrigger
            value="todos"
            className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-200"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">待办清单</span>
            <span className="sm:hidden">清单</span>
          </TabsTrigger>
        </TabsList>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-heading font-semibold text-foreground">转录文本</h3>
            {transcript && <CopyButton type="transcript" content={transcript} label="复制 Markdown" />}
          </div>
          <div className="p-4 bg-muted/30 rounded-2xl min-h-[200px] max-h-[400px] overflow-y-auto">
            {transcript ? (
              <p className="text-body text-foreground whitespace-pre-wrap leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-body text-muted-foreground italic">暂无转录内容</p>
            )}
          </div>
        </TabsContent>

        {/* Highlights Tab */}
        <TabsContent value="highlights" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-heading font-semibold text-foreground">关键摘要</h3>
            {highlights && <CopyButton type="highlights" content={highlights} label="复制 Markdown" />}
          </div>
          <div className="p-4 bg-muted/30 rounded-2xl min-h-[200px] max-h-[400px] overflow-y-auto">
            {highlights ? (
              <p className="text-body text-foreground whitespace-pre-wrap leading-relaxed">{highlights}</p>
            ) : (
              <p className="text-body text-muted-foreground italic">暂无摘要内容</p>
            )}
          </div>
        </TabsContent>

        {/* Todos Tab */}
        <TabsContent value="todos" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-heading font-semibold text-foreground">待办清单</h3>
            {todos && todos.length > 0 && (
              <div className="flex gap-2">
                <CopyButton
                  type="todos-md"
                  content={todosToMarkdown(todos)}
                  label="复制 Markdown"
                />
                <CopyButton
                  type="todos-json"
                  content={JSON.stringify(todos, null, 2)}
                  label="复制 JSON"
                />
              </div>
            )}
          </div>
          <div className="p-4 bg-muted/30 rounded-2xl min-h-[200px] max-h-[400px] overflow-y-auto">
            {todos && todos.length > 0 ? (
              <div className="space-y-4">
                {groupByCategory(todos).map((group, idx) => (
                  <div key={group.category} className={cn("pt-2", idx > 0 && "border-t border-[#eeeeee]")}> 
                    {/* 分类标题可选显示：保持简洁 */}
                    <div className="flex items-center mb-2">
                      <span className="text-caption text-muted-foreground">{group.category}</span>
                    </div>
                    {renderTodoTree(group.items)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <p className="text-body text-muted-foreground">刚刚的文本中没有待办事项</p>
                <p className="text-body-sm text-muted-foreground/70 mt-2">
                  尝试录制包含任务、计划或行动项的内容
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
