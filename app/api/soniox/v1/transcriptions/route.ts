import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SONIOX_API = "https://api.soniox.com/v1";
const KEY = process.env.SONIOX_API_KEY;
const MODEL = process.env.SONIOX_MODEL || "stt-async-preview";

export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "服务器未配置 SONIOX_API_KEY" }, { status: 500 });
  }

  try {
    const incoming = await req.json().catch(() => ({}));
    const payload = (incoming as any)?.payload ?? {};

    // 兜底：强制带上 model
    if (!payload.model) payload.model = MODEL;

    // 只允许 file_id 或 audio_url 二选一
    if (payload.file_id && payload.audio_url) {
      return NextResponse.json(
        { error: "Expected file_id or audio_url but not both." },
        { status: 400 }
      );
    }

    const res = await fetch(`${SONIOX_API}/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json({ raw: text }, { status: res.status });
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}


