import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/config/api';
import { toast } from 'sonner';
import type {
  Notification,
  NotificationPreferences,
  CreateNotificationInput,
  UpdateNotificationInput,
} from '@/types/notification';

// Hook para buscar notificações
export function useNotifications(filters?: {
  read?: boolean;
  type?: string[];
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: filters,
      });
      return response.data;
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
}

// Hook para buscar número de notificações não lidas
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread/count');
      return response.data.count as number;
    },
    refetchInterval: 30000,
  });
}

// Hook para marcar notificação como lida
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateNotificationInput;
    }) => {
      const response = await api.patch(`/notifications/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook para marcar todas notificações como lidas
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
  });
}

// Hook para excluir notificação
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook para buscar preferências de notificação
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences');
      return response.data as NotificationPreferences;
    },
  });
}

// Hook para atualizar preferências de notificação
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<NotificationPreferences>) => {
      const response = await api.put('/notifications/preferences', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferências de notificação atualizadas');
    },
  });
}

// Hook para enviar notificação
export function useSendNotification() {
  return useMutation({
    mutationFn: async (data: CreateNotificationInput) => {
      const response = await api.post('/notifications', data);
      return response.data;
    },
  });
}

// Hook para inscrever no service worker de notificações push
export function useSubscribeToPushNotifications() {
  return useMutation({
    mutationFn: async () => {
      // Solicita permissão para notificações push
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão para notificações negada');
      }

      // Registra o service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Gera subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (import.meta as any)?.env?.VITE_VAPID_PUBLIC_KEY,
      });

      // Envia subscription para o backend
      await api.post('/notifications/push-subscription', subscription);
    },
    onSuccess: () => {
      toast.success('Notificações push ativadas com sucesso');
    },
    onError: () => {
      toast.error('Erro ao ativar notificações push');
    },
  });
}
