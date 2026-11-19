// Endereço do servidor que lê a foto da escala (Cloudflare Worker + Workers AI).
// O código do servidor fica fora do GitHub, em cloudflare-worker/escala/.
//
// Enquanto estiver vazio, o app funciona normalmente, só sem o botão
// "Importar escala por foto".
window.ESCALA_URL = "https://plantoes-escala.diogopq.workers.dev";
