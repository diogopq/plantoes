# Plantões — instruções para o Claude

App web instalável (PWA) de controle de plantões veterinários da Dra. Laís.
Publicado pelo GitHub Pages a partir do ramo `main` (cada push no `main` vai
para o celular dela). Usado principalmente em **Android**, instalado a partir
de `diogopq.github.io/plantoes`.

## Estrutura

- `index.html` — o app inteiro (HTML, CSS e JS num arquivo só).
- `sw.js` — service worker: cache offline, notificações push e atualização.
- `manifest.json`, ícones — instalação na tela inicial.
- `notifications-config.js` — config do Firebase (chaves públicas de app web).
- `transcricao-config.js` — endereço do Worker de transcrição de áudio.
- `escala-config.js` — endereço do Worker que lê a foto da escala
  (`plantoes-escala`, Workers AI, modelo Mistral Small 3.1; código fora do git
  em `cloudflare-worker/escala/`). Vazio = botão "Importar escala" oculto.
- `automation/scripts/send-lembretes.js` + `.github/workflows/lembrete-diario.yml`
  — lembrete diário às 07:00 de Brasília via GitHub Actions + Firebase.

## Regra obrigatória a cada mudança publicada

Sempre que alterar qualquer arquivo do app (`index.html`, `sw.js`, configs,
ícones, manifest), no mesmo commit:

1. Aumentar a versão em `sw.js`: `const CACHE_NAME = "plantoes-vet-vN";` → `N+1`.
2. Atualizar o texto da tela de Backup em `index.html`
   (`id="appVersion"`): `Versão do app: N+1 · DD/MM/AAAA` (data de hoje).
3. Adicionar uma entrada no topo de `CHANGELOG.md` com a versão, a data e o
   que mudou, em português simples (é para o Diogo/Laís lerem).

Sem o passo 1 a faixa "Nova versão disponível" não aparece no celular.

## Como a atualização funciona (não quebrar)

- `sw.js` usa **rede primeiro** para página/scripts (cache só offline) e cache
  primeiro só para imagens. Não voltar para "cache primeiro" no HTML.
- Quando uma versão nova assume, o app mostra a faixa laranja
  "Nova versão disponível · Atualizar" (`mostrarAvisoAtualizacao` em
  `index.html`). Não recarrega sozinho para não perder cadastro em andamento
  nem pedir o PIN do nada.
- O `activate` do `sw.js` força uma recarga só para quem vinha de cache
  `plantoes-vet-v17` ou anterior (versões antigas sem a faixa).
- Sem internet o app abre a cópia guardada — é esperado não atualizar offline.

## Choque de horários

- Plantões têm `horaInicio`/`horaFim` opcionais (fim ≤ início = termina no dia
  seguinte; iguais = 24h). `verificarConflitos` em `index.html` compara com
  plantões até 2 dias de distância.
- Encavalado → aviso vermelho + confirmação ao salvar. Descanso menor que
  `DESCANSO_MIN_HORAS` (11h) → só aviso, não bloqueia.

## Importar escala por foto

- Bloco "IMPORTAR ESCALA POR FOTO" em `index.html`. O Worker devolve todas as
  pessoas; o app filtra o nome (palavra inteira: "Laís" casa, "Laísa" não).
- `importarEscala` nunca sobrescreve nem duplica: pula se já existe plantão no
  mesmo dia + mesmo local (um contém o outro) + mesmo horário de início.
  Arquivos `.json` com `"origem":"escala"` no Importar backup usam essa regra.
- A leitura erra às vezes nome escrito à mão: manter a tela de conferência.

## Dados — cuidado

- Plantões, pacientes, agenda e comissões ficam **só no aparelho** (`localStorage`:
  `vet-plantoes-v1`, `vet-pacientes-v1`, `vet-agenda-v1`, `vet-comissoes-v1`;
  backup leva `comissoes`). Comissões nunca vão ao Firestore. Só data/local da
  agenda vão ao Firestore para o lembrete.
- Nunca mudar essas chaves nem o formato do backup sem migração.
- Nunca orientar a apagar/reinstalar o app ou "limpar dados do site": apaga
  tudo. Antes de qualquer procedimento arriscado: Backup → Exportar (.json).
- Importar backup mescla por `id` (não apaga, não duplica).

## Conversa

- Responder em português do Brasil, linguagem simples (o dono não é dev).
