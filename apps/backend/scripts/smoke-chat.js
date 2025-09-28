/*
  Smoke test de chat (privado e grupo) usando Socket.IO Client.
  Requisitos:
    - API rodando em http://localhost:3000 (ou configure API_BASE/WS_URL)
    - Usuários seed: bruno@move.com / 15002031 e admin@movemarias.com / movemarias123
*/

const axios = require('axios');
const { io } = require('socket.io-client');
const { createCookieJar, storeCookies, cookieHeader } = require('./utils/cookies');
const { fetchCsrfToken, extractSetCookiesFromAxiosHeaders } = require('./utils/csrf');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const WS_URL = process.env.WS_URL || 'http://localhost:3000';
const A_EMAIL = process.env.A_EMAIL || 'bruno@move.com';
const A_PASS = process.env.A_PASS || '15002031';
const B_EMAIL = process.env.B_EMAIL || 'admin@movemarias.com';
const B_PASS = process.env.B_PASS || 'movemarias123';

const cookieJar = createCookieJar();

async function csrfHeaders(base = {}) {
  const token = await fetchCsrfToken(API_BASE, cookieJar);
  const cookie = cookieHeader(cookieJar);
  return {
    ...base,
    'X-CSRF-Token': token,
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

function captureAxiosCookies(response) {
  storeCookies(cookieJar, extractSetCookiesFromAxiosHeaders(response.headers));
  return response;
}

async function login(email, password) {
  const resp = await axios.post(
    `${API_BASE}/auth/login`,
    { email, password },
    { headers: await csrfHeaders({ 'Content-Type': 'application/json' }) }
  );
  captureAxiosCookies(resp);
  if (!resp.data || !resp.data.token || !resp.data.user) {
    throw new Error(`Login inválido para ${email}`);
  }
  return { token: resp.data.token, user: resp.data.user };
}

function createApiClient(token) {
  const instance = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${token}` } });
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

function connectSocket(token, label) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const timeout = setTimeout(() => reject(new Error(`Timeout connect ${label}`)), 10000);

    socket.on('connect', () => {
      console.log(`🔌 [${label}] conectado: ${socket.id}`);
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function waitEvent(socket, event, predicate = () => true, label = '', timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      try {
        if (predicate(data)) {
          socket.off(event, handler);
          clearTimeout(timer);
          resolve(data);
        }
      } catch (e) {
        // ignore
      }
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout aguardando evento ${event} ${label}`));
    }, timeoutMs);
    socket.on(event, handler);
  });
}

async function createGroup(client, nome = 'Grupo Smoke', descricao = 'Criado pelo smoke-chat') {
  const resp = await client.post('/grupos', { nome, descricao });
  if (!resp.data || !resp.data.data || !resp.data.data.id) throw new Error('Falha ao criar grupo');
  return resp.data.data.id;
}

async function addMember(client, groupId, usuarioId, papel = 'membro') {
  await client.post(`/grupos/${groupId}/membros`, { usuario_id: usuarioId, papel });
}

async function listarUsuarios(client) {
  const resp = await client.get('/mensagens/usuarios');
  return resp.data;
}

async function main() {
  console.log('🔐 Login A (remetente)...');
  const A = await login(A_EMAIL, A_PASS);
  console.log('🔐 Login B (destinatário)...');
  const B = await login(B_EMAIL, B_PASS);

  const clientA = createApiClient(A.token);
  const clientB = createApiClient(B.token);

  console.log('🔌 Conectando sockets...');
  const sockA = await connectSocket(A.token, 'A');
  const sockB = await connectSocket(B.token, 'B');

  // Handlers de log (não bloqueantes)
  sockA.on('new_message', (msg) => console.log('📨 [A] new_message', msg));
  sockA.on('message_sent', (msg) => console.log('✅ [A] message_sent', msg));
  sockA.on('user_status', (s) => console.log('👤 [A] user_status', s));
  sockB.on('new_message', (msg) => console.log('📨 [B] new_message', msg));
  sockB.on('message_sent', (msg) => console.log('✅ [B] message_sent', msg));
  sockB.on('user_status', (s) => console.log('👤 [B] user_status', s));

  console.log('➡️  join_groups');
  sockA.emit('join_groups');
  sockB.emit('join_groups');
  // não precisamos aguardar ack para smoke básico

  // Private message A -> B
  console.log('💬 Teste mensagem privada A -> B');
  const usuarios = await listarUsuarios(clientA);
  const destinatarioId = (Array.isArray(usuarios) ? usuarios : []).find((u) => u.email === B_EMAIL)?.id || B.user.id;
  const msgText = `Olá de A para B @ ${Date.now()}`;
  const p1 = waitEvent(sockA, 'message_sent', (m) => m && m.conteudo === msgText, 'A.message_sent');
  const p2 = waitEvent(sockB, 'new_message', (m) => m && m.conteudo === msgText, 'B.new_message');
  sockA.emit('send_message', { destinatario_id: destinatarioId, conteudo: msgText });
  await Promise.all([p1, p2]);
  console.log('✅ Mensagem privada OK');

  // Typing A -> B
  console.log('⌨️  Teste typing A -> B');
  const t1 = waitEvent(sockB, 'user_typing', (d) => d && d.userId && d.isTyping === true, 'B.user_typing');
  sockA.emit('typing', { destinatario_id: destinatarioId, isTyping: true });
  await t1;
  console.log('✅ Typing OK');

  // Group message
  console.log('👥 Criando grupo e adicionando B');
  const groupId = await createGroup(clientA, `Grupo Smoke ${Date.now()}`);
  await addMember(clientA, groupId, B.user.id, 'membro');
  // Entrar nas salas dos grupos novamente
  sockA.emit('join_groups');
  sockB.emit('join_groups');

  console.log('💬 Teste mensagem de grupo');
  const gText = `Mensagem de grupo @ ${Date.now()}`;
  const g1 = waitEvent(sockA, 'new_message', (m) => m && m.grupo_id === groupId && m.conteudo === gText, 'A.group.new_message');
  const g2 = waitEvent(sockB, 'new_message', (m) => m && m.grupo_id === groupId && m.conteudo === gText, 'B.group.new_message');
  sockA.emit('send_message', { grupo_id: groupId, conteudo: gText });
  await Promise.all([g1, g2]);
  console.log('✅ Mensagem de grupo OK');

  // Encerrar
  sockA.disconnect();
  sockB.disconnect();
  console.log('🎉 Smoke chat finalizado com sucesso');
}

main().catch((err) => {
  console.error('❌ Falha no smoke de chat:', err.message);
  process.exit(1);
});

