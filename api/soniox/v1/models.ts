// Vercel Serverless Function: /api/soniox/v1/models
// Supports GET to list models

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

  try {
    const listRes = await fetch(`${SONIOX_API}/models`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const text = await listRes.text();
    const json = safeJSON(text);
    res.status(listRes.status).json(json);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e), code: "SERVER_ERROR" });
  }
}