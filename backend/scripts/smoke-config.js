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
  const superAdmin = await login(SUPER_EMAIL, SUPER_PASS);
  const c = client(superAdmin.token);

  // Ensure base permissions
  await c.post('/configuracoes/permissions', { name: 'users.manage', description: 'Gerenciar usuários' }).catch(()=>{});
  await c.post('/configuracoes/permissions', { name: 'roles.manage', description: 'Gerenciar papéis' }).catch(()=>{});

  // Grant admin role permissions
  await c.put('/configuracoes/roles/admin/permissions', { permissions: ['users.manage', 'roles.manage'] });

  // Create admin user
  const email = `admin.smoke+${Date.now()}@local`; const password = '123456';
  const created = await c.post('/configuracoes/usuarios', { email, password, nome: 'Admin Smoke', papel: 'admin' });
  const adminUser = created.data.data;

  // Login as new admin and access protected route
  const admin = await login(email, password);
  const ca = client(admin.token);
  const list = await ca.get('/configuracoes/usuarios');
  if (!Array.isArray(list.data.data)) throw new Error('Lista de usuários inválida');

  // Update admin cargo and reset password
  await c.put(`/configuracoes/usuarios/${adminUser.id}`, { cargo: 'Operador' });
  await c.post(`/configuracoes/usuarios/${adminUser.id}/reset-password`, { newPassword: '654321' });

  console.log('✅ Smoke config OK');
}

if (require.main === module) {
  run().catch((e) => { console.error('❌ Smoke config FAIL:', e.message); process.exit(1); });
}

