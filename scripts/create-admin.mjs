#!/usr/bin/env node
/**
 * Crée le premier administrateur dans la base D1.
 * Usage :
 *   node scripts/create-admin.mjs --email toi@example.com --name "Ton Nom" --password motdepasse
 *   node scripts/create-admin.mjs --email toi@example.com --name "Ton Nom" --password motdepasse --db-name test-tracker-db
 */

import { pbkdf2 as pbkdf2cb, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const pbkdf2 = promisify(pbkdf2cb);

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const email    = getArg('email');
const name     = getArg('name');
const password = getArg('password');
const dbName   = getArg('db-name') || 'test-tracker-db';

if (!email || !name || !password) {
  console.error('Usage: node scripts/create-admin.mjs --email EMAIL --name "Nom" --password PASSWORD');
  process.exit(1);
}

// ── Hash PBKDF2 (même format que functions/_lib/password.js) ─────────────────
const ITERATIONS = 100_000;
const salt = randomBytes(32);
const hashBuf = await pbkdf2(password, salt, ITERATIONS, 32, 'sha256');
const saltB64 = salt.toString('base64');
const hashB64 = hashBuf.toString('base64');
const passwordHash = `pbkdf2:sha256:${ITERATIONS}:${saltB64}:${hashB64}`;

// ── Insert en D1 ──────────────────────────────────────────────────────────────
const id = `user-${randomUUID()}`;
const sql = `INSERT INTO users (id, email, name, password_hash, is_active, is_admin, can_import, admin_plans) VALUES ('${id}', '${email.toLowerCase()}', '${name.replace(/'/g, "''")}', '${passwordHash}', 1, 1, 1, 1);`;

console.log(`\nCréation de l'admin : ${name} <${email}>`);
console.log(`DB : ${dbName}\n`);

try {
  execSync(`npx wrangler d1 execute ${dbName} --command "${sql.replace(/"/g, '\\"')}"`, {
    stdio: 'inherit',
  });
  console.log(`\n✓ Admin créé avec l'id : ${id}`);
  console.log('  Connecte-toi avec cet email et ce mot de passe.\n');
} catch (e) {
  console.error('\n✗ Erreur lors de l\'insertion. Assure-toi que wrangler est installé et configuré.');
  process.exit(1);
}
