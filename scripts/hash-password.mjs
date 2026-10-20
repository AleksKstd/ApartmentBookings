// Usage: npm run hash-password -- "your strong password"
// Prints a value for ADMIN_PASSWORD_HASH (scrypt, same format as src/lib/auth/password.ts).
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Provide a password of at least 12 characters: npm run hash-password -- \"…\"");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`);
