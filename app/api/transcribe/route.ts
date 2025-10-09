// app/api/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SONIOX_API = "https://api.soniox.com/v1";
const MODEL = process.env.SONIOX_MODEL || "soniox-public/en-general-v1";
const KEY = process.env.SONIOX_API_KEY;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickRequestId(res: Response, body: any): string | undefined {
  const headerId = res.headers.get("x-request-id") || res.headers.get("x-requestid") || undefined;
  const bodyId = body?.request_id || body?.requestId || undefined;
  return bodyId || headerId || undefined;
}

function safeJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text } as any;
  }
}

export async function POST(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "服务器未配置 SONIOX_API_KEY" }, { status: 500 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const providedFileId = form.get("file_id");

    if ((!file || typeof file === "string") && (typeof providedFileId !== "string" || !providedFileId)) {
      return NextResponse.json({ error: "请通过 FormData 提交字段 file（音频文件）或 file_id" }, { status: 400 });
    }

    // 1) 上传文件到 Soniox（若未提供 file_id）
    let file_id: string | undefined = typeof providedFileId === "string" ? providedFileId : undefined;
    if (!file_id && file && typeof file !== "string") {
      const uploadFd = new FormData();
      uploadFd.append("file", file, file.name || "audio");
      const upRes = await fetch(`${SONIOX_API}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}` },
        body: uploadFd,
      });

      const upRaw = await upRes.text();
      const upJson = safeJSON(upRaw);
      const upReqId = pickRequestId(upRes, upJson);
      if (upReqId) console.log(`[soniox] upload request_id=${upReqId}`);

      if (!upRes.ok) {
        return NextResponse.json(
          { error: "上传到 Soniox 失败", details: upJson },
          { status: upRes.status || 502 }
        );
      }
      file_id = (upJson as any)?.id;
      if (!file_id) {
        return NextResponse.json({ error: "Soniox 未返回 file_id" }, { status: 502 });
      }
    }

    // 2) 创建转写任务（只传 file_id，不要传 audio_url）
    const createBody = {
      model: MODEL,
      file_id,
      timestamps: true,
      diarization: false,
    } as const;
    const trRes = await fetch(`${SONIOX_API}/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });

    const trRaw = await trRes.text();
    const trJson = safeJSON(trRaw);
    const trReqId = pickRequestId(trRes, trJson);
    if (trReqId) console.log(`[soniox] create request_id=${trReqId}`);

    if (!trRes.ok) {
      return NextResponse.json(
        { error: "创建转写任务失败", details: trJson },
        { status: trRes.status || 502 }
      );
    }
    const trId = (trJson as any)?.id;
    if (!trId) {
      return NextResponse.json({ error: "Soniox 未返回 transcription id" }, { status: 502 });
    }

    // 3) 轮询任务状态直到 completed/failed（指数退避）
    const started = Date.now();
    let delay = 600; // ms
    while (true) {
      if (Date.now() - started > 180_000) {
        return NextResponse.json({ error: "转写超时（>180s）" }, { status: 504 });
      }

      const stRes = await fetch(`${SONIOX_API}/transcriptions/${trId}`, {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const stRaw = await stRes.text();
      const stJson = safeJSON(stRaw);
      const stReqId = pickRequestId(stRes, stJson);
      if (stReqId) console.log(`[soniox] status request_id=${stReqId}`);

      if (!stRes.ok) {
        await sleep(Math.min(delay, 2000));
        delay = Math.min(Math.floor(delay * 1.5), 4000);
        continue;
      }

      const status = (stJson as any)?.status;
      if (status === "completed") break;
      if (status === "failed" || status === "canceled") {
        return NextResponse.json(
          { error: "转写任务失败", details: stJson },
          { status: 502 }
        );
      }

      await sleep(Math.min(delay, 2000));
      delay = Math.min(Math.floor(delay * 1.5), 4000);
    }

    // 4) 任务完成后获取 transcript（若 409 transcription_invalid_state 则稍等重试）
    let transcriptText = "";
    {
      // 在全局 180s 超时内持续尝试获取 transcript，处理 409/404/202 等未就绪状态
      let delay = 400; // ms
      while (Date.now() - started <= 180_000) {
        const ttRes = await fetch(`${SONIOX_API}/transcriptions/${trId}/transcript`, {
          headers: { Authorization: `Bearer ${KEY}` },
        });
        const ttRaw = await ttRes.text();
        const ttJson = safeJSON(ttRaw);
        const ttReqId = pickRequestId(ttRes, ttJson);
        if (ttReqId) console.log(`[soniox] transcript request_id=${ttReqId}`);

        if (ttRes.ok) {
          const tokens: any[] = (ttJson as any)?.tokens || [];
          transcriptText = tokens.map((t: any) => t?.text || "").join("");
          if (transcriptText) break;
        } else if (
          ttRes.status === 409 &&
          (ttJson as any)?.error_type === "transcription_invalid_state"
        ) {
          // 状态未就绪：等待重试
        } else if (ttRes.status === 404 || ttRes.status === 202) {
          // 资源未生成/仍在处理：等待重试
        } else {
          // 其他错误：返回详细信息
          return NextResponse.json(
            { error: "获取转写文本失败", details: ttJson },
            { status: ttRes.status || 502 }
          );
        }

        await sleep(Math.min(delay, 2000));
        delay = Math.min(Math.floor(delay * 1.6), 4000);
      }

      if (!transcriptText) {
        return NextResponse.json(
          { error: "获取转写文本超时或为空" },
          { status: 504 }
        );
      }
    }

    return NextResponse.json({ transcript: transcriptText }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}


