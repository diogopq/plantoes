// Firebase Cloud Messaging - notificações em segundo plano.
// Se notifications-config.js não estiver preenchido ainda, isso é ignorado silenciosamente.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  importScripts('./notifications-config.js');

  if (self.NOTIF_FIREBASE_CONFIG && self.NOTIF_FIREBASE_CONFIG.apiKey) {
    firebase.initializeApp(self.NOTIF_FIREBASE_CONFIG);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = (payload.data && payload.data.title) || (payload.notification && payload.notification.title) || "Plantões";
      const body = (payload.data && payload.data.body) || (payload.notification && payload.notification.body) || "";
      self.registration.showNotification(title, {
        body: body,
        icon: "./icon-192.png",
        badge: "./icon-192.png"
      });
    });
  }
} catch (e) {
  // Firebase ainda não configurado ou indisponível - o app continua funcionando normalmente.
}

const CACHE_NAME = "plantoes-vet-v13";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
