// Analysis via new公益API
// Dev: uses local proxy to avoid exposing keys; Prod: uses server route

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
  const isDev = import.meta.env.DEV;
  if (!isDev) {
    // 生产环境：统一走服务端路由 /api/analyze（由 Vercel/Edge Function 调用外部API）
    const resp = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`分析失败: ${resp.status} ${resp.statusText} ${msg}`);
    }
    const data = await resp.json();
    const highlights: string = data?.highlights || "";
    const todos: TodoItem[] = Array.isArray(data?.todos) ? data.todos : [];
    return { highlights, todos, raw: data };
  }

  // 开发环境：通过 Vite 代理 /api/newapi，避免密钥暴露与跨域问题
  const baseUrl = "/api/newapi";
  const model = (import.meta.env.VITE_NEWAPI_MODEL as string | undefined) || "gpt-4.1";
  const userMsg = `你是一个有帮助的助手。请依据用户的中文转写文本，生成摘要（长度约为原文的20%-30%）与层级化待办清单。待办项需包含优先级（low/medium/high）与父子关系。只返回严格的 JSON：{\"highlights\": string, \"todos\": [{id,title,priority?,category?,children?}]}。原文如下：\n\n${text}`;

  let attempt = 0;
  let lastError: any = null;
  async function listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${baseUrl}/models`, { method: "GET" });
      const txt = await res.text();
      const json = safeJSON(txt);
      const data = Array.isArray(json?.data) ? json.data : [];
      return data.map((m: any) => m?.id).filter(Boolean);
    } catch {
      return [];
    }
  }

  function pickFallbackModel(models: string[], prefer: string[]): string | null {
    const set = new Set(models);
    for (const m of prefer) {
      if (m && set.has(m)) return m;
    }
    const guess = models.find((m) => /gpt|gemini|qwen|llama|deepseek|claude/i.test(m));
    return guess || null;
  }

  let currentModel = model;
  while (attempt < 3) {
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "user", content: userMsg },
          ],
          temperature: 0.2,
        }),
      });

      const textErr = await resp.text().catch(() => "");
      if (!resp.ok) {
        // 429/5xx 重试，其他直接抛错
        const details = safeJSON(textErr);
        const errCode = (details?.error?.code as string) || "";
        if (resp.status === 404) {
          throw new Error("开发环境API路由未找到：请确认 vite.config.ts 中存在 /api/newapi 代理，且 .env.local 已配置 NEWAPI_BASE_URL 为有效HTTPS地址。");
        }
        // 模型不可用时，尝试回退一次
        if (resp.status === 404 || resp.status === 422 || resp.status === 503 || errCode === "model_not_found") {
          const models = await listModels();
          const prefer = [
            currentModel,
            "gpt-4o",
            "gpt-4.1",
            "gpt-4o-mini",
            "gpt-3.5-turbo",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "qwen-plus",
            "llama-3.1-70b-instruct",
            "deepseek-chat",
            "claude-3.5-sonnet",
          ];
          const picked = pickFallbackModel(models, prefer);
          if (picked && picked !== currentModel) {
            currentModel = picked;
            // 立即重试，不增加 attempt 次数
            continue;
          }
        }
        if (resp.status === 429 || resp.status >= 500) {
          throw new Error(`NewAPI 请求失败(${resp.status}): ${textErr}`);
        }
        throw new Error(`NewAPI 请求失败(${resp.status}): ${textErr}`);
      }

      const data = safeJSON(textErr);
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      if (!parsed || typeof parsed !== "object") {
        throw new Error("NewAPI 返回解析失败，未获得有效 JSON");
      }
      const highlights: string = parsed.highlights || "";
      const todos: TodoItem[] = Array.isArray(parsed.todos) ? parsed.todos : [];
      return { highlights, todos, raw: data };
    } catch (e: any) {
      lastError = e;
      attempt++;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new Error(String(lastError?.message || lastError || "NewAPI 请求失败"));
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


