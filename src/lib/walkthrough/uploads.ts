import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BUCKETS, dataDir, db, deleteObject, getObject, putObject, signedUploadUrl, usingSupabase, type Row } from "../p4/db";
import { newId } from "../p4/ids";
import { audit } from "../p4/audit";
import { templateFor } from "./templates";
import { EXT, kindOf, LIMITS, minimizeMetadata, sniffMedia, validateDeclared } from "../uploads/media";
import type { Resolved } from "./service";
import { privacyGate } from "./privacy";

/**
 * Resumable uploads that never pass a large body through one serverless request:
 * - Supabase configured: the browser PUTs straight to a short-lived signed upload URL (private bucket), then we
 *   verify magic bytes and minimise metadata server-side.
 * - Dev/staging fallback: ≤3.5 MB chunks to /api/w/[token]/upload/[id]?index=n, resumable via GET status.
 */
export const uploadMode = () => (usingSupabase() ? "direct" : "chunked");
const chunkDir = (id: string) => path.join(dataDir(), "chunks", id.replace(/[^a-z0-9_]/gi, ""));

export async function initUpload(brand: string, r: Resolved, body: { step_id?: string; mime?: string; size?: number; name?: string }) {
  if (!r.editable && r.session.status !== "submitted") return { ok: false as const, status: 409, error: "Walkthrough closed" };
  const tpl = templateFor(String(r.session.service))!;
  const step = tpl.steps.find((s) => s.id === body.step_id);
  if (!step || (step.kind !== "photo" && step.kind !== "video" && step.kind !== "document")) return { ok: false as const, status: 400, error: "Unknown step" };
  const gate = privacyGate((r.session.progress as { answers?: Record<string, string | string[]> } | null)?.answers);
  if (!gate.ok) return { ok: false as const, status: 403, error: gate.message, reason: gate.reason };
  if (r.session.kind === "followup" && !((r.session.requested_steps as string[]) ?? []).includes(step.id)) return { ok: false as const, status: 400, error: "Step not requested" };
  const kind = kindOf(String(body.mime ?? ""));
  const fits = step.kind === "photo" ? kind === "image" : step.kind === "video" ? kind === "video" : kind === "document" || kind === "image";
  if (!kind || !fits) return { ok: false as const, status: 415, error: step.kind === "photo" ? "Please choose a photo (JPEG, PNG, WebP or HEIC)" : step.kind === "video" ? "Please choose a video (MP4, MOV or WebM)" : "Please choose a PDF or a photo of the plan" };
  const err = validateDeclared(kind, Number(body.size));
  if (err) return { ok: false as const, status: 413, error: err };
  const existing = (await db.list("media_assets", brand, { session_id: r.session.id })).filter((m) => m.step_id === step.id && m.status === "validated").length;
  if (existing >= step.max) return { ok: false as const, status: 409, error: `This step takes up to ${step.max} file${step.max > 1 ? "s" : ""}. Remove one first.` };
  const id = newId("up_");
  const key = `${brand}/${r.project.id}/${id}.${EXT[String(body.mime)] ?? "bin"}`;
  const mode = uploadMode();
  const direct = mode === "direct" ? await signedUploadUrl(BUCKETS.capture, key) : null;
  await db.insert("upload_sessions", brand, {
    id, project_id: r.project.id, session_id: r.session.id, status: "open", step_id: step.id, kind, declared_mime: body.mime, declared_size: Number(body.size),
    key, mode: direct ? "direct" : "chunked", chunks: Math.ceil(Number(body.size) / LIMITS.chunk), display_name: String(body.name ?? "file").replace(/[^\w .-]/g, "").slice(0, 60) || "file",
  });
  return { ok: true as const, upload_id: id, mode: direct ? "direct" : "chunked", chunk_size: LIMITS.chunk, chunks: Math.ceil(Number(body.size) / LIMITS.chunk), direct_url: direct };
}

async function getUpload(brand: string, r: Resolved, uploadId: string): Promise<Row | null> {
  const u = await db.get("upload_sessions", brand, uploadId);
  return u && u.session_id === r.session.id ? u : null; // scoped: another session's upload id is "not found"
}

