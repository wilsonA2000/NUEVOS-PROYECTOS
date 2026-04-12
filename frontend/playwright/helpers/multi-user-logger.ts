/**
 * Logger de eventos por actor (tenant / landlord) para el test E2E multi-usuario.
 *
 * Escribe JSONL por actor en <runDir>/<actor>-<type>.jsonl
 * Tipos: console, requests, responses, steps
 *
 * Tambien expone helpers para:
 *   - Marcar hitos del workflow
 *   - Tomar screenshots numerados
 *   - Verificar estado del backend via API directa
 */
import { Page, APIRequestContext, request as apiRequest } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type Actor = 'tenant' | 'landlord';

export interface RunContext {
  runDir: string;
  screenshotsDir: string;
  stepCounter: { value: number };
}

const API_BASE = 'http://localhost:8000/api/v1';

export function createRunContext(baseDir: string): RunContext {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(baseDir, `run-${ts}`);
  const screenshotsDir = path.join(runDir, 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  return { runDir, screenshotsDir, stepCounter: { value: 0 } };
}

function appendJsonl(filePath: string, data: unknown): void {
  fs.appendFileSync(filePath, JSON.stringify(data) + '\n', 'utf8');
}

export function attachLoggers(page: Page, actor: Actor, ctx: RunContext): void {
  const consolePath = path.join(ctx.runDir, `${actor}-console.jsonl`);
  const requestsPath = path.join(ctx.runDir, `${actor}-requests.jsonl`);
  const responsesPath = path.join(ctx.runDir, `${actor}-responses.jsonl`);

  page.on('console', (msg) => {
    appendJsonl(consolePath, {
      ts: new Date().toISOString(),
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on('pageerror', (err) => {
    appendJsonl(consolePath, {
      ts: new Date().toISOString(),
      type: 'pageerror',
      text: err.message,
      stack: err.stack,
    });
  });

  page.on('request', (req) => {
    const url = req.url();
    // Solo capturar llamadas a nuestra API (no assets estaticos)
    if (!url.includes('/api/')) return;
    appendJsonl(requestsPath, {
      ts: new Date().toISOString(),
      method: req.method(),
      url,
      postData: req.postData()?.slice(0, 2000) ?? null,
    });
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    let bodyPreview: string | null = null;
    try {
      const text = await res.text();
      bodyPreview = text.slice(0, 1000);
    } catch {
      bodyPreview = null;
    }
    appendJsonl(responsesPath, {
      ts: new Date().toISOString(),
      status: res.status(),
      url,
      body: bodyPreview,
    });
  });
}

export function logStep(
  ctx: RunContext,
  actor: Actor | 'system',
  step: string,
  status: 'start' | 'ok' | 'fail',
  notes?: Record<string, unknown>,
): void {
  const stepsPath = path.join(ctx.runDir, 'steps.jsonl');
  appendJsonl(stepsPath, {
    ts: new Date().toISOString(),
    actor,
    step,
    status,
    ...notes,
  });
  // Tambien a consola para feedback inmediato
  const icon = status === 'ok' ? 'OK' : status === 'fail' ? 'FAIL' : '...';
  // eslint-disable-next-line no-console
  console.log(`[${icon}] ${actor} :: ${step}${notes ? ' ' + JSON.stringify(notes) : ''}`);
}

export async function snap(
  page: Page,
  ctx: RunContext,
  actor: Actor,
  label: string,
): Promise<void> {
  ctx.stepCounter.value += 1;
  const n = String(ctx.stepCounter.value).padStart(2, '0');
  const safeLabel = label.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const file = path.join(ctx.screenshotsDir, `${n}-${actor}-${safeLabel}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn(`[snap] failed for ${actor}/${label}:`, err.message);
  });
}

/** Obtiene un token JWT via API directa (POST /users/auth/login/). */
export async function getAuthToken(
  email: string,
  password: string,
): Promise<{ access: string; refresh: string } | null> {
  const req: APIRequestContext = await apiRequest.newContext();
  try {
    const resp = await req.post(`${API_BASE}/users/auth/login/`, {
      data: { email, password },
      timeout: 15000,
    });
    if (!resp.ok()) return null;
    const body = (await resp.json()) as { access?: string; refresh?: string };
    if (!body.access) return null;
    return { access: body.access, refresh: body.refresh ?? '' };
  } finally {
    await req.dispose();
  }
}

/** POST a un endpoint. Si accessToken es "" omite Authorization (endpoints publicos). */
export async function apiPost(
  accessToken: string,
  endpoint: string,
  data: unknown = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const req = await apiRequest.newContext({ extraHTTPHeaders: headers });
  try {
    const resp = await req.post(`${API_BASE}${endpoint}`, {
      data,
      timeout: 30000,
    });
    let body: unknown = null;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text();
    }
    return { ok: resp.ok(), status: resp.status(), body };
  } finally {
    await req.dispose();
  }
}

/**
 * Invoca el seed Python con el modo dado y devuelve el JSON final.
 * Usa venv_ubuntu si existe.
 */
export function runSeed(mode: string): Record<string, string> {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const venvPython = path.join(projectRoot, 'venv_ubuntu', 'bin', 'python');
  const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python3';
  const seedScript = path.join(projectRoot, 'scripts', 'testing', 'seed_e2e_multiuser.py');
  const stdout = execSync(`"${pythonBin}" "${seedScript}" ${mode}`, {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 120_000,
    shell: '/bin/bash',
    maxBuffer: 4 * 1024 * 1024,
  });
  const match = stdout.match(/\{[\s\S]*\}\s*$/);
  if (!match) {
    throw new Error(`seed no devolvio JSON:\n${stdout}`);
  }
  return JSON.parse(match[0]);
}

export async function apiGet(
  accessToken: string,
  endpoint: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const req = await apiRequest.newContext({ extraHTTPHeaders: headers });
  try {
    const resp = await req.get(`${API_BASE}${endpoint}`, { timeout: 30000 });
    let body: unknown = null;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text();
    }
    return { ok: resp.ok(), status: resp.status(), body };
  } finally {
    await req.dispose();
  }
}
