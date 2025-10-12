// Vercel Serverless Function: /api/soniox/v1/transcriptions/[id]
// Supports GET to check transcription status

const SONIOX_API = "https://api.soniox.com/v1";

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export default async function handler(req: any, res: any) {
  const KEY = process.env.SONIOX_API_KEY;
  if (!KEY) {
    res.status(500).json({ error: "服务器未配置 SONIOX_API_KEY", code: "CONFIG_MISSING" });
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const id = (req.query?.id as string) || (req?.params?.id as string);
  if (!id) {
    res.status(400).json({ error: "缺少参数 id", code: "BAD_REQUEST" });
    return;
  }

  try {
    const stRes = await fetch(`${SONIOX_API}/transcriptions/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
    });
    const text = await stRes.text();
    const json = safeJSON(text);
    res.status(stRes.status).json(json);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e), code: "SERVER_ERROR" });
  }
}