export async function putChunk(brand: string, r: Resolved, uploadId: string, index: number, bytes: Buffer) {
  const u = await getUpload(brand, r, uploadId);
  if (!u || u.status !== "open" || u.mode !== "chunked") return { ok: false as const, status: 404, error: "Upload not found" };
  if (!Number.isInteger(index) || index < 0 || index >= Number(u.chunks)) return { ok: false as const, status: 400, error: "Bad chunk index" };
  if (bytes.length === 0 || bytes.length > LIMITS.chunk) return { ok: false as const, status: 413, error: "Chunk too large" };
  await fs.mkdir(chunkDir(uploadId), { recursive: true });
  await fs.writeFile(path.join(chunkDir(uploadId), String(index)), bytes);
  return { ok: true as const, received: await receivedChunks(uploadId) };
}

export async function receivedChunks(uploadId: string): Promise<number[]> {
  try { return (await fs.readdir(chunkDir(uploadId))).map(Number).filter(Number.isInteger).sort((a, b) => a - b); } catch { return []; }
}

export async function uploadStatus(brand: string, r: Resolved, uploadId: string) {
  const u = await getUpload(brand, r, uploadId);
  if (!u) return null;
  return { status: u.status, mode: u.mode, chunks: u.chunks, received: u.mode === "chunked" ? await receivedChunks(uploadId) : [] };
}

export async function completeUpload(brand: string, r: Resolved, uploadId: string) {
  const u = await getUpload(brand, r, uploadId);
  if (!u) return { ok: false as const, status: 404, error: "Upload not found" };
  if (u.status === "complete") return { ok: true as const, media_id: String(u.media_id), duplicate: true };
  let bytes: Buffer | null = null;
  if (u.mode === "chunked") {
    const got = await receivedChunks(uploadId);
    if (got.length !== Number(u.chunks)) return { ok: false as const, status: 409, error: "Upload incomplete", received: got };
    const parts: Buffer[] = [];
    for (let i = 0; i < Number(u.chunks); i++) parts.push(await fs.readFile(path.join(chunkDir(uploadId), String(i))));
    bytes = Buffer.concat(parts);
  } else {
    bytes = await getObject(`${BUCKETS.capture}/${u.key}`);
    if (!bytes) return { ok: false as const, status: 409, error: "Upload not received yet" };
  }
  const sniffed = sniffMedia(new Uint8Array(bytes.subarray(0, 64)));
  const kind = sniffed ? kindOf(sniffed) : null;
  const sizeErr = kind ? validateDeclared(kind, bytes.length) : "bad";
  if (!sniffed || !kind || kind !== u.kind || sizeErr) {
    await db.update("upload_sessions", brand, uploadId, { status: "rejected", reject_reason: !sniffed ? "magic bytes not a supported media type" : sizeErr ?? "type mismatch" });
    if (u.mode === "direct") await deleteObject(`${BUCKETS.capture}/${u.key}`);
    await fs.rm(chunkDir(uploadId), { recursive: true, force: true });
    return { ok: false as const, status: 415, error: "That file isn't a supported photo, video or plan." };
  }
  const { out, metadata } = minimizeMetadata(sniffed, bytes);
  const storagePath = await putObject(BUCKETS.capture, String(u.key), out, sniffed, u.mode === "direct");
  const media = await db.insert("media_assets", brand, {
    id: newId("med_"), project_id: u.project_id, session_id: u.session_id, step_id: u.step_id, kind: u.kind, status: "validated", mime: sniffed, size: out.length,
    storage_path: storagePath, metadata, av_scan: "not_configured", display_name: u.display_name, source: "customer_upload", retention: "project_lifetime",
    privacy: "customer_attested", ai_processing: "never", analytics: "never",
  });
  await db.update("upload_sessions", brand, uploadId, { status: "complete", media_id: media.id });
  await fs.rm(chunkDir(uploadId), { recursive: true, force: true });
  return { ok: true as const, media_id: media.id, duplicate: false };
}

/** Customer may remove their own upload until submit; staff deletions go through the admin (media.delete). */
export async function deleteMedia(brand: string, r: Resolved, mediaId: string, by: "customer" | { user: string; role: string }) {
  const m = await db.get("media_assets", brand, mediaId);
  if (!m || (by === "customer" && m.session_id !== r.session.id)) return { ok: false as const, status: 404 };
  if (by === "customer" && !r.editable) return { ok: false as const, status: 409 };
  await deleteObject(String(m.storage_path));
  await db.update("media_assets", brand, mediaId, { status: "deleted", deleted_by: by === "customer" ? "customer" : by.user, storage_path: null });
  await audit(brand, { actor: by, action: "media.deleted", target_type: "media", target_id: mediaId, detail: { project_id: m.project_id } });
  return { ok: true as const };
}
