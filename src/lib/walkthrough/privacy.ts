import { PRIVACY_ACKS } from "./templates";

/**
 * Tenant-privacy gate for walkthrough uploads (server-enforced; the UI mirrors it).
 * - All three privacy promises must be confirmed (no people, no personal items/documents, work areas only).
 * - Occupancy must be answered, and an occupied unit whose resident hasn't been told gets NO uploads: the owner
 *   arranges access instead. Common-area / exterior captures are allowed once the promises are confirmed.
 * Media is never sent to an AI/LLM or to advertising/analytics, and staff can place any file on privacy hold.
 */
export type PrivacyAnswers = Record<string, string | string[] | undefined> | undefined | null;

export function privacyGate(answers: PrivacyAnswers): { ok: true } | { ok: false; reason: "privacy_not_confirmed" | "occupancy_missing" | "resident_not_notified"; message: string } {
  const acks = new Set(Array.isArray(answers?.privacy) ? answers!.privacy : []);
  if (!PRIVACY_ACKS.every((a) => acks.has(a))) return { ok: false, reason: "privacy_not_confirmed", message: "Please confirm the three privacy points before adding photos or video." };
  const occ = Array.isArray(answers?.occupancy) ? answers!.occupancy[0] : answers?.occupancy;
  if (!occ) return { ok: false, reason: "occupancy_missing", message: "Tell us whether the unit is vacant or occupied first." };
  if (occ === "occupied_not_notified") return { ok: false, reason: "resident_not_notified", message: "Please don't take photos inside an occupied unit until the resident has been told. You can still send measurements and notes, or ask us to arrange a visit." };
  return { ok: true };
}
