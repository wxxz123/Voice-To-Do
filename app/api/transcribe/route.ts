import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: '请求必须为 multipart/form-data' }, { status: 400 });
    }
    const SONIOX_API_KEY = process.env.SONIOX_API_KEY;
    if (!SONIOX_API_KEY) {
      return NextResponse.json({ error: '请配置 SONIOX_API_KEY 以启用真实转写。' }, { status: 500 });
    }
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少文件字段 file' }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: '文件过大（>100MB）' }, { status: 413 });
    }

    // 文件校验规则
    const allowedMimes = new Set([
      "audio/wav", "audio/x-wav",
      "audio/mpeg", "audio/mp3",
      "audio/mp4",  "audio/x-m4a",
      "audio/aac",
      "audio/3gpp"
    ]);

    const allowedExts = [".m4a", ".mp3", ".wav", ".aac", ".m4r", ".3gp"];

    const mime = file.type || "";
    const name = (file.name || "").toLowerCase();
    const byMime = mime && allowedMimes.has(mime);
    const byExt  = allowedExts.some(ext => name.endsWith(ext));

    if (!(byMime || byExt)) {
      return NextResponse.json({ error: "仅支持 m4a/mp3/wav/aac/3gp" }, { status: 415 });
    }

    console.log("server file:", { name, mime, size: file.size }); // 临时调试

    // 将原始用户文件转发至 Soniox v1 files 接口，保留原文件名与 MIME
    const ab = await file.arrayBuffer();
    const blob = new Blob([ab], { type: mime || undefined });
    const forward = new FormData();
    const originalName = (file as any).name || 'audio';
    forward.append('file', blob, originalName);

    const uploadUrl = 'https://api.soniox.com/v1/files';
    const upstream = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SONIOX_API_KEY}`,
      },
      body: forward,
    });

    const text = await upstream.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Soniox 上传失败', details: json || text }, { status: upstream.status });
    }
    // 1) 上传成功，提取 fileId
    const fileId = json?.id || json?.file?.id;
    if (!fileId) {
      return NextResponse.json({ error: '未获取到文件ID', details: json }, { status: 502 });
    }

    // 2) 创建转写任务
    const createUrl = 'https://api.soniox.com/v1/transcriptions';
    const createBody = {
      model: 'stt-async-preview',
      file_id: fileId,
      timestamps: true,
      diarization: false,
    };
    console.log('=== Soniox transcription request body ===');
    console.log(createBody);
    console.log(JSON.stringify(createBody, null, 2));
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SONIOX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });
    if (!createRes.ok) {
      const createText = await createRes.text();
      if (createRes.status === 400) {
        console.log('=== Soniox response ===', createText);
        return NextResponse.json({ error: '创建转写失败', details: { status_code: createRes.status, response: createText } }, { status: 502 });
      }
      // 其他错误保留原始文本
      return NextResponse.json({ error: '创建转写失败', details: { status_code: createRes.status, response: createText } }, { status: createRes.status });
    }
    const createJson = await createRes.json().catch(() => ({} as any));
    const transcriptionId = createJson?.id || createJson?.transcription?.id;
    if (!transcriptionId) {
      return NextResponse.json({ error: '未获取到转写ID', details: createJson }, { status: 502 });
    }

    // 3) 轮询获取转写文本
    const maxTries = 30;
    const delayMs = 2000;
    const transcriptUrl = `https://api.soniox.com/v1/transcriptions/${encodeURIComponent(transcriptionId)}/transcript`;
    let transcript = '';
    for (let i = 0; i < maxTries; i++) {
      const trRes = await fetch(transcriptUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${SONIOX_API_KEY}` },
      });
      const trText = await trRes.text();
      let trJson: any;
      try { trJson = JSON.parse(trText); } catch { trJson = null; }

      if (trRes.ok) {
        const tokens = trJson?.tokens;
        if (Array.isArray(tokens) && tokens.length > 0) {
          transcript = tokens.map((t: any) => t?.text || '').join('');
          break;
        }
      }
      // 若未就绪或 202/204 等，等待后继续
      await new Promise(r => setTimeout(r, delayMs));
    }

    if (!transcript) {
      return NextResponse.json({ error: '获取转写结果超时' }, { status: 504 });
    }

    // 成功时返回纯文本（便于前端直接拿到 transcript）
    return new Response(transcript, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e: any) {
    const msg = e?.message || '服务器错误';
    const status = /缺少环境变量/.test(msg) ? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

