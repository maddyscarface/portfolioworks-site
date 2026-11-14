// Usage: node scripts/hash-admin-password.mjs '<password>'  → value for the "pbkdf2" field in ADMIN_USERS_JSON.
import { pbkdf2Sync, randomBytes } from "node:crypto";
const pw = process.argv[2];
if (!pw || pw.length < 12) { console.error("Give a password of at least 12 characters."); process.exit(1); }
const salt = randomBytes(16);
const iter = 210000;
console.log(`${salt.toString("hex")}:${iter}:${pbkdf2Sync(pw, salt, iter, 32, "sha256").toString("hex")}`);
