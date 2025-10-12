// Vercel Serverless Function: /api/soniox/v1/transcriptions
// Supports POST to create a transcription

const SONIOX_API = "https://api.soniox.com/v1";
const DEFAULT_MODEL = process.env.SONIOX_MODEL || "stt-async-preview";

async function readJson(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        resolve({ raw: Buffer.concat(chunks).toString("utf8") });
      }
    });
    req.on("error", (err: any) => reject(err));
  });
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export default async function handler(req: any, res: any) {
  const KEY = process.env.SONIOX_API_KEY;
  if (!KEY) {
    res.status(500).json({ error: "服务器未配置 SONIOX_API_KEY", code: "CONFIG_MISSING" });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const incoming = await readJson(req).catch(() => ({}));
    const top = (incoming as any) || {};
    const payload: any = { ...(top.payload || {}), ...top };
    delete payload.payload;

    if (!payload.model) payload.model = DEFAULT_MODEL;
    if (payload.file_id && payload.audio_url) {
      res.status(400).json({ error: "Expected file_id or audio_url but not both.", code: "BAD_REQUEST" });
      return;
    }

    const createRes = await fetch(`${SONIOX_API}/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await createRes.text();
    const json = safeJSON(text);
    res.status(createRes.status).json(json);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e), code: "SERVER_ERROR" });
  }
}