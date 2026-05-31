import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPathArg = process.argv.find((arg) => arg.startsWith('--env='));
const envPath = resolve(envPathArg ? envPathArg.slice('--env='.length) : '.env');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }
  return out;
}

const env = { ...loadEnv(envPath), ...process.env };
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_GERAR_PLANO_ENDPOINT'];
const missing = required.filter((key) => !env[key]);

function mask(value) {
  if (!value) return '(vazio)';
  if (value.length <= 12) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function log(status, msg) {
  const icon = status === 'ok' ? 'OK' : status === 'warn' ? 'WARN' : 'FAIL';
  console.log(`[${icon}] ${msg}`);
}

if (missing.length) {
  for (const key of missing) log('fail', `${key} ausente em ${envPath}`);
  process.exit(1);
}

const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\/$/, '');
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const endpoint = env.VITE_GERAR_PLANO_ENDPOINT;
const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};

console.log(`Ambiente: ${envPath}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Anon key: ${mask(anonKey)}`);
console.log(`Edge Function: ${endpoint}`);

const tables = [
  'students',
  'classes',
  'class_enrollments',
  'evaluations',
  'scout_matches',
  'scout_points',
  'planos',
  'avaliacoes',
];

async function checkTable(table) {
  const url = `${supabaseUrl}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, { headers });
  const body = await res.text();
  if (res.ok) {
    log('ok', `REST ${table}: acessível (${res.status})`);
    return true;
  }
  if (res.status === 401 || res.status === 403) {
    log('warn', `REST ${table}: existe, mas RLS/permissão bloqueou anon (${res.status})`);
    return true;
  }
  log('fail', `REST ${table}: ${res.status} ${body.slice(0, 180)}`);
  return false;
}

async function checkEdgeFunction() {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'listar', teacherId: 'codex-validation' }),
  });
  const body = await res.text();
  if (!res.ok) {
    log('fail', `Edge gerar-plano: ${res.status} ${body.slice(0, 220)}`);
    return false;
  }
  try {
    const data = JSON.parse(body);
    if (Array.isArray(data.planos)) {
      log('ok', `Edge gerar-plano: ação listar respondeu (${data.planos.length} planos)`);
      return true;
    }
  } catch {
    // handled below
  }
  log('warn', `Edge gerar-plano: respondeu, mas formato inesperado: ${body.slice(0, 220)}`);
  return true;
}

async function checkAuthEndpoint() {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'codex-invalid-login-check@example.com',
      password: 'not-a-real-password',
    }),
  });
  const body = await res.text();
  if (res.status === 400 && /invalid|credentials|login/i.test(body)) {
    log('ok', 'Auth password endpoint: acessível (credenciais inválidas rejeitadas)');
    return true;
  }
  if (res.ok) {
    log('warn', 'Auth password endpoint: respondeu OK para credenciais de teste inesperadas');
    return true;
  }
  log('fail', `Auth password endpoint: ${res.status} ${body.slice(0, 220)}`);
  return false;
}

let ok = true;
for (const table of tables) ok = (await checkTable(table)) && ok;
ok = (await checkEdgeFunction()) && ok;
ok = (await checkAuthEndpoint()) && ok;

if (!ok) process.exit(1);
