import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE = (process.env.NEWAPI_BASE_URL || "https://你的newapi服务器地址/v1").replace(/\/$/, "");
const KEY = process.env.NEWAPI_API_KEY;
const MODEL = process.env.NEWAPI_MODEL || "gpt-4.1";

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function listModels(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const text = await res.text();
    const json = safeJSON(text);
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  if (!KEY) {
    res.status(500).json({ error: "服务器未配置 NEWAPI_API_KEY", code: "CONFIG_MISSING" });
    return;
  }
  if (!/^https:\/\//.test(BASE)) {
    res.status(500).json({ error: "NEWAPI_BASE_URL 必须为 HTTPS", code: "CONFIG_INVALID" });
    return;
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "缺少文本：text", code: "BAD_REQUEST" });
      return;
    }

    const userMsg = `你是一个有帮助的助手。请依据用户的中文转写文本生成两部分：1) 摘要（长度约为原文的20%-30%）；2) 层级化待办清单，每项含优先级low/medium/high与父子层级。只返回严格的 JSON：{\"highlights\": string, \"todos\": [{id,title,priority?,category?,children?}]}。原文如下：\n\n${text}`;

    let attempt = 0;
    let lastRaw: string | null = null;
    let currentModel = MODEL;
    while (attempt < 3) {
      const upstream = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KEY}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "user", content: userMsg },
          ],
          temperature: 0.2,
        }),
      });

      const raw = await upstream.text();
      lastRaw = raw;
      if (upstream.ok) {
        const data = safeJSON(raw);
        const content: string = data?.choices?.[0]?.message?.content ?? "";
        let parsed: any = null;
        try {
          parsed = JSON.parse(content);
        } catch {
          const m = content.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        }
        if (!parsed || typeof parsed !== "object") {
          res.status(502).json({ error: "NewAPI 返回解析失败", code: "PARSE_ERROR" });
          return;
        }
        const highlights: string = parsed.highlights || "";
        const todos: any[] = Array.isArray(parsed.todos) ? parsed.todos : [];
        res.status(200).json({ highlights, todos });
        return;
      }

      const details = safeJSON(lastRaw || "");
      const errCode = (details?.error?.code as string) || "";
      if (upstream.status === 404 || upstream.status === 422 || upstream.status === 503 || errCode === "model_not_found") {
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
          continue;
        }
      }

      if (upstream.status === 429 || upstream.status >= 500) {
        attempt++;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
      }

      const hint = errCode === "model_not_found"
        ? { message: `模型 ${currentModel} 在当前服务不可用，请在环境变量 NEWAPI_MODEL 中配置可用模型，或在服务商控制台启用对应渠道。`, models: await listModels() }
        : undefined;
      res.status(upstream.status || 502).json({ error: "分析失败", details: details || safeJSON(lastRaw || ""), code: "UPSTREAM_ERROR", ...(hint ? { hint } : {}) });
      return;
    }

    res.status(502).json({ error: "分析失败（重试耗尽）", details: safeJSON(lastRaw || ""), code: "RETRY_EXHAUSTED" });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e), code: "SERVER_ERROR", details: e });
  }
}