import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessagingWidget from '../MessagingWidget';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const authMock = {
  user: { id: 1, nome: 'Agente', email: 'agente@example.com' },
  profile: { nome: 'Agente' },
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => authMock),
}));

const addMessageListenerMock = vi.fn(() => vi.fn());
const sendSocketMessageMock = vi.fn(() => true);
const sendGroupMessageMock = vi.fn(() => true);

vi.mock('@/hooks/useSocket', () => ({
  default: vi.fn(() => ({
    socket: null,
    isConnected: true,
    onlineUsers: [],
    newMessages: [],
    unreadCount: 0,
    typingUsers: {},
    sendMessage: sendSocketMessageMock,
    sendFileMessage: vi.fn(),
    sendGroupMessage: sendGroupMessageMock,
    markAsRead: vi.fn(),
    sendTyping: vi.fn(),
    sendGroupTyping: vi.fn(),
    joinGroup: vi.fn(),
    leaveGroup: vi.fn(),
    addMessageListener: addMessageListenerMock,
    addStatusListener: vi.fn(),
    isUserOnline: vi.fn(() => false),
    getOnlineUsers: vi.fn(() => []),
    clearNewMessages: vi.fn(),
    clearUnreadCount: vi.fn(),
  })),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  getConversasUsuario: vi.fn(),
  getUsuariosConversa: vi.fn(),
  getMensagensUsuario: vi.fn(),
  enviarMensagemUsuario: vi.fn(),
  post: vi.fn(),
}));

const getMock = apiMocks.get;
const getConversasUsuarioMock = apiMocks.getConversasUsuario;
const getUsuariosConversaMock = apiMocks.getUsuariosConversa;
const getMensagensUsuarioMock = apiMocks.getMensagensUsuario;
const enviarMensagemUsuarioMock = apiMocks.enviarMensagemUsuario;
const postMock = apiMocks.post;

vi.mock('@/services/apiService', () => ({
  apiService: apiMocks,
}));

describe('MessagingWidget', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as any).ResizeObserver = ResizeObserverMock;
    (window.HTMLElement.prototype as any).scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    getMock.mockImplementation((url: string) => {
      if (url === '/grupos') {
        return Promise.resolve({ success: true, data: [] });
      }
      if (url.startsWith('/grupos/') && url.endsWith('/mensagens')) {
        return Promise.resolve({ success: true, data: [] });
      }
      throw new Error(`Unexpected GET call: ${url}`);
    });

    getUsuariosConversaMock.mockResolvedValue({
      success: true,
      data: [
        { id: 2, nome: 'Usuária', email: 'usuario@example.com' },
      ],
    });

    getConversasUsuarioMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 10,
          autor_id: 2,
          destinatario_id: 1,
          conteudo: 'Olá',
          data_publicacao: '2024-01-01T12:00:00Z',
        },
      ],
    });

    getMensagensUsuarioMock.mockResolvedValue({
      success: true,
      data: [
        {
          id: 100,
          autor_id: 2,
          destinatario_id: 1,
          conteudo: 'Primeira mensagem',
          data_publicacao: '2024-01-01T12:05:00Z',
        },
      ],
    });

    enviarMensagemUsuarioMock.mockResolvedValue({
      success: true,
      data: {
        id: 101,
        autor_id: 1,
        destinatario_id: 2,
        conteudo: 'Nova mensagem',
        data_publicacao: '2024-01-01T12:10:00Z',
      },
    });
  });

  it('carrega conversas e permite enviar mensagem', async () => {
    render(<MessagingWidget />);

    const openButton = await screen.findByRole('button', { name: /abrir mensagens/i });
    await userEvent.click(openButton);

    await waitFor(() => {
      expect(getConversasUsuarioMock).toHaveBeenCalled();
    });

    const conversationItem = screen.getAllByText('Usuária', { selector: 'p' })[0];
    await userEvent.click(conversationItem);

    await waitFor(() => {
      expect(getMensagensUsuarioMock).toHaveBeenCalled();
    });

    await screen.findByText('Primeira mensagem');

    const input = screen.getByLabelText('Digite sua mensagem');
    await userEvent.type(input, 'Nova mensagem');

    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(enviarMensagemUsuarioMock).toHaveBeenCalledWith({
        destinatario_id: 2,
        conteudo: 'Nova mensagem',
      });
    });

    await screen.findByText('Nova mensagem');
  });

  it('exibe erro ao falhar no carregamento das conversas', async () => {
    getConversasUsuarioMock.mockResolvedValueOnce({ success: false, message: 'falha' });

    render(<MessagingWidget />);

    const openButton = await screen.findByRole('button', { name: /abrir mensagens/i });
    await userEvent.click(openButton);

    await screen.findByText('Não foi possível carregar as conversas.');
  });

  it('exibe erro ao falhar no envio da mensagem', async () => {
    enviarMensagemUsuarioMock.mockResolvedValueOnce({ success: false, message: 'erro' });

    render(<MessagingWidget />);

    const openButton = await screen.findByRole('button', { name: /abrir mensagens/i });
    await userEvent.click(openButton);

    await waitFor(() => {
      expect(getConversasUsuarioMock).toHaveBeenCalled();
    });

    const conversationItem = screen.getAllByText('Usuária', { selector: 'p' })[0];
    await userEvent.click(conversationItem);

    await screen.findByText('Primeira mensagem');

    const input = screen.getByLabelText('Digite sua mensagem');
    await userEvent.type(input, 'Erro de envio');

    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i });
    await userEvent.click(sendButton);

    await screen.findByText('Não foi possível enviar a mensagem. Tente novamente.');
  });
});
