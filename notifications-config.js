// Preencha estes dados com as chaves do SEU projeto Firebase.
// Onde encontrar: Firebase Console → Configurações do projeto (ícone de engrenagem)
// → "Seus aplicativos" → app Web → "Configuração do SDK".
//
// Depois de preencher, suba este arquivo (notifications-config.js) na raiz
// do mesmo repositório do GitHub, junto com o index.html.
//
// Enquanto os valores abaixo estiverem como estão (vazios/placeholder),
// o app funciona normalmente, só que sem a opção de notificações.

window.NOTIF_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Chave VAPID (Web Push certificate).
// Onde encontrar: Firebase Console → Configurações do projeto → aba "Cloud Messaging"
// → seção "Certificados push da Web" → gerar par de chaves → copiar a chave pública.
window.NOTIF_VAPID_KEY = "";
