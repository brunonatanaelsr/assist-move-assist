import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, CheckAll, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch
  } = useNotifications({
    onNewNotification: (notification) => {
      // Tocar som de notificação
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    }
  });

  const getTipoStyle = (tipo: string) => {
    const styles = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      task: 'bg-purple-500'
    };
    return styles[tipo as keyof typeof styles] || styles.info;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Notificações</SheetTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              title="Atualizar"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                title="Marcar todas como lidas"
              >
                <CheckAll className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-6rem)] mt-4">
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    relative p-4 rounded-lg border
                    ${notification.lida ? 'bg-background' : 'bg-muted'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`
                        w-2 h-2 mt-2 rounded-full
                        ${getTipoStyle(notification.tipo)}
                      `}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold">
                          {notification.titulo}
                        </h4>
                        <time
                          className="text-xs text-muted-foreground"
                          title={format(
                            new Date(notification.data_envio),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        >
                          {formatDistanceToNow(
                            new Date(notification.data_envio),
                            { locale: ptBR, addSuffix: true }
                          )}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.mensagem}
                      </p>
                    </div>
                  </div>
                  {!notification.lida && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                      <span className="sr-only">Marcar como lida</span>
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
