/**
 * globalSetup para test E2E multi-usuario contra backend REAL.
 *
 * Responsabilidades:
 *   1. Verificar que backend (:8000) y frontend (:5173) esten vivos
 *   2. Ejecutar scripts/testing/seed_e2e_multiuser.py y capturar IDs
 *   3. Exportar IDs via variables de entorno consumidas por el test
 *
 * Si alguna verificacion falla, aborta el run entero con error claro.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function httpPing(url: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // Cualquier respuesta (incluso 401/404) indica que el servidor esta vivo
      resolve((res.statusCode ?? 0) > 0);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function assertServerUp(url: string, name: string): Promise<void> {
  const up = await httpPing(url);
  if (!up) {
    throw new Error(
      `[globalSetup] ${name} no responde en ${url}. ` +
        'Asegurate de tener los servidores corriendo (screen sessions con backend Django en :8000 y frontend Vite en :5173).',
    );
  }
  // eslint-disable-next-line no-console
  console.log(`[globalSetup] ${name} OK -> ${url}`);
}

async function globalSetup(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[globalSetup] Verificando servidores...');
  await assertServerUp('http://localhost:8000/api/v1/', 'backend Django');
  const frontendUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
  await assertServerUp(frontendUrl + '/', 'frontend Vite');

  // Ejecutar seed. Usa venv_ubuntu si existe.
  const projectRoot = path.resolve(__dirname, '..', '..');
  const venvPython = path.join(projectRoot, 'venv_ubuntu', 'bin', 'python');
  const fallbackPython = 'python3';
  const pythonBin = fs.existsSync(venvPython) ? venvPython : fallbackPython;
  const seedScript = path.join(
    projectRoot,
    'scripts',
    'testing',
    'seed_e2e_multiuser.py',
  );

  // eslint-disable-next-line no-console
  console.log(`[globalSetup] Ejecutando seed: ${pythonBin} ${seedScript}`);
  let stdout = '';
  try {
    stdout = execSync(`"${pythonBin}" "${seedScript}"`, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 60000,
      shell: '/bin/bash',
    });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(
      `[globalSetup] Seed fallo: ${e.message}\nstdout:\n${e.stdout}\nstderr:\n${e.stderr}`,
    );
  }

  // Parsear ultimo bloque JSON de stdout (el script imprime logs antes)
  const match = stdout.match(/\{[\s\S]*\}\s*$/);
  if (!match) {
    throw new Error(
      `[globalSetup] No se encontro JSON en output del seed:\n${stdout}`,
    );
  }
  const data = JSON.parse(match[0]) as Record<string, string>;

  process.env.E2E_LANDLORD_EMAIL = data.landlord_email;
  process.env.E2E_TENANT_EMAIL = data.tenant_email;
  process.env.E2E_PASSWORD = data.password;
  process.env.E2E_PROPERTY_ID = data.property_id;
  process.env.E2E_MATCH_REQUEST_ID = data.match_request_id;
  process.env.E2E_CONTRACT_ID = data.contract_id;
  process.env.E2E_LANDLORD_ID = data.landlord_id;
  process.env.E2E_TENANT_ID = data.tenant_id;

  // eslint-disable-next-line no-console
  console.log('[globalSetup] Seed OK. IDs exportados a env:', {
    property_id: data.property_id,
    match_request_id: data.match_request_id,
  });
}

export default globalSetup;
