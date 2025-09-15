import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications, useMarkAllNotificationsAsRead, useDeleteNotification, useMarkNotificationAsRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPES = [
  { value: 'all', label: 'Todas' },
  { value: 'mention', label: 'Menções' },
  { value: 'assignment', label: 'Tarefas' },
  { value: 'system', label: 'Sistema' },
  { value: 'form', label: 'Formulários' },
];

export default function NotificationsPage() {
  const [type, setType] = useState('all');
  const { data: notifications = [], isLoading } = useNotifications({ type: type === 'all' ? undefined : [type] });
  const markAll = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const del = useDeleteNotification();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notificações</h1>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Marcar tudo como lido
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Caixa de entrada</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma notificação.</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">
                      {n.title || 'Notificação'}
                    </div>
                    <div className="text-sm text-muted-foreground">{n.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <Button size="sm" variant="secondary" onClick={() => markRead.mutate({ id: n.id, data: { read: true } })}>Marcar lida</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => del.mutate(n.id)}>Remover</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

