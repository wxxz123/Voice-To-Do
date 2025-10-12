// Vercel Serverless Function: /api/soniox/v1/files
// Supports POST (upload file via multipart/form-data) and GET (list files)

const SONIOX_API = "https://api.soniox.com/v1";

function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
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

  try {
    if (req.method === "POST") {
      const contentType = req.headers["content-type"] || "application/octet-stream";
      const raw = await readRawBody(req);
      const upRes = await fetch(`${SONIOX_API}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": String(contentType) },
        body: raw,
      });
      const text = await upRes.text();
      const json = safeJSON(text);
      res.status(upRes.status).json(json);
      return;
    }

    if (req.method === "GET") {
      const listRes = await fetch(`${SONIOX_API}/files`, {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const text = await listRes.text();
      const json = safeJSON(text);
      res.status(listRes.status).json(json);
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method Not Allowed" });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e), code: "SERVER_ERROR" });
  }
}