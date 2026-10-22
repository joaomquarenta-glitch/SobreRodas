/* SobreRodas — site de página única com funcionalidades dinâmicas e interativas. */
(() => {
  "use strict";
  let SOURCES = [].concat(window.SOBRERODAS_DATA || "data/");
  const PCS = "https://www.procyclingstats.com/";
  const app = document.getElementById("app");
  const cache = new Map();
  const TODAY = new Date().toISOString().slice(0, 10);
  const YEAR = Number(TODAY.slice(0, 4));

  // Injetar estilos dinâmicos para a Pesquisa Modal, Ticker e Votação
  const dynamicStyles = document.createElement("style");
  dynamicStyles.textContent = `
    .ticker-wrap { width: 100%; background: #11151f; border-bottom: 1px solid var(--line); overflow: hidden; white-space: nowrap; padding: 7px 0; font-size: 13px; }
    .ticker-move { display: inline-block; white-space: nowrap; animation: ticker 40s linear infinite; }
    .ticker-move:hover { animation-play-state: paused; }
    .ticker-item { display: inline-block; padding: 0 24px; color: var(--text); }
    .ticker-item b { color: var(--accent); }
    @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }

    .spotlight-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 9999; display: flex; justify-content: center; align-items: flex-start; padding-top: 14vh; }
    .spotlight-modal { width: 92%; max-width: 620px; background: #161b26; border: 1px solid rgba(255,255,255,0.15); border-radius: 18px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; animation: popIn .2s ease-out; }
    @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .spotlight-input-wrap { display: flex; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--line); gap: 12px; }
    .spotlight-input { width: 100%; background: none; border: none; outline: none; color: #fff; font-size: 17px; font-family: inherit; }
    .spotlight-results { max-height: 380px; overflow-y: auto; padding: 10px; }
    .spotlight-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; color: var(--text); transition: background .15s; cursor: pointer; text-decoration: none; }
    .spotlight-item:hover { background: rgba(255,255,255,0.06); color: var(--accent); }

    .poll-card { background: var(--panel2); border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin: 8px 0; cursor: pointer; transition: all .2s; }
    .poll-card:hover { border-color: var(--accent); transform: translateX(3px); }
    .poll-bar { height: 7px; background: rgba(255,255,255,0.08); border-radius: 7px; overflow: hidden; margin-top: 8px; }
    .poll-fill { height: 100%; background: var(--accent); width: 0%; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
  `;
  document.head.appendChild(dynamicStyles);

  // ------------------------------------------------------------ utilitários
  async function load(path, fresh) {
    for (const src of SOURCES) {
      try {
        const r = await fetch(src + path + (fresh ? `?t=${Date.now()}` : ""), { cache: fresh ? "no-store" : "default" });
        if (r.ok) { if (SOURCES[0] !== src) SOURCES = [src, ...SOURCES.filter(x => x !== src)]; return await r.json(); }
        if (r.status === 404 && src === SOURCES[0] && path !== "meta.json") {
          const m = await fetch(src + "meta.json", { cache: "default" }).catch(() => null);
          if (m && m.ok) return null;
        }
      } catch (e) { }
      if (SOURCES.length > 1 && src === SOURCES[0]) SOURCES = [...SOURCES.slice(1), src];
    }
    return null;
  }
  async function get(path, { fresh = false } = {}) {
    if (!fresh && cache.has(path)) return cache.get(path);
    const p = load(path, fresh);
    if (!fresh) cache.set(path, p);
    return p;
  }
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  
  const flag = cc => {
    if (!cc || cc.length !== 2) return "";
    const code = cc.toLowerCase() === "uk" ? "gb" : cc.toLowerCase();
    return `<img class="flag" src="https://flagcdn.com/28x21/${code}.png" srcset="https://flagcdn.com/56x42/${code}.png 2x" width="20" height="15" alt="${esc(cc.toUpperCase())}" style="border-radius:3px;vertical-align:-2px;margin-right:7px;box-shadow:0 1px 3px rgba(0,0,0,0
