import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatFromNow } from '@/lib/dayjs';

export function NotificationsPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications({
    limit: 10,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  // Fecha o popover quando clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.notifications-popover')) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: any) => {
    // Marca como lida
    if (!notification.read) {
      markAsRead.mutate({
        id: notification.id,
        data: { read: true },
      });
    }

    // Navega para a URL da ação se existir
    if (notification.action_url) {
      navigate(notification.action_url);
    }

    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '@';
      case 'assignment':
        return '✓';
      case 'reminder':
        return '⏰';
      case 'activity':
        return '📝';
      case 'form_response':
        return '📋';
      default:
        return '•';
    }
  };

  return (
    <div className="notifications-popover">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            data-testid="notifications-button"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent
          align="end"
          className="w-80 p-0"
          data-testid="notifications-panel"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h4 className="text-sm font-medium">Notificações</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground" data-testid="no-notifications">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-muted cursor-pointer transition-colors',
                      !notification.read && 'bg-muted/50'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid="notification-item"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                          !notification.read && 'bg-primary text-white',
                          notification.read && 'bg-muted-foreground/20'
                        )}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          'text-sm',
                          !notification.read && 'font-medium'
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFromNow(notification.created_at)}
                        </p>
                      </div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                          >
                            ×
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Remover notificação
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                navigate('/notifications');
                setOpen(false);
              }}
            >
              Ver todas
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
