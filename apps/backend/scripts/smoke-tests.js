/*
  Smoke tests for key API routes: health, auth/login, beneficiarias, formularios
  Usage:
    POSTGRES must be running and backend app started on PORT.
    Env vars (optional):
      SMOKE_BASE_URL (default http://localhost:3000)
      SMOKE_EMAIL (default bruno@move.com)
      SMOKE_PASSWORD (default 15002031)
*/

const { createCookieJar, storeCookies, cookieHeader } = require('./utils/cookies');
const { fetchCsrfToken, extractSetCookiesFromFetchHeaders } = require('./utils/csrf');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || 'bruno@move.com';
const PASSWORD = process.env.SMOKE_PASSWORD || '15002031';

const cookieJar = createCookieJar();

function applyCookieHeader(headers = {}) {
  const header = cookieHeader(cookieJar);
  if (header) {
    headers.Cookie = header;
  }
  return headers;
}

async function csrfHeaders(base = {}) {
  const token = await fetchCsrfToken(`${BASE_URL}/api`, cookieJar);
  return applyCookieHeader({ ...base, 'X-CSRF-Token': token });
}

function captureCookies(response) {
  storeCookies(cookieJar, extractSetCookiesFromFetchHeaders(response.headers));
}

function log(title, ok, extra = '') {
  const status = ok ? '✅' : '❌';
  console.log(`${status} ${title}${extra ? ' - ' + extra : ''}`);
}

async function main() {
  let beneficiariaId = null;

  // 1) Health check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    log('GET /health', res.ok, `status=${res.status}`);
  } catch (e) {
    log('GET /health', false, e.message);
    return process.exit(1);
  }

  // 2) Auth login -> capture auth_token cookie
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    captureCookies(res);
    const ok = res.ok && cookieHeader(cookieJar).includes('auth_token=');
    log('POST /api/auth/login', ok, `status=${res.status}`);
    if (!ok) return process.exit(1);
  } catch (e) {
    log('POST /api/auth/login', false, e.message);
    return process.exit(1);
  }

  // 3) List beneficiarias
  try {
    const res = await fetch(`${BASE_URL}/api/beneficiarias`, {
      headers: applyCookieHeader()
    });
    captureCookies(res);
    const json = await res.json().catch(() => ({}));
    const ok = res.ok;
    log('GET /api/beneficiarias', ok, `status=${res.status}`);
    if (ok && json && json.data && Array.isArray(json.data) && json.data.length > 0) {
      beneficiariaId = json.data[0].id;
    }
  } catch (e) {
    log('GET /api/beneficiarias', false, e.message);
  }

  // 4) Create beneficiaria if none
  if (!beneficiariaId) {
    try {
      const uniqueCpf = `000.${Math.floor(Math.random()*900+100)}.${Math.floor(Math.random()*900+100)}-00`;
      const payload = {
        nome_completo: 'Teste Smoke',
        cpf: uniqueCpf,
        data_nascimento: '1990-01-01',
        endereco: 'Rua Teste 123',
        telefone: '(11) 99999-0000',
        email: 'smoke@example.com',
        estado_civil: 'solteira',
        escolaridade: 'fundamental',
        renda_familiar: 0,
        num_dependentes: 0,
        status: 'ativa',
        observacoes: 'Criado por smoke test'
      };
      const res = await fetch(`${BASE_URL}/api/beneficiarias`, {
        method: 'POST',
        headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      captureCookies(res);
      const json = await res.json().catch(() => ({}));
      const ok = res.ok && json && json.data && json.data.id;
      beneficiariaId = ok ? json.data.id : null;
      log('POST /api/beneficiarias', ok, `status=${res.status}`);
      if (!ok) return process.exit(1);
    } catch (e) {
      log('POST /api/beneficiarias', false, e.message);
      return process.exit(1);
    }
  }

  // 5) Formularios: anamnese
  try {
    const res = await fetch(`${BASE_URL}/api/formularios/anamnese`, {
      method: 'POST',
      headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ beneficiaria_id: beneficiariaId, dados: { origem: 'smoke', obs: 'ok' } })
    });
    captureCookies(res);
    const ok = res.ok;
    log('POST /api/formularios/anamnese', ok, `status=${res.status}`);
  } catch (e) {
    log('POST /api/formularios/anamnese', false, e.message);
  }

  // 6) Formularios: ficha-evolucao
  try {
    const res = await fetch(`${BASE_URL}/api/formularios/ficha-evolucao`, {
      method: 'POST',
      headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ beneficiaria_id: beneficiariaId, dados: { origem: 'smoke', etapa: 1 } })
    });
    captureCookies(res);
    log('POST /api/formularios/ficha-evolucao', res.ok, `status=${res.status}`);
  } catch (e) {
    log('POST /api/formularios/ficha-evolucao', false, e.message);
  }

  // 7) Formularios: visao-holistica
  try {
    const res = await fetch(`${BASE_URL}/api/formularios/visao-holistica`, {
      method: 'POST',
      headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ beneficiaria_id: beneficiariaId, data_avaliacao: new Date().toISOString().slice(0,10) })
    });
    captureCookies(res);
    log('POST /api/formularios/visao-holistica', res.ok, `status=${res.status}`);
  } catch (e) {
    log('POST /api/formularios/visao-holistica', false, e.message);
  }

  console.log('\nSmoke tests finalizados.');
}

main().catch((err) => {
  console.error('Erro nos smoke tests:', err);
  process.exit(1);
});

