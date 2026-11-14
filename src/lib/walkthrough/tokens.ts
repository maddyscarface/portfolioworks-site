import { randomBytes } from "node:crypto";
import { sha256 } from "../p4/ids";

/** Invite tokens: 32 random bytes (base64url). Only the SHA-256 hash is stored. Expiring, revocable, scoped to one session. */
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (t: string) => sha256(`wt1:${t}`);
export const tokenShapeOk = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(t);
export const INITIAL_TTL_DAYS = 14;
export const FOLLOWUP_TTL_DAYS = 7;
export const expiresIn = (days: number, now = Date.now()) => new Date(now + days * 86400_000).toISOString();
