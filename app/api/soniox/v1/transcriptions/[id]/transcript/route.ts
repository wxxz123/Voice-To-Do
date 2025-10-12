import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "../../../../_lib/errors";

export const runtime = "nodejs";

const SONIOX_API = "https://api.soniox.com/v1";
const KEY = process.env.SONIOX_API_KEY;

function pickRequestId(res: Response, body: any): string | undefined {
  const headerId = res.headers.get("x-request-id") || res.headers.get("x-requestid") || undefined;
  const bodyId = body?.request_id || body?.requestId || undefined;
  return bodyId || headerId || undefined;
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  if (!KEY) {
    return errorJson(500, "服务器未配置 SONIOX_API_KEY", { code: "CONFIG_MISSING" });
  }

  try {
    const res = await fetch(`${SONIOX_API}/transcriptions/${id}/transcript`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    const data = safeJSON(text);
    const reqId = pickRequestId(res, data);
    if (reqId) console.log(`[soniox] transcript request_id=${reqId}`);

    if (!res.ok) {
      return errorJson(res.status || 502, "获取转写文本失败", { details: data, code: "UPSTREAM_ERROR" });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return errorJson(500, String(e?.message || e), { code: "SERVER_ERROR", details: e });
  }
}