import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

const socketListeners: Array<(message: any) => void> = [];

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, nome: 'Usuário Atual', nome_completo: 'Usuário Atual' },
    profile: { id: 1, nome: 'Usuário Atual', nome_completo: 'Usuário Atual' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    isAuthenticated: true,
    isAdmin: false,
  }),
}));

vi.mock('@/hooks/useSocket', () => ({
  default: () => ({
    socket: null,
    isConnected: true,
    addMessageListener: (callback: (message: any) => void) => {
      socketListeners.push(callback);
      return () => {
        const index = socketListeners.indexOf(callback);
        if (index >= 0) {
          socketListeners.splice(index, 1);
        }
      };
    },
  }),
}));

import MessagingWidget from '../MessagingWidget';
import { apiService } from '@/services/apiService';

describe('MessagingWidget', () => {
  const getUsuariosConversaMock = vi.spyOn(apiService, 'getUsuariosConversa');
  const getConversasUsuarioMock = vi.spyOn(apiService, 'getConversasUsuario');
  const getMensagensUsuarioMock = vi.spyOn(apiService, 'getMensagensUsuario');
  const enviarMensagemUsuarioMock = vi.spyOn(apiService, 'enviarMensagemUsuario');

  const renderComponent = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MessagingWidget />
      </QueryClientProvider>
    );
  };

  const mockUsers = [
    { id: 2, nome_completo: 'Ana Maria' },
    { id: 3, nome: 'Carlos Souza' },
  ];

  const mockConversations = [
    {
      id: 101,
      autor_id: 2,
      autor_nome: 'Ana Maria',
      destinatario_id: 1,
      destinatario_nome: 'Usuário Atual',
      conteudo: 'Olá, tudo bem?',
      data_publicacao: '2024-05-01T10:00:00Z',
      lida: false,
    },
  ];

  const mockMessagesByUser: Record<number, any[]> = {
    2: [
      {
        id: 1001,
        autor_id: 2,
        autor_nome: 'Ana Maria',
        destinatario_id: 1,
        destinatario_nome: 'Usuário Atual',
        conteudo: 'Olá, tudo bem?',
        data_publicacao: '2024-05-01T10:00:00Z',
        lida: false,
      },
      {
        id: 1002,
        autor_id: 1,
        autor_nome: 'Usuário Atual',
        destinatario_id: 2,
        destinatario_nome: 'Ana Maria',
        conteudo: 'Oi Ana!',
        data_publicacao: '2024-05-01T11:00:00Z',
        lida: true,
      },
    ],
  };

  beforeEach(() => {
    socketListeners.length = 0;
    (window.HTMLElement.prototype.scrollIntoView as any) = vi.fn();

    getUsuariosConversaMock.mockResolvedValue({ success: true, data: mockUsers });
    getConversasUsuarioMock.mockResolvedValue({ success: true, data: mockConversations });
    getMensagensUsuarioMock.mockImplementation(async (usuarioId: number) => ({
      success: true,
      data: mockMessagesByUser[usuarioId] ?? [],
    }));
    enviarMensagemUsuarioMock.mockImplementation(async ({ destinatario_id, conteudo }: any) => ({
      success: true,
      data: {
        id: 2001,
        autor_id: 1,
        autor_nome: 'Usuário Atual',
        destinatario_id,
        destinatario_nome: destinatario_id === 2 ? 'Ana Maria' : 'Usuário',
        conteudo,
        data_publicacao: '2024-05-01T12:00:00Z',
        lida: true,
      },
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    socketListeners.length = 0;
  });

  it('exibe conversas, carrega mensagens e sincroniza com eventos do socket', async () => {
    renderComponent();

    const openButton = screen.getByRole('button', { name: /abrir mensagens/i });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Ana Maria')).toBeInTheDocument();
    });

    const conversationButton = screen.getByText('Ana Maria');
    fireEvent.click(conversationButton);

    await waitFor(() => {
      expect(screen.getByText('Olá, tudo bem?')).toBeInTheDocument();
      expect(screen.getByText('Oi Ana!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Digite sua mensagem...');
    fireEvent.change(input, { target: { value: 'Mensagem enviada pelo usuário atual' } });

    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(enviarMensagemUsuarioMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Mensagem enviada pelo usuário atual')).toBeInTheDocument();
    });

    await act(async () => {
      socketListeners.forEach((listener) => {
        listener({
          id: 3001,
          autor_id: 2,
          autor_nome: 'Ana Maria',
          destinatario_id: 1,
          destinatario_nome: 'Usuário Atual',
          conteudo: 'Mensagem em tempo real',
          data_publicacao: '2024-05-01T12:30:00Z',
          lida: false,
        });
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Mensagem em tempo real')).toBeInTheDocument();
    });
  });
});
