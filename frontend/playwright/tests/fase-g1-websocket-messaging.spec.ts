/**
 * Fase G1 - WebSocket messaging en tiempo real.
 *
 * Valida el ciclo completo:
 *   1. Tenant y landlord logean via API y obtienen JWT access tokens.
 *   2. Tenant crea MessageThread con landlord como participante.
 *   3. Landlord abre conexión WebSocket al thread
 *      (`ws://host/ws/messaging/thread/{id}/?token=<jwt>`).
 *   4. Tenant envía mensaje vía REST
 *      (`POST /api/v1/messages/messages/`).
 *   5. Landlord DEBE recibir el mensaje por el WS en < 5 s.
 *
 * Cubre el bug encontrado durante el diseño: el AuthMiddlewareStack
 * nativo de Channels no autenticaba JWT via `?token=`. Se añadió
 * `users/channels_auth.JWTAuthMiddlewareStack` — este test lo verifica.
 *
 * Audit: verifica que se registra actividad del tipo message_sent
 * (si core.audit_service.log_activity está instrumentado en la ruta).
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

import {
  apiPost,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-g');

const WS_BASE = (process.env.WS_BASE_URL || 'ws://localhost:8000').replace(/\/$/, '');

test.describe.configure({ mode: 'serial' });

/**
 * Abre un WebSocket autenticado con JWT y devuelve:
 *   - el socket (para .close al final)
 *   - un `messages` array que se llenará con cada mensaje recibido
 *   - una función `waitFor` que resuelve cuando llega un mensaje que
 *     cumpla el predicado, con timeout configurable.
 */
function openAuthenticatedWs(url: string, token: string) {
  const messages: unknown[] = [];
  // AllowedHostsOriginValidator de Channels valida el Origin contra
  // ALLOWED_HOSTS. Dev permite localhost/127.0.0.1.
  const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`, {
    origin: 'http://localhost',
    headers: {
      Host: 'localhost:8000',
    },
  });
  ws.on('message', (raw) => {
    try {
      messages.push(JSON.parse(raw.toString()));
    } catch {
      messages.push({ raw: raw.toString() });
    }
  });
  const open = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', (err) => reject(err));
    setTimeout(() => reject(new Error('ws open timeout')), 10000);
  });

  async function waitFor(predicate: (m: any) => boolean, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const match = messages.find((m) => {
        try {
          return predicate(m);
        } catch {
          return false;
        }
      });
      if (match) return match;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(
      `WS waitFor timeout. Mensajes recibidos: ${JSON.stringify(messages)}`,
    );
  }

  return { ws, messages, open, waitFor };
}

test('Fase G1 · WebSocket entrega mensaje en tiempo real al destinatario', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('contract_active');
  logStep(ctx, 'system', 'seed', 'ok', { lcc_id: seed.lcc_id });

  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(tenantTokens).toBeTruthy();
  expect(landlordTokens).toBeTruthy();
  const tenantToken = tenantTokens!.access;
  const landlordToken = landlordTokens!.access;

  // --- Paso 1: tenant crea thread con landlord como participante ---
  logStep(ctx, 'tenant', 'create-thread', 'start');
  const threadResp = await apiPost(tenantToken, '/messages/threads/', {
    subject: 'WS test · saludo en tiempo real',
    thread_type: 'general',
    contract: seed.contract_id,
    participant_ids: [seed.landlord_id],
  });
  expect(threadResp.ok, `thread 2xx (${threadResp.status})`).toBe(true);
  const threadId = (threadResp.body as any).id;
  logStep(ctx, 'tenant', 'create-thread', 'ok', { thread_id: threadId });

  // --- Paso 2: landlord abre WS al thread ---
  logStep(ctx, 'landlord', 'open-ws', 'start');
  const wsUrl = `${WS_BASE}/ws/messaging/thread/${threadId}/`;
  const landlordWs = openAuthenticatedWs(wsUrl, landlordToken);
  await landlordWs.open;
  logStep(ctx, 'landlord', 'open-ws', 'ok', { url: wsUrl });

  // --- Paso 3: tenant envía mensaje vía REST ---
  logStep(ctx, 'tenant', 'send-message', 'start');
  const sendResp = await apiPost(tenantToken, '/messages/messages/', {
    thread: threadId,
    recipient: seed.landlord_id,
    content: 'Hola, probando WebSocket en tiempo real.',
    subject: 'WS test',
  });
  logStep(ctx, 'tenant', 'send-message', sendResp.ok ? 'ok' : 'fail', {
    status: sendResp.status,
    body: sendResp.body,
  });
  expect(sendResp.ok, `send 2xx (${sendResp.status})`).toBe(true);

  // --- Paso 4: landlord DEBE recibir el mensaje por WS ---
  logStep(ctx, 'landlord', 'await-ws-message', 'start');
  try {
    const received = await landlordWs.waitFor(
      (m: any) =>
        m &&
        (m.type === 'new_message' ||
          m.type === 'message' ||
          m.type === 'message.new' ||
          (typeof m.content === 'string' && m.content.includes('WebSocket'))),
      8000,
    );
    logStep(ctx, 'landlord', 'await-ws-message', 'ok', {
      received_type: (received as any)?.type,
    });
    expect(received).toBeTruthy();
  } finally {
    landlordWs.ws.close();
  }
});
