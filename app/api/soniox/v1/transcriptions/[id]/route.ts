import { NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json({ error: "服务器未配置 SONIOX_API_KEY" }, { status: 500 });
  }

  try {
    const res = await fetch(`${SONIOX_API}/transcriptions/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    const data = safeJSON(text);
    const reqId = pickRequestId(res, data);
    if (reqId) console.log(`[soniox] transcription status request_id=${reqId}`);

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}