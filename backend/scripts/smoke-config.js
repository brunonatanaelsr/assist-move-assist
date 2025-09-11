/* Smoke test para módulo de Configurações
   - Loga como superadmin (seed)
   - Garante permissões-base
   - Concede permissões a 'admin'
   - Cria um usuário admin e valida acesso às rotas protegidas
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

  let superAdmin, c;
  await step('Login superadmin', async () => {
    superAdmin = await login(SUPER_EMAIL, SUPER_PASS);
    c = client(superAdmin.token);
  });

  await step('Ensure base permission users.manage', async () => {
    await c.post('/configuracoes/permissions', { name: 'users.manage', description: 'Gerenciar usuários' }).catch(()=>{});
  });
  await step('Ensure base permission roles.manage', async () => {
    await c.post('/configuracoes/permissions', { name: 'roles.manage', description: 'Gerenciar papéis' }).catch(()=>{});
  });

  await step('Grant admin role permissions', async () => {
    await c.put('/configuracoes/roles/admin/permissions', { permissions: ['users.manage', 'roles.manage'] });
  });

  const email = `admin.smoke+${Date.now()}@local`; const password = '123456';
  let adminUser;
  await step('Create admin user', async () => {
    const created = await c.post('/configuracoes/usuarios', { email, password, nome: 'Admin Smoke', papel: 'admin' });
    adminUser = created.data.data;
  });

  let admin, ca;
  await step('Login as admin', async () => {
    admin = await login(email, password);
    ca = client(admin.token);
  });

  await step('List users as admin', async () => {
    const list = await ca.get('/configuracoes/usuarios');
    if (!Array.isArray(list.data.data)) throw new Error('Lista de usuários inválida');
  });

  await step('Update admin cargo', async () => {
    await c.put(`/configuracoes/usuarios/${adminUser.id}`, { cargo: 'Operador' });
  });

  await step('Reset admin password', async () => {
    await c.post(`/configuracoes/usuarios/${adminUser.id}/reset-password`, { newPassword: '654321' });
  });

  console.log('✅ Smoke config OK');
}

if (require.main === module) {
  run().catch((e) => { console.error('❌ Smoke config FAIL:', e.message); process.exit(1); });
}
