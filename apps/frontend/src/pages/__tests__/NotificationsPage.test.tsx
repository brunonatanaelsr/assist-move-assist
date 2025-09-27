import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsPage from '../Notifications';
import * as notificationsHooks from '@/hooks/useNotifications';

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useMarkAllNotificationsAsRead: vi.fn(),
  useDeleteNotification: vi.fn(),
  useMarkNotificationAsRead: vi.fn(),
}));

describe('NotificationsPage', () => {
  const deleteMutation = { mutate: vi.fn() };
  const markAllMutation = { mutate: vi.fn(), isPending: false };
  const markReadMutation = { mutate: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (notificationsHooks.useNotifications as unknown as Mock).mockReturnValue({
      data: [
        {
          id: 1,
          title: 'Nova mensagem',
          message: 'Você recebeu uma nova mensagem',
          created_at: new Date().toISOString(),
          read: false,
        },
      ],
      isLoading: false,
    });
    (notificationsHooks.useMarkAllNotificationsAsRead as unknown as Mock).mockReturnValue(markAllMutation);
    (notificationsHooks.useDeleteNotification as unknown as Mock).mockReturnValue(deleteMutation);
    (notificationsHooks.useMarkNotificationAsRead as unknown as Mock).mockReturnValue(markReadMutation);
  });

  it('should render notifications list and allow removing an item', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);

    expect(screen.getByText('Nova mensagem')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remover/i }));

    expect(deleteMutation.mutate).toHaveBeenCalledWith(1);
  });
});
