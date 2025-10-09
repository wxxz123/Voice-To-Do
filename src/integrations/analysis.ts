// OpenAI-compatible analysis via ChatAnywhere (OpenAI proxy)
// For production, consider server-side proxy to avoid exposing keys.

export interface TodoItem {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  children?: TodoItem[];
}

export interface AnalyzeResult {
  highlights: string; // markdown or plain summary
  todos: TodoItem[];  // structured action items
  raw?: unknown;
}

export async function analyzeTextWithOpenAI(text: string): Promise<AnalyzeResult> {
  const apiKey = import.meta.env.VITE_CHATANYWHERE_KEY as string | undefined;
  const isDev = import.meta.env.DEV;
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) || (isDev ? "/api/openai" : "https://api.chatanywhere.com.cn/v1");
  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("缺少 VITE_CHATANYWHERE_KEY 环境变量");
  }

  const systemPrompt =
    "你是一个会议助理，擅长从中文口语转写中提炼摘要与可执行的待办事项。" +
    "输出严格为 JSON，包含 highlights(字符串，要求为一段简要中文摘要，不需要分条) 与 todos(数组，含层级)。";

  const userPrompt = `请基于以下转写文本：\n\n${text}\n\n任务：\n1) 生成一段简明流畅的中文摘要（不分条、不用列表）。\n2) 提取结构化待办事项，字段：id(字符串)、title(字符串)、priority(可为low/medium/high，可缺省)、category(可缺省)、children(数组，同结构，支持0-2层)。\n只返回 JSON：{\"highlights\": string, \"todos\": TodoItem[]}`;

  const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isDev ? {} : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`OpenAI 分析失败: ${resp.status} ${resp.statusText} ${errorText}`);
  }

  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  // Try parse JSON from the model output safely
  let parsed: any = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON substring
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI 返回解析失败，未获得有效 JSON");
  }

  const highlights: string = parsed.highlights || "";
  const todos: TodoItem[] = Array.isArray(parsed.todos) ? parsed.todos : [];

  return { highlights, todos, raw: data };
}


