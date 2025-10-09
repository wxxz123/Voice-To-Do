import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SONIOX_API = "https://api.soniox.com/v1";
const KEY = process.env.SONIOX_API_KEY;

export async function GET(_req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "服务器未配置 SONIOX_API_KEY" }, { status: 500 });
  }
  try {
    const res = await fetch(`${SONIOX_API}/models`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: "获取模型列表失败", details: safeJSON(raw) }, { status: res.status || 502 });
    }
    return NextResponse.json(safeJSON(raw), { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


