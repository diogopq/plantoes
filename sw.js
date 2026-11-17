// Notificações push - escutando o evento nativo do navegador diretamente,
// sem depender da lógica automática/interna do SDK do Firebase (que decide
// sozinha, de forma pouco previsível, quando exibir ou não a notificação).
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  // Aceita tanto mensagens no formato "data" (o que o app manda) quanto
  // "notification" (caso um dia seja enviado assim também).
  const info = payload.data || payload.notification || {};
  const title = info.title || "Plantões";
  const body = info.body || "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "plantoes-lembrete",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.find((c) => "focus" in c);
      if (hadWindow) return hadWindow.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});

const CACHE_NAME = "plantoes-vet-v21";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./notifications-config.js",
  "./transcricao-config.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: "reload" ignora o cache HTTP do navegador, garantindo que a
      // versão nova realmente venha do servidor (e não uma cópia antiga).
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Versões até a v17 serviam o app "cache primeiro" e não sabem avisar
    // sobre atualização. Se o aparelho vinha de uma delas, a tela aberta está
    // rodando código antigo: recarregamos à força uma única vez.
    const vinhaDeVersaoAntiga = keys.some((k) => {
      const m = /^plantoes-vet-v(\d+)$/.exec(k);
      return m && Number(m[1]) <= 17;
    });
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (vinhaDeVersaoAntiga) {
      // Fora do waitUntil de propósito: a recarga só pode acontecer depois que
      // esta versão terminar de ativar (senão uma espera pela outra e trava).
      setTimeout(() => {
        self.clients.matchAll({ type: "window" }).then((janelas) =>
          janelas.forEach((c) => { if ("navigate" in c) c.navigate(c.url).catch(() => {}); })
        );
      }, 0);
    }
  })());
});

// Página, scripts e configs: REDE PRIMEIRO (sempre a versão mais nova quando
// há internet; o cache só é usado offline). Imagens: cache primeiro.
// Antes era tudo "cache primeiro", e por isso o celular continuava abrindo a
// versão antiga do app mesmo depois de publicar uma nova.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase etc.: direto na rede

  const isImage = req.destination === "image" || /\.(png|jpg|jpeg|svg|ico|webp)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(new Request(req, { cache: "no-cache" }))
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) =>
          cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
  );
});
