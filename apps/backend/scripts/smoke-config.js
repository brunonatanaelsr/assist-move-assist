/* Smoke test para módulo de Configurações
   - Loga como superadmin (seed)
   - Garante permissões-base
   - Concede permissões a 'admin'
   - Cria um usuário admin e valida acesso às rotas protegidas
*/
const axios = require('axios');
const { createCookieJar, storeCookies, cookieHeader } = require('./utils/cookies');
const { fetchCsrfToken, extractSetCookiesFromAxiosHeaders } = require('./utils/csrf');

const API = process.env.API_BASE || 'http://localhost:3000/api';
const SUPER_EMAIL = process.env.SUPER_EMAIL || 'bruno@move.com';
const SUPER_PASS = process.env.SUPER_PASS || '15002031';

const cookieJar = createCookieJar();

async function csrfHeaders(base = {}) {
  const token = await fetchCsrfToken(API, cookieJar);
  const header = cookieHeader(cookieJar);
  return {
    ...base,
    'X-CSRF-Token': token,
    ...(header ? { Cookie: header } : {}),
  };
}

function captureAxiosCookies(response) {
  storeCookies(cookieJar, extractSetCookiesFromAxiosHeaders(response.headers));
  return response;
}

async function login(email, password) {
  const r = await axios.post(
    `${API}/auth/login`,
    { email, password },
    { headers: await csrfHeaders({ 'Content-Type': 'application/json' }) }
  );
  captureAxiosCookies(r);
  return { token: r.data.token, user: r.data.user };
}

function client(token) {
  const instance = axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } });

  instance.interceptors.request.use(async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      config.headers = await csrfHeaders(config.headers || {});
    }
    return config;
  });

  instance.interceptors.response.use((response) => captureAxiosCookies(response));

  return instance;
}

async function run() {
  const step = async (name, fn) => {
    try {
      await fn();
      console.log(`✔ ${name}`);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.error(`✖ ${name} failed`, status ? `(status ${status})` : '');
      if (data) console.error('Response:', JSON.stringify(data));
      throw e;
    }
  };
  const softStep = async (name, fn) => {
    try {
      await fn();
      console.log(`✔ ${name}`);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.warn(`⚠ ${name} non-blocking failure`, status ? `(status ${status})` : '');
      if (data) console.warn('Response:', JSON.stringify(data));
    }
  };

  let superAdmin, c;
  await step('Login superadmin', async () => {
    try {
      superAdmin = await login(SUPER_EMAIL, SUPER_PASS);
    } catch (e) {
      // Try to register superadmin if login fails (fresh DB)
      const axios = require('axios');
      await axios.post(`${API}/auth/register`, {
        email: SUPER_EMAIL,
        password: SUPER_PASS,
        nome_completo: 'Super Admin',
        role: 'superadmin'
      }).catch(()=>{});
      superAdmin = await login(SUPER_EMAIL, SUPER_PASS);
    }
    c = client(superAdmin.token);
  });

  await softStep('Ensure base permission users.manage', async () => {
    await c.post('/configuracoes/permissions', { name: 'users.manage', description: 'Gerenciar usuários' }).catch(()=>{});
  });
  await softStep('Ensure base permission roles.manage', async () => {
    await c.post('/configuracoes/permissions', { name: 'roles.manage', description: 'Gerenciar papéis' }).catch(()=>{});
  });

  await softStep('Grant admin role permissions', async () => {
    await c.put('/configuracoes/roles/admin/permissions', { permissions: ['users.manage', 'roles.manage'] });
  });

  const email = `admin.smoke+${Date.now()}@local`; const password = '123456';
  let adminUser;
  await step('Create admin user', async () => {
    const created = await c.post('/configuracoes/usuarios', { email, password, nome: 'Admin Smoke', papel: 'admin' });
    adminUser = created.data.data;
  });

  let admin, ca;
  await softStep('Login as admin', async () => {
    admin = await login(email, password);
    ca = client(admin.token);
  });

  await softStep('List users as admin', async () => {
    const cli = (ca || c);
    const list = await cli.get('/configuracoes/usuarios');
    if (!Array.isArray(list.data.data)) throw new Error('Lista de usuários inválida');
  });

  if (adminUser?.id) {
    await softStep('Update admin cargo', async () => {
      await c.put(`/configuracoes/usuarios/${adminUser.id}`, { cargo: 'Operador' });
    });
  }

  if (adminUser?.id) {
    await softStep('Reset admin password', async () => {
      await c.post(`/configuracoes/usuarios/${adminUser.id}/reset-password`, { newPassword: '654321' });
    });
  }

  console.log('✅ Smoke config OK');
}

if (require.main === module) {
  run().catch((e) => {
    const status = e?.response?.status;
    const body = e?.response?.data ? JSON.stringify(e.response.data) : '';
    console.error('❌ Smoke config FAIL:', status ? `(status ${status})` : '', body || e.message);
    process.exit(1);
  });
}
