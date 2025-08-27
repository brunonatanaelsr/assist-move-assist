import { useEffect } from 'react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useSubscribeToPushNotifications,
} from '@/hooks/useNotifications';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loading } from '@/components/ui/loading';
import type { NotificationType } from '@/types/notification';

export function NotificationSettings() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const subscribeToPush = useSubscribeToPushNotifications();

  useEffect(() => {
    // Verifica se o navegador suporta notificações push
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted' && preferences?.push_notifications) {
          subscribeToPush.mutate();
        }
      });
    }
  }, [preferences?.push_notifications]);

  if (isLoading) {
    return <Loading message="Carregando preferências..." />;
  }

  if (!preferences) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">
          Erro ao carregar preferências de notificação
        </p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  const handleNotificationTypes = (types: NotificationType[]) => {
    updatePreferences.mutate({ notification_types: types });
  };

  const handleQuietHours = (start: string, end: string) => {
    updatePreferences.mutate({
      quiet_hours_start: start,
      quiet_hours_end: end,
    });
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">Preferências de Notificação</h1>

      <div className="space-y-6">
        {/* Canais de Notificação */}
        <Card>
          <CardHeader>
            <CardTitle>Canais de Notificação</CardTitle>
            <CardDescription>
              Escolha como você quer receber suas notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações por email
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('email_notifications', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Notificações Push</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações no navegador
                </p>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('push_notifications', checked)
                }
                disabled={!('Notification' in window)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Notificação */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Notificação</CardTitle>
            <CardDescription>
              Selecione os tipos de notificação que você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Menções</Label>
                <p className="text-sm text-muted-foreground">
                  Quando alguém te mencionar
                </p>
              </div>
              <Switch
                checked={preferences.mention_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('mention_notifications', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Atribuições</Label>
                <p className="text-sm text-muted-foreground">
                  Quando você for atribuído a uma tarefa
                </p>
              </div>
              <Switch
                checked={preferences.assignment_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('assignment_notifications', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Atividades</Label>
                <p className="text-sm text-muted-foreground">
                  Atualizações de atividades que você participa
                </p>
              </div>
              <Switch
                checked={preferences.activity_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('activity_notifications', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Respostas de Formulários</Label>
                <p className="text-sm text-muted-foreground">
                  Quando alguém responder seus formulários
                </p>
              </div>
              <Switch
                checked={preferences.form_response_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('form_response_notifications', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Lembretes</Label>
                <p className="text-sm text-muted-foreground">
                  Lembretes de tarefas e eventos
                </p>
              </div>
              <Switch
                checked={preferences.reminder_notifications}
                onCheckedChange={(checked) =>
                  handleToggle('reminder_notifications', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Horário Silencioso */}
        <Card>
          <CardHeader>
            <CardTitle>Horário Silencioso</CardTitle>
            <CardDescription>
              Defina um período em que você não quer receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_start || ''}
                  onChange={(e) =>
                    handleQuietHours(
                      e.target.value,
                      preferences.quiet_hours_end || ''
                    )
                  }
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_end || ''}
                  onChange={(e) =>
                    handleQuietHours(
                      preferences.quiet_hours_start || '',
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
