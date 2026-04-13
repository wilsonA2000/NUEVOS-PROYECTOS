/**
 * Button auditor: ejecuta una lista de acciones UI sobre una página
 * y produce un summary de cuáles funcionaron, cuáles fallaron y cuáles
 * no se encontraron.
 *
 * Se usa desde button-audit.spec.ts para auditar Profile, Settings,
 * Resume, ResumeEdit en batch.
 */
import { Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { Actor, RunContext, logStep, snap } from './multi-user-logger';

export type ActionKind =
  | 'click'
  | 'fill'
  | 'select'     // select MUI (click y elige option por texto)
  | 'check'      // checkbox/switch: asegura estado "checked"
  | 'uncheck'    // asegura estado "unchecked"
  | 'toggle'     // switch: click para alternar
  | 'upload'     // input[type=file]
  | 'tab-click'  // click en un <Tab> MUI por label
  | 'exists';    // solo verifica que el selector exista (smoke)

/** Selector flexible: string CSS, o locator pre-construido, o {role, name} */
export type SelectorSpec =
  | string
  | Locator
  | { role: Parameters<Page['getByRole']>[0]; name: string | RegExp; exact?: boolean }
  | { label: string | RegExp; exact?: boolean }
  | { text: string | RegExp };

export interface AuditAction {
  name: string;                    // "profile:edit-first-name"
  selector: SelectorSpec;
  kind: ActionKind;
  value?: string;                  // para fill / select / upload (path)
  /** Si existe, espera respuesta de API con este path y método antes de marcar ok. */
  expectedApi?: { method: string; pathMatch: RegExp; timeoutMs?: number };
  /** Si el selector no existe, no falla; solo loguea not_found. */
  skipIfNotFound?: boolean;
  /** Opcional: milisegundos a esperar tras la acción antes de screenshot. */
  postDelayMs?: number;
}

export interface AuditSummary {
  actor: Actor;
  page_label: string;
  total: number;
  ok: number;
  fail: number;
  not_found: number;
  slow: number;                    // acciones que tardaron >3s
  duration_ms: number;
  failures: Array<{ name: string; reason: string; status?: number }>;
  not_found_list: string[];
}

function resolveLocator(page: Page, sel: SelectorSpec): Locator {
  if (typeof sel === 'string') return page.locator(sel);
  if ('role' in sel) return page.getByRole(sel.role, { name: sel.name, exact: sel.exact });
  if ('label' in sel) return page.getByLabel(sel.label, { exact: sel.exact });
  if ('text' in sel) return page.getByText(sel.text);
  return sel as Locator; // Locator pre-construido
}

function describeSelector(sel: SelectorSpec): string {
  if (typeof sel === 'string') return sel;
  if ('role' in sel) return `role=${sel.role} name=${sel.name}`;
  if ('label' in sel) return `label=${sel.label}`;
  if ('text' in sel) return `text=${sel.text}`;
  return '[Locator]';
}

export async function runAudit(
  page: Page,
  ctx: RunContext,
  actor: Actor,
  pageLabel: string,
  actions: AuditAction[],
): Promise<AuditSummary> {
  const summary: AuditSummary = {
    actor,
    page_label: pageLabel,
    total: actions.length,
    ok: 0,
    fail: 0,
    not_found: 0,
    slow: 0,
    duration_ms: 0,
    failures: [],
    not_found_list: [],
  };

  const tStart = Date.now();

  for (const action of actions) {
    const actionStart = Date.now();
    const loc = resolveLocator(page, action.selector);
    const selDesc = describeSelector(action.selector);

    // Verificar existencia
    const count = await loc.count().catch(() => 0);
    if (count === 0) {
      summary.not_found++;
      summary.not_found_list.push(`${action.name} (${selDesc})`);
      logStep(ctx, actor, action.name, action.skipIfNotFound ? 'ok' : 'fail', {
        reason: 'selector not found',
        selector: selDesc,
      });
      continue;
    }

    // Preparar escucha de API si aplica
    let apiPromise: Promise<unknown> | null = null;
    if (action.expectedApi) {
      const { method, pathMatch, timeoutMs = 10000 } = action.expectedApi;
      apiPromise = page
        .waitForResponse(
          (resp) =>
            resp.request().method() === method && pathMatch.test(resp.url()),
          { timeout: timeoutMs },
        )
        .catch(() => null);
    }

    let actionOk = true;
    let failReason: string | null = null;
    let apiStatus: number | undefined;

    try {
      const el = loc.first();
      switch (action.kind) {
        case 'click':
          await el.click({ timeout: 5000 });
          break;
        case 'fill':
          await el.fill(action.value ?? '', { timeout: 5000 });
          break;
        case 'select': {
          // MUI select: click abre el menú, luego elegir option por texto
          await el.click({ timeout: 5000 });
          if (action.value) {
            await page
              .getByRole('option', { name: new RegExp(action.value, 'i') })
              .first()
              .click({ timeout: 5000 });
          }
          break;
        }
        case 'check':
          await el.check({ timeout: 5000 });
          break;
        case 'uncheck':
          await el.uncheck({ timeout: 5000 });
          break;
        case 'toggle':
          await el.click({ timeout: 5000 });
          break;
        case 'upload':
          await el.setInputFiles(action.value ?? '', { timeout: 5000 });
          break;
        case 'tab-click':
          await el.click({ timeout: 5000 });
          break;
        case 'exists':
          // ya se verificó count > 0
          break;
      }
    } catch (err) {
      actionOk = false;
      failReason = err instanceof Error ? err.message.slice(0, 200) : String(err);
    }

    if (action.postDelayMs) {
      await page.waitForTimeout(action.postDelayMs);
    }

    // Si se esperaba una API, verificar resultado
    if (apiPromise) {
      const resp = (await apiPromise) as
        | { status(): number; url(): string }
        | null;
      if (!resp) {
        actionOk = false;
        failReason = failReason ?? 'API esperada no recibida';
      } else {
        apiStatus = resp.status();
        if (apiStatus >= 400) {
          actionOk = false;
          failReason = `API respondió ${apiStatus}`;
        }
      }
    }

    // Screenshot solo si pasó (para evidencia)
    await snap(page, ctx, actor, `${pageLabel}-${action.name}`.slice(0, 60));

    const duration = Date.now() - actionStart;
    if (duration > 3000) summary.slow++;

    if (actionOk) {
      summary.ok++;
      logStep(ctx, actor, action.name, 'ok', {
        duration_ms: duration,
        api_status: apiStatus,
      });
    } else {
      summary.fail++;
      summary.failures.push({
        name: action.name,
        reason: failReason || 'unknown',
        status: apiStatus,
      });
      logStep(ctx, actor, action.name, 'fail', {
        duration_ms: duration,
        reason: failReason,
        api_status: apiStatus,
      });
    }
  }

  summary.duration_ms = Date.now() - tStart;

  // Persistir summary parcial (se sobreescribe con el final al terminar cada página)
  try {
    const summariesDir = path.join(ctx.runDir, 'summaries');
    fs.mkdirSync(summariesDir, { recursive: true });
    fs.writeFileSync(
      path.join(summariesDir, `${actor}-${pageLabel}.json`),
      JSON.stringify(summary, null, 2),
    );
  } catch {
    /* ignore */
  }

  return summary;
}

/** Escribe un summary global combinando múltiples summaries parciales. */
export function writeGlobalSummary(
  ctx: RunContext,
  actor: Actor,
  summaries: AuditSummary[],
): void {
  const total = summaries.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      ok: acc.ok + s.ok,
      fail: acc.fail + s.fail,
      not_found: acc.not_found + s.not_found,
      slow: acc.slow + s.slow,
      duration_ms: acc.duration_ms + s.duration_ms,
    }),
    { total: 0, ok: 0, fail: 0, not_found: 0, slow: 0, duration_ms: 0 },
  );

  const global = {
    actor,
    timestamp: new Date().toISOString(),
    ...total,
    pages: summaries.map((s) => ({
      page_label: s.page_label,
      total: s.total,
      ok: s.ok,
      fail: s.fail,
      not_found: s.not_found,
      failures: s.failures,
      not_found_list: s.not_found_list,
    })),
  };

  fs.writeFileSync(path.join(ctx.runDir, 'summary.json'), JSON.stringify(global, null, 2));
}
