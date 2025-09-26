/* Smoke test para relatórios com authorize granular
   - Cria usuário operador (sem relatorios.*), valida 403
   - Define role 'analista' com relatorios.* e troca papel do usuário, valida 200
*/
const axios = require('axios');

const API = process.env.API_BASE || 'http://localhost:3000/api';
const SUPER_EMAIL = process.env.SUPER_EMAIL || 'bruno@move.com';
const SUPER_PASS = process.env.SUPER_PASS || '15002031';

async function login(email, password) {
  const r = await axios.post(`${API}/auth/login`, { email, password });
  return { token: r.data.token, user: r.data.user };
}

function client(token) {
  return axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } });
}

async function expectStatus(fn, expected) {
  try { const r = await fn(); return r.status === expected; } catch (e) { return (e.response && e.response.status) === expected; }
}

async function run() {
  const superAdmin = await login(SUPER_EMAIL, SUPER_PASS);
  const c = client(superAdmin.token);

  // Create operador user
  const email = `reports.smoke+${Date.now()}@local`; const password = '123456';
  const created = await c.post('/configuracoes/usuarios', { email, password, nome: 'Reporter Smoke', papel: 'operador' });
  const user = created.data.data;

  // Login as operador
  const op = await login(email, password);
  const cop = client(op.token);

  // Try access /relatorios/beneficiarias (should be 403)
  const forbid = await expectStatus(() => cop.get('/relatorios/beneficiarias'), 403);
  if (!forbid) throw new Error('Operador conseguiu acessar relatórios sem permissão');

  // Ensure analista role has relatorios.*
  const perms = ['relatorios.beneficiarias.gerar','relatorios.oficinas.gerar','relatorios.participacao.gerar','relatorios.consolidado.gerar'];
  await c.put('/configuracoes/roles/analista/permissions', { permissions: perms });

  // Change user role to analista
  await c.put(`/configuracoes/usuarios/${user.id}`, { papel: 'analista' });

  // Login again and access
  const an = await login(email, password);
  const can = await expectStatus(() => client(an.token).get('/relatorios/beneficiarias'), 200);
  if (!can) throw new Error('Analista não conseguiu acessar relatório');

  console.log('✅ Smoke reports OK');
}

if (require.main === module) {
  run().catch((e) => { console.error('❌ Smoke reports FAIL:', e.message); process.exit(1); });
}

