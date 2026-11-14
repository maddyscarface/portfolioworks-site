import { createHash, randomBytes } from "node:crypto";

export const newId = (prefix = "") => `${prefix}${randomBytes(12).toString("hex")}`;
export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export const nowIso = () => new Date().toISOString();
/** Normalized-identifier hash used for suppression and dedupe (never stores the raw value twice). */
export const emailHash = (email?: string | null) => (email ? sha256(email.trim().toLowerCase()) : null);
