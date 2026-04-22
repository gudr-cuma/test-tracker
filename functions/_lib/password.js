/**
 * PBKDF2-SHA256 via Web Crypto API (native Cloudflare Workers)
 * Format : "pbkdf2:sha256:<iterations>:<salt_b64>:<hash_b64>"
 */

const ITERATIONS = 100_000;

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function unb64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function hashPassword(password, iterations = ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const hashBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  );
  return `pbkdf2:sha256:${iterations}:${b64(salt)}:${b64(hashBuf)}`;
}

export async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;
  const iterations = parseInt(parts[2], 10);
  const salt = unb64(parts[3]);
  const expected = unb64(parts[4]);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const actualBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  );
  const actual = new Uint8Array(actualBuf);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

const DUMMY_HASH =
  'pbkdf2:sha256:100000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function dummyVerify() {
  await verifyPassword('dummy-password-to-prevent-timing-leak', DUMMY_HASH);
  return false;
}
