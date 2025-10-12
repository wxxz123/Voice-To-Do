import { NextRequest, NextResponse } from "next/server";
import { errorJson } from "../../_lib/errors";

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

export async function POST(req: NextRequest) {
  if (!KEY) {
    return errorJson(500, "服务器未配置 SONIOX_API_KEY", { code: "CONFIG_MISSING" });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    
    if (!file || typeof file === "string") {
      return errorJson(400, "请通过 FormData 提交字段 file（音频文件）", { code: "BAD_REQUEST" });
    }

    const uploadFd = new FormData();
    uploadFd.append("file", file, file.name || "audio");
    
    const upRes = await fetch(`${SONIOX_API}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`
      },
      body: uploadFd,
    });

    const upRaw = await upRes.text();
    const upJson = safeJSON(upRaw);
    const upReqId = pickRequestId(upRes, upJson);
    if (upReqId) console.log(`[soniox] upload request_id=${upReqId}`);

    if (!upRes.ok) {
      return errorJson(upRes.status || 502, "上传到 Soniox 失败", { details: upJson, code: "UPSTREAM_ERROR" });
    }
    
    return NextResponse.json(upJson, { status: upRes.status });
  } catch (e: any) {
    return errorJson(500, String(e?.message || e), { code: "SERVER_ERROR", details: e });
  }
}

// 支持 GET 请求，获取文件列表
export async function GET(req: NextRequest) {
  if (!KEY) {
    return errorJson(500, "服务器未配置 SONIOX_API_KEY", { code: "CONFIG_MISSING" });
  }
  
  try {
    const res = await fetch(`${SONIOX_API}/files`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    
    const raw = await res.text();
    const json = safeJSON(raw);
    
    if (!res.ok) {
      return errorJson(res.status || 502, "获取文件列表失败", { details: json, code: "UPSTREAM_ERROR" });
    }
    
    return NextResponse.json(json, { status: res.status });
  } catch (e: any) {
    return errorJson(500, String(e?.message || e), { code: "SERVER_ERROR", details: e });
  }
}