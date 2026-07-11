// Verifica se existe algum plantão cadastrado para a data de hoje
// (coleção "plantoesAgenda" no Firestore, sincronizada pelo app — contém
// apenas data e local, nunca valores/pacientes/observações) e, se houver,
// manda uma notificação de lembrete para todos os aparelhos cadastrados
// (coleção "pushTokens").
//
// Pensado para rodar via GitHub Actions em um horário agendado, mas também
// pode ser rodado manualmente pela aba "Actions" do GitHub.
//
// Variável de ambiente necessária: FIREBASE_SERVICE_ACCOUNT
//   -> conteúdo JSON completo da chave de conta de serviço do Firebase
//      (Firebase Console → Configurações do projeto → Contas de serviço
//      → "Gerar nova chave privada").

const admin = require("firebase-admin");

function init() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT não definido. Configure o secret no GitHub.");
    process.exit(1);
  }
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Retorna a data de hoje no formato YYYY-MM-DD, no fuso de Brasília,
// independente do fuso horário em que o GitHub Actions estiver rodando.
function hojeBrasilia() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // já sai como YYYY-MM-DD
}

async function main() {
  init();
  const db = admin.firestore();

  const hoje = hojeBrasilia();
  console.log(`Verificando plantões para ${hoje}...`);

  const agendaSnap = await db
    .collection("plantoesAgenda")
    .where("data", "==", hoje)
    .get();

  if (agendaSnap.empty) {
    console.log("Nenhum plantão hoje. Nenhuma notificação será enviada.");
    return;
  }

  const locais = agendaSnap.docs
    .map((d) => (d.data().local || "").trim())
    .filter(Boolean);

  const qtd = agendaSnap.size;
  let body;
  if (qtd === 1) {
    body = locais[0] ? `Hoje tem plantão em ${locais[0]}.` : "Você tem um plantão hoje.";
  } else {
    body = locais.length
      ? `Hoje tem ${qtd} plantões: ${locais.join(", ")}.`
      : `Você tem ${qtd} plantões hoje.`;
  }

  const tokensSnap = await db.collection("pushTokens").get();
  if (tokensSnap.empty) {
    console.log("Nenhum aparelho cadastrado para notificações. Nada para enviar.");
    return;
  }
  const tokens = tokensSnap.docs.map((d) => d.id);

  const title = process.env.NOTIF_TITLE || "Plantão hoje 🐾";
  const message = {
    // Mensagem "somente dados" (sem a chave "notification"): assim a exibição
    // fica sempre a cargo do nosso próprio código (app ou service worker),
    // em vez do navegador decidir sozinho se mostra ou não.
    data: {
      title,
      body,
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
    },
    tokens,
  };

  console.log(`Enviando para ${tokens.length} aparelho(s): "${body}"`);
  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`Sucesso: ${response.successCount} | Falha: ${response.failureCount}`);

  // Limpa tokens inválidos/expirados para manter a coleção enxuta
  const toDelete = [];
  response.responses.forEach((res, i) => {
    if (!res.success) {
      const code = res.error && res.error.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        toDelete.push(tokens[i]);
      }
    }
  });
  if (toDelete.length) {
    console.log(`Removendo ${toDelete.length} token(s) inválido(s)...`);
    await Promise.all(toDelete.map((t) => db.collection("pushTokens").doc(t).delete()));
  }
}

main().catch((err) => {
  console.error("Erro ao verificar/enviar lembretes:", err);
  process.exit(1);
});
