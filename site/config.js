// Onde o site vai buscar os dados, por ordem de preferência.
// 1) GitHub: sempre atualizado (de 20 em 20 minutos nos dias de prova), mas só funciona com o repositório público.
// 2) "data/": a cópia publicada junto com o site no Netlify (atualizada uma vez por dia).
window.SOBRERODAS_DATA = [
  "https://raw.githubusercontent.com/joaomquarenta-glitch/SobreRodas/main/data/",
  "data/",
];
