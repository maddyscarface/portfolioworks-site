/**
 * Upload validation for walkthrough media: declared size/MIME limits, magic-byte sniffing (the declared type is never
 * trusted), and metadata minimisation (EXIF/XMP/IPTC incl. GPS removed from JPEG; text/EXIF chunks from PNG).
 */
export type MediaKind = "image" | "video" | "document";
export const LIMITS = { image: 25 * 1024 * 1024, video: 300 * 1024 * 1024, document: 20 * 1024 * 1024, chunk: 3.5 * 1024 * 1024 } as const;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
/** Floor plans only (document steps). */
export const DOCUMENT_TYPES = ["application/pdf"] as const;
export const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "application/pdf": "pdf" };

const hex = (b: Uint8Array, s: number, n: number) => Array.from(b.slice(s, s + n)).map((x) => x.toString(16).padStart(2, "0")).join("");
const ascii = (b: Uint8Array, s: number, n: number) => String.fromCharCode(...b.slice(s, s + n));

export function sniffMedia(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (ascii(b, 0, 5) === "%PDF-") return "application/pdf";
  if (hex(b, 0, 3) === "ffd8ff") return "image/jpeg";
  if (hex(b, 0, 8) === "89504e470d0a1a0a") return "image/png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  if (hex(b, 0, 4) === "1a45dfa3") return "video/webm";
  if (ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (/^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(brand)) return "image/heic";
    if (brand === "qt  ") return "video/quicktime";
    if (/^(isom|iso2|iso4|iso5|iso6|mp41|mp42|avc1|M4V |dash|3gp4|3gp5|3g2a|MSNV)$/.test(brand)) return "video/mp4";
  }
  return null;
}

export function kindOf(mime: string): MediaKind | null {
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) return "image";
  if ((VIDEO_TYPES as readonly string[]).includes(mime)) return "video";
  if ((DOCUMENT_TYPES as readonly string[]).includes(mime)) return "document";
  return null;
}

export function validateDeclared(kind: MediaKind, size: number) {
  if (!Number.isFinite(size) || size <= 0) return "Empty file";
  if (size > LIMITS[kind]) return kind === "image" ? "Photos must be under 25 MB" : kind === "document" ? "Plans must be under 20 MB" : "Videos must be under 300 MB (about 2 minutes)";
  return null;
}

/** Remove APP1 (EXIF/XMP) and APP13 (IPTC) segments from a JPEG. Image data is untouched. */
export function stripJpegMetadata(buf: Buffer): { out: Buffer; removed: number } {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return { out: buf, removed: 0 };
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let i = 2; let removed = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) { parts.push(buf.subarray(i)); break; }
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) { parts.push(buf.subarray(i)); break; } // start of scan / end: copy the rest
    if (marker >= 0xd0 && marker <= 0xd7) { parts.push(buf.subarray(i, i + 2)); i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    const seg = buf.subarray(i, i + 2 + len);
    if (marker === 0xe1 || marker === 0xed) removed++; else parts.push(seg);
    i += 2 + len;
  }
  return { out: Buffer.concat(parts), removed };
}

/** Remove eXIf and textual chunks (tEXt/iTXt/zTXt/tIME) from a PNG. */
export function stripPngMetadata(buf: Buffer): { out: Buffer; removed: number } {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return { out: buf, removed: 0 };
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let i = 8; let removed = 0;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.subarray(i + 4, i + 8).toString("ascii");
    const chunk = buf.subarray(i, i + 12 + len);
    if (["eXIf", "tEXt", "iTXt", "zTXt", "tIME"].includes(type)) removed++; else parts.push(chunk);
    i += 12 + len;
    if (type === "IEND") break;
  }
  return { out: Buffer.concat(parts), removed };
}

/** Returns sanitized bytes plus a note about what metadata handling was possible. */
export function minimizeMetadata(mime: string, buf: Buffer): { out: Buffer; metadata: "stripped" | "none_found" | "not_stripped_video" | "not_stripped_document" | "not_stripped_format" } {
  if (mime === "image/jpeg") { const r = stripJpegMetadata(buf); return { out: r.out, metadata: r.removed ? "stripped" : "none_found" }; }
  if (mime === "image/png") { const r = stripPngMetadata(buf); return { out: r.out, metadata: r.removed ? "stripped" : "none_found" }; }
  if (mime.startsWith("video/")) return { out: buf, metadata: "not_stripped_video" };
  if (mime === "application/pdf") return { out: buf, metadata: "not_stripped_document" };
  return { out: buf, metadata: "not_stripped_format" };
}
