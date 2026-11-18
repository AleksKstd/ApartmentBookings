// Usage: npm run generate-secrets
// Prints fresh random values for the secrets the app needs. Paste them into Vercel
// (Settings → Environment Variables) or .env.local. Run again to rotate.
import { randomBytes } from "node:crypto";

const secret = (bytes) => randomBytes(bytes).toString("base64url");

console.log(`ADMIN_SESSION_SECRET=${secret(48)}`);
console.log(`ICAL_EXPORT_TOKEN=${secret(24)}`);
console.log(`CRON_SECRET=${secret(32)}`);
console.log("");
console.log("# Admin password hash: npm run hash-password -- \"a long, unique passphrase\"");
