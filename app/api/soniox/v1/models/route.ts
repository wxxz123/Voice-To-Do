import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "../../_lib/errors";

export const runtime = "nodejs";

const SONIOX_API = "https://api.soniox.com/v1";
const KEY = process.env.SONIOX_API_KEY;

export async function GET(_req: NextRequest) {
  if (!KEY) {
    return errorJson(500, "服务器未配置 SONIOX_API_KEY", { code: "CONFIG_MISSING" });
  }
  try {
    const res = await fetch(`${SONIOX_API}/models`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const raw = await res.text();
    const data = safeJSON(raw);
    if (!res.ok) {
      return errorJson(res.status || 502, "获取模型列表失败", { details: data, code: "UPSTREAM_ERROR" });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return errorJson(500, String(e?.message || e), { code: "SERVER_ERROR", details: e });
  }
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


