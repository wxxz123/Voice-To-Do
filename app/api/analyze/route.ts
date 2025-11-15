import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "../_lib/errors";

export const runtime = "nodejs";

// 新公益API配置（仅使用 NEWAPI_* 环境变量）
const BASE = (process.env.NEWAPI_BASE_URL || "https://你的newapi服务器地址/v1").replace(/\/$/, "");
const KEY = process.env.NEWAPI_API_KEY;
// 默认使用公益站可用模型
const MODEL = process.env.NEWAPI_MODEL || "gemini-2.5-flash";

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

// 公益站可用模型列表
const PREFER_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-05",
  "gemini-flash-latest",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-exp-image-generation",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
];

function pickFallbackModel(models: string[], prefer: string[]): string | null {
  // 只从公益站提供的模型中选择，过滤掉不在列表中的模型
  const validModels = models.filter(m => PREFER_MODELS.includes(m));
  const set = new Set(validModels);
  for (const m of prefer) {
    if (m && set.has(m)) return m;
  }
  // 如果优先列表中的模型都不在可用列表中，返回 null
  return null;
}

export async function POST(req: NextRequest) {
  if (!KEY) {
    return errorJson(500, "服务器未配置 NEWAPI_API_KEY", { code: "CONFIG_MISSING" });
  }
  if (!/^https:\/\//.test(BASE)) {
    return errorJson(500, "NEWAPI_BASE_URL 必须为 HTTPS", { code: "CONFIG_INVALID" });
  }

  try {
    const body = await req.json();
    const text = body?.text as string;
    if (!text || typeof text !== "string") {
      return errorJson(400, "缺少文本：text", { code: "BAD_REQUEST" });
    }

    const userMsg = `你是一个有帮助的助手。请依据用户的中文转写文本生成两部分：1) 摘要（长度约为原文的20%-30%）；2) 层级化待办清单，每项含优先级low/medium/high与父子层级。只返回严格的 JSON：{\"highlights\": string, \"todos\": [{id,title,priority?,category?,children?}]}。原文如下：\n\n${text}`;

    // 简单重试机制（最多3次），处理 429 与 5xx
    let attempt = 0;
    let lastRaw: string | null = null;
    let currentModel = MODEL;
    while (attempt < 3) {
      const res = await fetch(`${BASE}/chat/completions`, {
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

      const raw = await res.text();
      lastRaw = raw;
      if (res.ok) {
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
          return errorJson(502, "NewAPI 返回解析失败", { code: "PARSE_ERROR" });
        }
        const highlights: string = parsed.highlights || "";
        const todos: any[] = Array.isArray(parsed.todos) ? parsed.todos : [];
        return NextResponse.json({ highlights, todos }, { status: 200 });
      }

      // 如果模型不可用，尝试动态回退（只使用公益站提供的模型）
      const details = safeJSON(lastRaw || "");
      const errCode = (details?.error?.code as string) || "";
      if (res.status === 404 || res.status === 422 || res.status === 503 || errCode === "model_not_found") {
        const models = await listModels();
        // 优先尝试其他公益站模型，而不是当前失败的模型
        const prefer = PREFER_MODELS.filter(m => m !== currentModel);
        // 如果当前模型是公益站模型，也加入列表（可能只是临时错误）
        if (PREFER_MODELS.includes(currentModel)) {
          prefer.unshift(currentModel);
        }
        // 如果无法获取模型列表，直接使用硬编码的公益站模型列表
        const picked = models.length > 0 
          ? pickFallbackModel(models, prefer)
          : (prefer[0] || null);
        if (picked && picked !== currentModel) {
          currentModel = picked;
          // 回退后立即重试，不增加 attempt 次数
          continue;
        } else if (picked === currentModel && models.length === 0) {
          // 如果无法获取模型列表，尝试下一个公益站模型
          const nextModel = prefer.find(m => m !== currentModel);
          if (nextModel) {
            currentModel = nextModel;
            continue;
          }
        }
      }

      // 非OK：若 429 或 5xx，退避重试
      if (res.status === 429 || res.status >= 500) {
        attempt++;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
      }

      const hint = errCode === "model_not_found"
        ? { message: `模型 ${currentModel} 在当前服务不可用，请在环境变量 NEWAPI_MODEL 中配置可用模型，或在服务商控制台启用对应渠道。`, models: await listModels() }
        : undefined;
      return errorJson(res.status || 502, "分析失败", { details: details || safeJSON(lastRaw || ""), code: "UPSTREAM_ERROR", ...(hint ? { hint } : {}) });
    }
    return errorJson(502, "分析失败（重试耗尽）", { details: safeJSON(lastRaw || ""), code: "RETRY_EXHAUSTED" });

  
  } catch (e: any) {
    return errorJson(500, String(e?.message || e), { code: "SERVER_ERROR", details: e });
  }
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


