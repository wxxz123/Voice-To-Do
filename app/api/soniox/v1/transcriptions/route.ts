import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "../../../_lib/errors";

export const runtime = "nodejs";

const SONIOX_API = "https://api.soniox.com/v1";
const KEY = process.env.SONIOX_API_KEY;
const MODEL = process.env.SONIOX_MODEL || "stt-async-preview";

export async function POST(req: NextRequest) {
  if (!KEY) {
    return errorJson(500, "服务器未配置 SONIOX_API_KEY", { code: "CONFIG_MISSING" });
  }

  try {
    const incoming = await req.json().catch(() => ({}));
    const top = (incoming as any) || {};
    // Merge both forms: prefer explicit top-level fields, fallback to payload
    const payload: any = { ...(top.payload || {}), ...top };
    delete payload.payload;

    // 兜底：强制带上 model
    if (!payload.model) payload.model = MODEL;

    // 只允许 file_id 或 audio_url 二选一
    if (payload.file_id && payload.audio_url) {
      return errorJson(400, "Expected file_id or audio_url but not both.", { code: "BAD_REQUEST" });
    }

    const res = await fetch(`${SONIOX_API}/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      // Send top-level fields to Soniox for maximum compatibility
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json({ raw: text }, { status: res.status });
    }
  } catch (e: any) {
    return errorJson(500, String(e?.message || e), { code: "SERVER_ERROR", details: e });
  }
}


