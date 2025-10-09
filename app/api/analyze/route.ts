import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = process.env.OPENAI_BASE_URL || process.env.CHATANYWHERE_BASE_URL || "https://api.chatanywhere.com.cn/v1";
const KEY = process.env.CHATANYWHERE_KEY || process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "服务器未配置 CHATANYWHERE_KEY/OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const text = body?.text as string;
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "缺少文本：text" }, { status: 400 });
    }

    const systemPrompt =
      "你是一个会议助理，擅长从中文口语转写中提炼摘要与可执行的待办事项。" +
      "输出严格为 JSON，包含 highlights(字符串，尽量用中文要点列表) 与 todos(数组，含层级)。";

    const userPrompt = `请基于以下转写文本：\n\n${text}\n\n任务：\n1) 生成简洁高信噪比的中文要点摘要(不要过长，5-10 条)。\n2) 提取结构化待办事项，字段：id(字符串)、title(字符串)、priority(可为low/medium/high，可缺省)、category(可缺省)、children(数组，同结构，支持0-2层)。\n只返回 JSON：{\"highlights\": string, \"todos\": TodoItem[]}`;

    const res = await fetch(`${BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: "分析失败", details: safeJSON(raw) }, { status: res.status || 502 });
    }

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
      return NextResponse.json({ error: "OpenAI 返回解析失败" }, { status: 502 });
    }

    const highlights: string = parsed.highlights || "";
    const todos: any[] = Array.isArray(parsed.todos) ? parsed.todos : [];

    return NextResponse.json({ highlights, todos }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


