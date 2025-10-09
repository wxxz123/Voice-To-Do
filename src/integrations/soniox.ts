// Frontend Soniox client (via dev proxy) — never call Soniox with API key in browser directly

export interface SonioxTranscribeResult {
  text: string;
  raw?: unknown;
}

// 修改BASE路径，确保在生产环境中使用相对路径而不是直接访问Soniox API
const BASE = "/api/soniox/v1";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function uploadFile(file: File): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append("file", file, file.name || "audio");
  const res = await fetch(`${BASE}/files`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  return await res.json(); // { id, ... }
}

export async function createTranscription(fileId: string, model?: string): Promise<{ id: string; status?: string }> {
  // Use payload.model as requested; default model to stt-async-preview
  const effectiveModel =
    model ||
    (import.meta.env.VITE_SONIOX_MODEL as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_SONIOX_MODEL as string | undefined) ||
    "stt-async-preview";

  const body = {
    payload: {
      model: effectiveModel,
      file_id: fileId,
      // absolutely do not include audio_url when file_id is provided
    },
  } as const;
  const res = await fetch(`${BASE}/transcriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create transcription failed: ${res.status} ${await res.text()}`);
  return await res.json(); // { id, status, ... }
}

export async function getTranscription(id: string): Promise<{ status?: string }> {
  const res = await fetch(`${BASE}/transcriptions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Get transcription failed: ${res.status} ${await res.text()}`);
  return await res.json(); // { status, ... }
}

export async function waitForCompletion(id: string, opts?: { timeoutMs?: number; intervalMs?: number }): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 180000;
  const started = Date.now();
  let delay = opts?.intervalMs ?? 600;
  while (true) {
    if (Date.now() - started > timeoutMs) throw new Error("Transcription timeout (>180s)");
    const st = await getTranscription(id);
    const s = st?.status;
    if (s === "completed") return;
    if (s === "failed" || s === "canceled") throw new Error(`Transcription ${s}`);
    await sleep(Math.min(delay, 2000));
    delay = Math.min(Math.floor(delay * 1.5), 2000);
  }
}

export async function getTranscript(id: string): Promise<string> {
  let tries = 0, backoff = 300;
  while (tries < 8) {
    const res = await fetch(`${BASE}/transcriptions/${encodeURIComponent(id)}/transcript`);
    const raw = await res.text();
    let data: any;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (res.ok) {
      const tokens: any[] = data?.tokens || [];
      return tokens.map((t: any) => t?.text || "").join("");
    }

    if (res.status === 409 && data?.error_type === "transcription_invalid_state") {
      // Only retry a few times; backend may still be finalizing artifacts even after completed
      await sleep(backoff);
      backoff = Math.min(Math.floor(backoff * 1.6), 2000);
      tries++;
      continue;
    }

    throw new Error(`Get transcript failed: ${res.status} ${raw}`);
  }
  throw new Error("Get transcript timeout/retries exceeded");
}

export async function transcribeFile(file: File, opts?: { model?: string }): Promise<{ transcript: string; transcription_id: string }> {
  const up = await uploadFile(file);
  const tr = await createTranscription(up.id, opts?.model);
  const id = (tr as any)?.id;
  if (!id) throw new Error("Missing transcription id");
  await waitForCompletion(id);
  const transcript = await getTranscript(id);
  return { transcript, transcription_id: id };
}

// Backward compatible wrapper used elsewhere in the app
export async function transcribeWithSoniox(file: File): Promise<{ text: string; raw?: unknown }> {
  const { transcript, transcription_id } = await transcribeFile(file);
  return { text: transcript, raw: { transcription_id } };
}


