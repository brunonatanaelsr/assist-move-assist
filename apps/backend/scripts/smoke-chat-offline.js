/*
  Smoke test de fila offline de chat.
  Fluxo:
    1) Login A e B
    2) Conectar socket A e B, join_groups
    3) Criar grupo, adicionar B, join_groups novamente
    4) Desconectar B
    5) A envia mensagem privada e de grupo (enquanto B está offline)
    6) Reconnect B e verificar recebimento (new_message) das duas
    7) Desconectar e reconectar B novamente: não devem chegar duplicadas (fila limpa)
    8) Verificar no REST que a mensagem privada está lida
*/

const axios = require('axios');
const { io } = require('socket.io-client');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const WS_URL = process.env.WS_URL || 'http://localhost:3000';
const A_EMAIL = process.env.A_EMAIL || 'bruno@move.com';
const A_PASS = process.env.A_PASS || '15002031';
const B_EMAIL = process.env.B_EMAIL || 'admin@movemarias.com';
const B_PASS = process.env.B_PASS || 'movemarias123';

async function login(email, password) {
  const resp = await axios.post(`${API_BASE}/auth/login`, { email, password });
  if (!resp.data || !resp.data.token || !resp.data.user) {
    throw new Error(`Login inválido para ${email}`);
  }
  return { token: resp.data.token, user: resp.data.user };
}

function connectSocket(token, label) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const timeout = setTimeout(() => reject(new Error(`Timeout connect ${label}`)), 10000);
    socket.on('connect', () => { clearTimeout(timeout); resolve(socket); });
    socket.on('connect_error', (err) => { clearTimeout(timeout); reject(err); });
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
      } catch {}
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout aguardando evento ${event} ${label}`));
    }, timeoutMs);
    socket.on(event, handler);
  });
}

function waitNoEvent(socket, event, predicate = () => true, label = '', timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      try {
        if (predicate(data)) {
          socket.off(event, handler);
          clearTimeout(timer);
          reject(new Error(`Evento inesperado ${event} ${label}`));
        }
      } catch {}
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(true);
    }, timeoutMs);
    socket.on(event, handler);
  });
}

async function createGroup(token, nome = 'Grupo Offline', descricao = 'Smoke offline') {
  const resp = await axios.post(`${API_BASE}/grupos`, { nome, descricao }, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.data || !resp.data.data || !resp.data.data.id) throw new Error('Falha ao criar grupo');
  return resp.data.data.id;
}

async function addMember(token, groupId, usuarioId, papel = 'membro') {
  await axios.post(`${API_BASE}/grupos/${groupId}/membros`, { usuario_id: usuarioId, papel }, { headers: { Authorization: `Bearer ${token}` } });
}

async function listarUsuarios(token) {
  const resp = await axios.get(`${API_BASE}/mensagens/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data;
}

async function getConversa(token, otherUserId) {
  const resp = await axios.get(`${API_BASE}/mensagens/conversa/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data?.data || [];
}

async function main() {
  const A = await login(A_EMAIL, A_PASS);
  const B = await login(B_EMAIL, B_PASS);

  const sockA = await connectSocket(A.token, 'A');
  const sockB = await connectSocket(B.token, 'B');

  sockA.emit('join_groups');
  sockB.emit('join_groups');

  const groupId = await createGroup(A.token, `Grupo Offline ${Date.now()}`);
  await addMember(A.token, groupId, B.user.id, 'membro');
  sockA.emit('join_groups');
  sockB.emit('join_groups');

  // Desconectar B
  sockB.disconnect();

  // Enviar mensagens enquanto B está offline
  const usuarios = await listarUsuarios(A.token);
  const destinatarioId = (Array.isArray(usuarios) ? usuarios : []).find((u) => u.email === B_EMAIL)?.id || B.user.id;
  const privateText = `PRIV-OFFLINE-${Date.now()}`;
  const groupText = `GRP-OFFLINE-${Date.now()}`;

  const ack1 = waitEvent(sockA, 'message_sent', (m) => m && m.conteudo === privateText, 'ack-private');
  sockA.emit('send_message', { destinatario_id: destinatarioId, conteudo: privateText });
  await ack1;

  const ack2 = waitEvent(sockA, 'message_sent', (m) => m && m.conteudo === groupText && m.grupo_id === groupId, 'ack-group');
  sockA.emit('send_message', { grupo_id: groupId, conteudo: groupText });
  await ack2;

  // Reconnect B e validar entrega
  const sockB2 = await connectSocket(B.token, 'B2');
  const recvPriv = waitEvent(sockB2, 'new_message', (m) => m && m.conteudo === privateText, 'B2.private');
  const recvGroup = waitEvent(sockB2, 'new_message', (m) => m && m.conteudo === groupText && m.grupo_id === groupId, 'B2.group');
  await Promise.all([recvPriv, recvGroup]);

  // Reconectar novamente e garantir que não repita
  sockB2.disconnect();
  const sockB3 = await connectSocket(B.token, 'B3');
  await waitNoEvent(sockB3, 'new_message', (m) => m && (m.conteudo === privateText || m.conteudo === groupText), 'no-duplicate');

  // Validar que a privada está lida
  const conversa = await getConversa(B.token, A.user.id);
  const msg = (conversa || []).find((m) => m.conteudo === privateText);
  if (!msg || !msg.lida) {
    throw new Error('Mensagem privada offline não marcada como lida');
  }

  sockA.disconnect();
  sockB3.disconnect();
  console.log('🎉 Smoke offline OK');
}

main().catch((err) => {
  console.error('❌ Falha no smoke offline:', err.message);
  process.exit(1);
});

