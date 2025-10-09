// src/lib/soniox.ts
const BASE = "/api/soniox/v1";
const API_KEY = (import.meta as any).env?.VITE_SONIOX_API_KEY;
const MODEL  = (import.meta as any).env?.VITE_SONIOX_MODEL || "stt-async-preview";

function assertEnv() {
  if (!API_KEY) throw new Error("缺少 VITE_SONIOX_API_KEY");
}

async function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)); }

async function sonioxFetch(input: string, init: RequestInit = {}) {
  assertEnv();
  const headers = new Headers(init.headers || {});
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${API_KEY}`);
  return fetch(`${BASE}${input}`, { ...init, headers });
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name || "audio");
  const res = await sonioxFetch(`/files`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

export async function createTranscription(fileId: string) {
  // 兼容两类后端：有的要求顶层字段，有的要求 payload 包裹
  const body: any = {
    payload: {
      model: MODEL,
      file_id: fileId,
    },
    // 顶层也带一份，若后端忽略 payload 则仍可用（不会同时传 audio_url）
    model: MODEL,
    file_id: fileId,
  };
  const res = await sonioxFetch(`/transcriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create transcription failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ id: string; status: string }>;
}

export async function getTranscription(id: string) {
  const res = await sonioxFetch(`/transcriptions/${id}`);
  if (!res.ok) throw new Error(`Get transcription failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ status: string }>;
}

export async function waitForCompletion(id: string, timeoutMs = 180000) {
  const start = Date.now();
  let delay = 600;
  while (true) {
    if (Date.now() - start > timeoutMs) throw new Error("Transcription timeout (>180s)");
    const st = await getTranscription(id);
    if (st.status === "completed") return;
    if (st.status === "failed" || st.status === "canceled") {
      throw new Error(`Transcription ${st.status}`);
    }
    await sleep(Math.min(delay, 2000));
    delay = Math.min(Math.floor(delay * 1.5), 2000);
  }
}

export async function getTranscript(id: string) {
  let tries = 0, backoff = 300;
  while (tries < 8) {
    const res = await sonioxFetch(`/transcriptions/${id}/transcript`);
    const raw = await res.text();
    let data: any; try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (res.ok) {
      const tokens: any[] = data?.tokens || [];
      return tokens.map(t => t?.text || "").join("");
    }

    if (res.status === 409 && data?.error_type === "transcription_invalid_state") {
      await sleep(backoff);
      backoff = Math.min(Math.floor(backoff * 1.6), 2000);
      tries++;
      continue;
    }
    throw new Error(`Get transcript failed: ${res.status} ${raw}`);
  }
  throw new Error("Get transcript timeout/retries exceeded");
}

export async function transcribeFile(file: File) {
  const up = await uploadFile(file);
  const tr = await createTranscription(up.id);
  await waitForCompletion(tr.id);
  const transcript = await getTranscript(tr.id);
  return { transcript, transcription_id: tr.id };
}


