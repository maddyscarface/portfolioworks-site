/** Browser-side upload helpers for the guided walkthrough (resumable chunks, retries, privacy-preserving re-encode). */

export type InitResponse = { ok: boolean; error?: string; upload_id?: string; mode?: "direct" | "chunked"; chunk_size?: number; chunks?: number; direct_url?: string | null };

async function api<T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<T & { ok: boolean; error?: string }> {
  const r = await fetch(url, { ...init, headers: { ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) }, cache: "no-store" });
  const j = await r.json().catch(() => ({ ok: false, error: `Network error (${r.status})` }));
  return { ...j, ok: r.ok && j.ok !== false } as T & { ok: boolean; error?: string };
}
export { api };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(600 * 2 ** i); }
  }
  throw last;
}

/**
 * Photos are re-encoded to JPEG through a canvas: this drops EXIF/GPS location data on the device and keeps uploads
 * small on mobile networks. HEIC (which most browsers can't decode) and videos are sent as-is; the server strips
 * JPEG/PNG metadata again and records when it could not.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || /heic|heif/i.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const max = 2560;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.86));
    return blob && blob.size > 0 ? blob : file;
  } catch { return file; }
}

function xhrPut(url: string, body: Blob, type: string, onProgress: (f: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Upload failed (${x.status})`)));
    x.onerror = () => reject(new Error("Network problem during upload"));
    x.send(body);
  });
}

export async function uploadToStep(token: string, stepId: string, file: File, onProgress: (f: number) => void): Promise<string> {
  const base = `/api/w/${encodeURIComponent(token)}`;
  const blob = file.type.startsWith("image/") ? await preparePhoto(file) : file;
  const mime = blob.type || file.type;
  const name = file.name.replace(/\.(heic|heif|png|webp)$/i, blob.type === "image/jpeg" ? ".jpg" : "$&");
  const init = await api<InitResponse>(`${base}/upload`, { method: "POST", body: JSON.stringify({ step_id: stepId, mime, size: blob.size, name }) });
  if (!init.ok || !init.upload_id) throw new Error(init.error || "Couldn't start the upload");
  const id = init.upload_id;
  if (init.mode === "direct" && init.direct_url) {
    await retry(() => xhrPut(init.direct_url!, blob, mime, onProgress), 3);
  } else {
    const size = init.chunk_size!; const n = init.chunks!;
    const st = await api<{ received?: number[] }>(`${base}/upload/${id}`);
    const have = new Set(st.received ?? []);
    for (let i = 0; i < n; i++) {
      if (have.has(i)) { onProgress((i + 1) / n); continue; }
      const part = blob.slice(i * size, Math.min(blob.size, (i + 1) * size));
      await retry(async () => {
        const r = await fetch(`${base}/upload/${id}?index=${i}`, { method: "PUT", body: part, headers: { "Content-Type": "application/octet-stream" } });
        if (!r.ok) { const j = await r.json().catch(() => ({})); if (r.status === 413 || r.status === 404) throw Object.assign(new Error(j.error || "Upload rejected"), { fatal: true }); throw new Error(j.error || `Chunk ${i + 1} failed`); }
      });
      onProgress((i + 1) / n);
    }
  }
  const done = await retry(async () => { const c = await api<{ media_id?: string }>(`${base}/upload/${id}/complete`, { method: "POST" }); if (!c.ok && /incomplete|not received/i.test(c.error ?? "")) throw new Error(c.error); return c; }, 3);
  if (!done.ok || !done.media_id) throw new Error(done.error || "Upload couldn't be verified");
  return done.media_id;
}
