// Armazena a chave pública VAPID
let vapidPublicKey = '';

// Cache de recursos estáticos
const CACHE_NAME = 'assist-move-assist-v1';
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// Instalação do service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_RESOURCES);
    })
  );
});

// Ativação do service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Intercepta requisições para usar cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Recebe mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_VAPID_PUBLIC_KEY') {
    vapidPublicKey = event.data.vapidPublicKey;
  }
});

// Lida com notificações push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  // Decodifica a mensagem
  const data = event.data.json();

  // Opções da notificação
  const options = {
    body: data.message,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.action_url,
    },
  };

  // Exibe a notificação
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Lida com cliques na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Abre a URL da ação se existir
  if (event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
