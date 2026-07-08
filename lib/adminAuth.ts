const ADMIN_SESSION_COOKIE = "admin_auth";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function sign(value: string) {
  const secret = getSessionSecret();

  if (!secret) return "";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return base64UrlEncode(new Uint8Array(signature));
}

export async function createAdminSessionValue(now = Date.now()) {
  const issuedAt = String(now);
  const signature = await sign(issuedAt);

  if (!signature) return "";

  return `${issuedAt}.${signature}`;
}

export async function verifyAdminSessionValue(value?: string) {
  if (!value) return false;

  const [issuedAt, signature] = value.split(".");
  const issuedAtMs = Number(issuedAt);

  if (!issuedAt || !signature || !Number.isFinite(issuedAtMs)) {
    return false;
  }

  if (Date.now() - issuedAtMs > ADMIN_SESSION_MAX_AGE * 1000) {
    return false;
  }

  const expectedSignature = await sign(issuedAt);

  return timingSafeEqual(signature, expectedSignature);
}

export { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE };
