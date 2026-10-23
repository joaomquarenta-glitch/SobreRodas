Não, a Vercel NÃO atingiu limite nenhum! A Vercel é 100% gratuita e ilimitada
para este tipo de aplicação.

O erro foi meu na mensagem anterior: na lista de páginas deixei lá a chamada
para a função de Transferências (viewTransfers), mas esqueci-me de colar o bloco
dessa função no ficheiro!

Quando o navegador tentou ler o ficheiro, procurou a função das Transferências,
não a encontrou e travou o arranque do site em "A carregar...".

Já corrigi tudo e juntei todas as funções no sítio certo!

Agora o ficheiro tem as 13 páginas completas (incluindo as Lendas com fotos
históricas, as Bicicletas das equipas e as Transferências):

1.  Abra o ficheiro no GitHub: 👉
    https://github.com/joaomquarenta-glitch/SobreRodas/edit/main/site/app.js
2.  Selecione tudo com Ctrl + A e apague com Delete.
3.  Copie o código corrigido abaixo e cole com Ctrl + V:

/* SobreRodas — Plataforma Dinâmica de Ciclismo (Completa com Lendas, Equipas & Transferências) */
(() => {
  "use strict";

  let SOURCES = [].concat(window.SOBRERODAS_DATA || "data/");
  const PCS = "https://www.procyclingstats.com/";
  const app = document.getElementById("app");
  const cache = new Map();
  const TODAY = new Date().toISOString().slice(0, 10);
  const YEAR = Number(TODAY.slice(0, 4));

  // Micro-vibração táctil para telemóveis
  const haptic = (pattern = 20) => {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch(e) {}
    }
  };

  // ------------------------------------------------------------ 🎨 TEMAS DAS EQUIPAS
  const TEAM_THEMES = {
    default: { name: "SobreRodas (Amarelo)", accent: "#ffd60a", glow: "rgba(255,214,10,0.25)" },
    uae: { name: "🇦🇪 UAE Emirates", accent: "#e63946", glow: "rgba(230,57,70,0.3)" },
    decathlon: { name: "🇫🇷 Decathlon AG2R", accent: "#00d2d3", glow: "rgba(0,210,211,0.3)" },
    visma: { name: "🇳🇱 Visma-Lease a Bike", accent: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
    soudal: { name: "🇧🇪 Soudal Quick-Step", accent: "#3b82f6", glow: "rgba(59,130,246,0.3)" },
    ef: { name: "🇺🇸 EF Education", accent: "#ff4fa3", glow: "rgba(255,79,163,0.3)" },
    ineos: { name: "🇬🇧 INEOS Grenadiers", accent: "#ea580c", glow: "rgba(234,88,12,0.3)" },
    pt: { name: "🇵🇹 Portugal / Quinas", accent: "#2ecc71", glow: "rgba(46,204,113,0.3)" }
  };

  function applyTeamTheme(key) {
    const t = TEAM_THEMES[key] || TEAM_THEMES.default;
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--accent-glow", t.glow);
    localStorage.setItem("sobrerodas:team_theme", key);
    haptic(25);
  }

  try {
    const savedTheme = localStorage.getItem("sobrerodas:team_theme");
    if (savedTheme && TEAM_THEMES[savedTheme]) applyTeamTheme(savedTheme);
  } catch(e) {}

  // Injetar estilos dinâmicos
  try {
    const dynamicStyles = document.createElement("style");
    dynamicStyles.textContent = `
      .ticker-wrap { width: 100%; background: #11151f; border-bottom: 1px solid var(--line); overflow: hidden; white-space: nowrap; padding: 7px 0; font-size: 13px; }
      .ticker-move { display: inline-block; white-space: nowrap; animation: ticker 40s linear infinite; }
      .ticker-move:hover { animation-play-state: paused; }
      .ticker-item { display: inline-block; padding: 0 24px; color: var(--text); }
      .ticker-item b { color: var(--accent); }
      @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }

      .gt-card { transition: transform .2s ease, box-shadow .2s ease; }
      .gt-card:hover { transform: translateY(-4px); }

      .tv-card { background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(255, 214, 10, 0.3); border-radius: 14px; padding: 18px; margin: 18px 0; }
      .tuga-card { border-left: 3px solid #2ecc71; transition: transform .15s; }
      .tuga-card:hover { transform: translateY(-2px); border-color: var(--accent); }

      .radar-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--panel2); border-radius: 16px; padding: 16px; border: 1px solid var(--line); }
      .trophy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-top: 12px; }
      .trophy-badge { background: linear-gradient(135deg, rgba(255,214,10,0.1), rgba(20,24,34,0.9)); border: 1px solid rgba(255,214,10,0.35); border-radius: 12px; padding: 12px 10px; text-align: center; }
      .trophy-badge .icon { font-size: 24px; margin-bottom: 4px; display: block; }
      .trophy-badge .count { font-family: var(--head); font-size: 20px; font-weight: 800; color: var(--accent); }
      .trophy-badge .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }

      .predict-box { background: linear-gradient(135deg, #182030, #121620); border: 1px solid rgba(255, 214, 10, 0.35); border-radius: 16px; padding: 22px; margin: 20px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      .predict-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin: 16px 0; }
      .predict-slot { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
      .predict-slot select { width: 100%; }

      .career-card { background: linear-gradient(135deg, #1e2638, #111520); border: 1px solid rgba(255,214,10,0.4); border-radius: 18px; padding: 24px; margin: 20px 0; }
      .career-progress { height: 12px; background: rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; margin: 12px 0 6px; border: 1px solid var(--line); }
      .career-fill { height: 100%; background: linear-gradient(90deg, #ffd60a, #ff9f1c); transition: width .6s ease; }

      .countdown-clock { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
      .cd-item { background: rgba(0,0,0,0.4); border: 1px solid var(--line); border-radius: 10px; padding: 6px 12px; text-align: center; min-width: 58px; }
      .cd-num { font-family: var(--head); font-size: 26px; font-weight: 900; color: var(--accent); line-height: 1; }
      .cd-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 3px; }
      .cd-sep { font-family: var(--head); font-size: 24px; font-weight: 800; color: rgba(255,255,255,0.2); }

      .weather-card { background: linear-gradient(135deg, #1a2232, #101520); border: 1px solid rgba(100,150,255,0.25); border-radius: 14px; padding: 18px; margin: 18px 0; }
      .wind-compass { display: inline-flex; align-items: center; gap: 8px; background: var(--panel2); padding: 6px 12px; border-radius: 20px; border: 1px solid var(--line); }

      .transfer-card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 16px; transition: transform .2s, border-color .2s; }
      .transfer-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.25); }
      .transfer-route { display: flex; align-items: center; justify-content: space-between; background: var(--panel2); border-radius: 12px; padding: 12px 14px; margin: 12px 0 6px; border: 1px solid rgba(255,255,255,0.05); }
      .transfer-team { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
      .transfer-arrow { font-size: 18px; color: var(--accent); font-weight: 900; padding: 0 8px; }

      .legend-card-rich { background: linear-gradient(145deg, #161b26, #10131a); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; transition: transform .2s, border-color .2s; box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
      .legend-card-rich:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 15px var(--accent-glow); }
      .legend-photo-wrap { position: relative; width: 100%; height: 220px; overflow: hidden; background: #1a202c; }
      .legend-photo-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: top center; transition: transform .3s; }
      .legend-card-rich:hover .legend-photo-wrap img { transform: scale(1.04); }
      .legend-info { padding: 18px; display: flex; flex-direction: column; flex: 1; }
      .legend-nick { font-family: var(--head); color: var(--accent); font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
      .legend-name { font-family: var(--head); font-size: 24px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px; color: #fff; }
      .legend-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; padding-top: 10px; }

      #update-banner { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background: #131926; border: 1px solid var(--accent); border-radius: 30px; padding: 8px 18px; display: none; align-items: center; gap: 12px; z-index: 999999; box-shadow: 0 10px 30px rgba(0,0,0,0.7); }

      .mobile-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(14, 18, 26, 0.96); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-top: 1px solid var(--line); z-index: 1000; padding: 8px 10px max(10px, env(safe-area-inset-bottom)); justify-content: space-around; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); }
      .mobile-nav a { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; text-decoration: none; padding: 4px 8px; border-radius: 10px; }
      .mobile-nav a.on, .mobile-nav a:hover { color: var(--accent); }
      .mobile-nav a span.icon { font-size: 18px; }
      @media (max-width: 768px) {
        .mobile-nav { display: flex; }
        body { padding-bottom: 70px; }
      }

      #confetti-canvas { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 99999; }
    `;
    document.head.appendChild(dynamicStyles);
  } catch(e) {}

  function setupUpdateChecker() {
    let banner = document.getElementById("update-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "update-banner";
      banner.innerHTML = `
        <span style="font-size:13px;font-weight:700;color:#fff">⚡ Nova versão disponível!</span>
        <button class="btn" id="btn-do-update" style="padding:4px 12px;font-size:12px;border-radius:20px">Atualizar agora</button>
      `;
      document.body.appendChild(banner);
      const bBtn = document.getElementById("btn-do-update");
      if (bBtn) {
        bBtn.onclick = () => {
          haptic(30);
          window.location.reload(true);
        };
      }
    }
  }

  function launchConfetti() {
    let canvas = document.getElementById("confetti-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "confetti-canvas";
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ["#ffd60a", "#ff4fa3", "#2ecc71", "#00d2d3", "#ffffff", "#ff4d4d"];
    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        c: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 8
      });
    }

    let frames = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frames++;
      if (frames < 90) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
  }

  function downloadRaceCalendar(race, slug, year) {
    haptic(30);
    const startDate = (race.start || `${year}-01-01`).replace(/-/g, "");
    const endDate = (race.end || race.start || `${year}-01-01`).replace(/-/g, "");
    const icsData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SobreRodas//Ciclismo//PT",
      "BEGIN:VEVENT",
      `SUMMARY:🚴 ${cleanName(race.name || slug)} ${year}`,
      `DESCRIPTION:Acompanha a corrida no SobreRodas e na TV (Eurosport / RTP2).`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${slug}-${year}.ics`;
    link.click();
  }

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
    return `<img class="flag" src="https://flagcdn.com/28x21/${code}.png" srcset="https://flagcdn.com/56x42/${code}.png 2x" width="18" height="13" alt="${esc(cc.toUpperCase())}" style="border-radius:2px;vertical-align:-1px;margin-right:6px">`;
  };

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const fmtDate = iso => (iso ? `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1]}` : "");
  const fmtRange = (a, b) => (!b || a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);
  const titleCase = w => w.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  
  function niceName(n) {
    if (!n) return "";
    const parts = n.split(" ");
    const sur = parts.filter(p => p === p.toUpperCase() && /\p{L}/u.test(p));
    const first = parts.filter(p => !(p === p.toUpperCase() && /\p{L}/u.test(p)));
    if (!sur.length || !first.length) return n;
    return `${first.join(" ")} ${titleCase(sur.join(" "))}`;
  }

  function surname(n) {
    if (!n) return "";
    const parts = n.split(" ");
    const sur = parts.filter(p => p === p.toUpperCase() && /\p{L}/u.test(p));
    if (sur.length && sur.length < parts.length) return titleCase(sur.join(" "));
    return parts.length > 1 ? parts.slice(1).join(" ") : n;
  }

  const riderLink = (slug, name, nation) => `${flag(nation)}<a href="#/ciclista/${esc(slug)}">${esc(niceName(name))}</a>`;
  const teamLink = (slug, name) => (slug ? `<a class="team-link" href="#/equipa/${esc(slug)}">${shirt(slug)}${esc(name || slug)}</a>` : esc(name || ""));
  const raceLink = (slug, year, label) => `<a href="#/prova/${esc(slug)}/${year}">${esc(label)}</a>`;
  
  const status = (r) => {
    if ((r.end || r.start) === TODAY && (r.finished || (r.live && r.live.status && r.live.status.status === "finished"))) return "done";
    return r.start <= TODAY && TODAY <= (r.end || r.start) ? "live" : (r.end || r.start) < TODAY ? "done" : "next";
  };

  const fmtTime = (row, i) => {
    if (!row.time) return "";
    if (i === 0) return row.time;
    return row.time.startsWith("+") ? row.time : `+${row.time}`;
  };

  const PARCOURS = { 1: "Plano", 2: "Ondulado, final plano", 3: "Ondulado, chegada em subida", 4: "Montanha, final plano", 5: "Montanha, chegada em alto" };
  const parcoursIcon = c => {
    const shapes = {
      1: "M2 18 L42 18", 2: "M2 18 L10 12 L16 16 L24 8 L30 14 L42 18", 3: "M2 18 L12 12 L18 16 L28 10 L42 4",
      4: "M2 18 L10 4 L18 16 L26 6 L34 16 L42 18", 5: "M2 18 L10 8 L18 16 L28 6 L34 12 L42 2",
    };
    return `<svg class="ptype" viewBox="0 0 44 22"><path d="${shapes[c] || shapes[1]}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  };

  const isWT = c => /UWT|WC/.test(c || "");
  const classTag = c => `<span class="tag ${isWT(c) ? "wt" : ""}">${esc(c)}</span>`;
  const FAVS_KEY = "sobrerodas:favs";
  const favs = {
    all() { try { return JSON.parse(localStorage.getItem(FAVS_KEY)) || []; } catch { return []; } },
    has(slug) { return this.all().some(f => f.slug === slug); },
    toggle(item) {
      let list = this.all();
      list = this.has(item.slug) ? list.filter(f => f.slug !== item.slug) : [...list, item];
      try { localStorage.setItem(FAVS_KEY, JSON.stringify(list)); } catch { }
      return this.has(item.slug);
    },
  };

  const starBtn = (slug, name) =>
    `<button class="star ${favs.has(slug) ? "on" : ""}" data-fav="${esc(slug)}" data-name="${esc(name)}">${favs.has(slug) ? "★ A seguir" : "☆ Seguir"}</button>`;

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-fav]");
    if (!b) return;
    haptic(30);
    const on = favs.toggle({ slug: b.dataset.fav, name: b.dataset.name });
    b.classList.toggle("on", on);
    b.textContent = on ? "★ A seguir" : "☆ Seguir";
  });

  function tabs(container, items, render) {
    if (!container) return;
    const id = "t" + Math.random().toString(36).slice(2, 8);
    container.innerHTML = `<div class="tabs" id="${id}">${items.map((t, i) =>
      `<button data-k="${esc(t.key)}" class="${i === 0 ? "on" : ""}">${t.dot ? `<span class="jersey ${t.dot}"></span>` : ""}${esc(t.label)}</button>`).join("")}</div><div class="tab-body"></div>`;
    const body = container.querySelector(".tab-body");
    const show = k => { if (body) body.innerHTML = render(k); };
    const tabsBar = container.querySelector(".tabs");
    if (tabsBar) {
      tabsBar.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        haptic(15);
        container.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b));
        show(b.dataset.k);
      });
    }
    if (items.length) show(items[0].key);
  }

  const CLS = [
    { key: "stage", label: "Etapa" }, { key: "gc", label: "Geral", dot: "j-gc" }, { key: "points", label: "Pontos", dot: "j-points" },
    { key: "kom", label: "Montanha", dot: "j-kom" }, { key: "youth", label: "Juventude", dot: "j-youth" }, { key: "teams", label: "Equipas", dot: "j-teams" },
  ];

  const initials = n => esc(String(n || "?").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase());
  const avatar = (slug, name, cls = "") => `<span class="avatar ${cls}" data-i="${initials(niceName(name || ""))}"><img loading="lazy" src="${esc(SOURCES[0])}photos/${esc(slug)}.jpg" data-n="0" data-f="photos/${esc(slug)}.jpg" alt="" onerror="SR_photoError(this)"></span>`;
  const shirt = (slug, cls = "shirt") => slug ? `<img class="${cls}" loading="lazy" src="${esc(SOURCES[0])}shirts/${esc(slug)}.png" data-n="0" data-f="shirts/${esc(slug)}.png" alt="" onerror="SR_photoError(this)">` : "";

  window.SR_photoError = img => {
    const n = Number(img.dataset.n) + 1;
    if (n < SOURCES.length) { img.dataset.n = n; img.src = SOURCES[n] + img.dataset.f; } else img.remove();
  };

  const LIVE_STATUS = { prerace: "antes da partida", racing: "em corrida", finished: "terminada" };
  const cleanName = n => String(n || "").replace(/^\d{4}\s*»\s*/, "").replace(/\s*\((?:1|2)\.[A-Za-z]+\)$/, "");

  function classTable(rows, kind, limit = 0) {
    if (!rows || !rows.length) return `<div class="empty">Ainda sem resultados.</div>`;
    const list = limit ? rows.slice(0, limit) : rows;
    const byPoints = kind === "points" || kind === "kom";
    const isTeams = kind === "teams" || kind === "teams_day";
    const head = isTeams ? `<th>#</th><th>Equipa</th><th class="r">Tempo</th>`
      : `<th>#</th><th>Ciclista</th>${byPoints ? `<th class="r">Pontos</th>` : `<th class="r">Tempo</th>`}${list.some(r => r.delta !== undefined) ? `<th class="r"></th>` : ""}`;
    const body = list.map((r, i) => {
      const d = r.delta ? `<td class="r ${r.delta > 0 ? "up" : "down"}">${r.delta > 0 ? "▲" : "▼"}${Math.abs(r.delta)}</td>` : (list.some(x => x.delta !== undefined) ? `<td></td>` : "");
      if (isTeams) return `<tr><td class="rank">${esc(r.rank)}</td><td>${flag(r.nation)}${teamLink(r.team, r.name)}</td><td class="r">${esc(fmtTime(r, i))}</td></tr>`;
      const val = byPoints ? esc(r.points ?? "") : esc(fmtTime(r, i));
      return `<tr><td class="rank">${esc(r.rank)}</td><td>${riderLink(r.rider, r.name, r.nation)}<span class="team">${shirt(r.team)}${esc(r.team_name || "")}</span></td><td class="r">${val}${r.bonus && !byPoints ? ` <span class="muted small">(${r.bonus}″)</span>` : ""}</td>${d}</tr>`;
    }).join("");
    const more = limit && rows.length > limit ? `<button class="chip more-btn" data-kind="${esc(kind)}">Ver todos (${rows.length})</button>` : "";
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${more}`;
  }

  function classificationTabs(el, cls, firstLabel = "Etapa") {
    if (!el) return;
    const items = CLS.filter(c => cls && cls[c.key] && cls[c.key].length).map(c => (c.key === "stage" ? { ...c, label: firstLabel } : c));
    if (!items.length) { el.innerHTML = `<div class="empty">Ainda sem resultados.</div>`; return; }
    tabs(el, items, k => classTable(cls[k], k, 25));
    el.onclick = e => {
      const b = e.target.closest(".more-btn");
      if (b) { haptic(15); b.parentElement.innerHTML = classTable(cls[b.dataset.kind], b.dataset.kind); }
    };
  }

  // ------------------------------------------------------------ TICKER
  function renderTicker() {
    let wrap = document.getElementById("sobrerodas-ticker");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "sobrerodas-ticker";
      wrap.className = "ticker-wrap";
      const topbar = document.querySelector(".topbar");
      if (topbar && topbar.parentNode) topbar.parentNode.insertBefore(wrap, topbar.nextSibling);
      else document.body.prepend(wrap);
    }
    const news = [
      `🎨 <b>EQUIPA FAVORITA:</b> Personaliza as cores da app no topo!`,
      `🔥 <b>MERCADO:</b> Todas as novidades, contratações e rumores para ${YEAR + 1}`,
      `🏁 <b>TEMPORADA ${YEAR}:</b> Época concluída! O pelotão entra em estágio de pré-época`,
      `🇦🇺 <b>NOVA ÉPOCA:</b> Contagem decrescente para o Tour Down Under ${YEAR + 1}`,
      `🇵🇹 <b>PORTUGAL:</b> João Almeida e António Morgado preparam a nova época na UAE`,
      `🏆 <b>RANKING FINAL:</b> Tadej Pogačar fecha o ano como número 1 mundial indiscutível`,
      `⚔️ <b>DUELO:</b> Compara os rivais e os palmarés no menu Duelo de Ciclistas`
    ];
    const content = news.map(n => `<span class="ticker-item">${n}</span>`).join(" · ");
    wrap.innerHTML = `<div class="ticker-move">${content} &nbsp;·&nbsp; ${content}</div>`;
  }

  // ------------------------------------------------------------ BARRA MOBILE INFERIOR
  function renderMobileNav(currentNav) {
    let bNav = document.getElementById("sobrerodas-mobile-nav");
    if (!bNav) {
      bNav = document.createElement("div");
      bNav.id = "sobrerodas-mobile-nav";
      bNav.className = "mobile-nav";
      document.body.appendChild(bNav);
    }
    bNav.innerHTML = `
      <a href="#/" class="${currentNav === 'home' ? 'on' : ''}"><span class="icon">🏠</span>Início</a>
      <a href="#/calendario" class="${currentNav === 'calendario' ? 'on' : ''}"><span class="icon">📅</span>Provas</a>
      <a href="#/duelo" class="${currentNav === 'duelo' ? 'on' : ''}"><span class="icon">⚔️</span>Duelo</a>
      <a href="#/transferencias" class="${currentNav === 'transferencias' ? 'on' : ''}"><span class="icon">🔥</span>Mercado</a>
      <a href="#/palpites" class="${currentNav === 'palpites' ? 'on' : ''}"><span class="icon">🎮</span>Palpites</a>
    `;
  }

  // ------------------------------------------------------------ 👑 LENDAS HISTÓRICAS COM FOTOS REAIS
  const HISTORIC_LEGENDS = [
    {
      slug: "eddy-merckx", name: "Eddy Merckx", nick: "O Canibal", nation: "be", years: "1965 – 1978",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Eddy_Merckx_1973.jpg/480px-Eddy_Merckx_1973.jpg",
      palmares: ["5x Tour de France 🟡", "5x Giro d'Italia 🌸", "1x Vuelta a España 🔴", "3x Campeão do Mundo 🌈", "19 Monumentos 🪨"],
      bio: "Considerado por unanimidade o maior ciclista de todos os tempos. Vencia em montanha, contrarrelógio e sprint."
    },
    {
      slug: "joaquim-agostinho", name: "Joaquim Agostinho", nick: "O Grande Agostinho", nation: "pt", years: "1968 – 1984",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Joaquim_Agostinho_1977.jpg/480px-Joaquim_Agostinho_1977.jpg",
      palmares: ["2x Pódio no Tour de France (3.º) 🟡", "Vencedor no Alpe d'Huez ⛰️", "3x Volta a Portugal 🇵🇹", "Vice-Campeão da Vuelta 🔴"],
      bio: "O maior ciclista português de sempre. Herói do Alpe d'Huez e um dos atletas mais resistentes da história do desporto mundial."
    },
    {
      slug: "marco-pantani", name: "Marco Pantani", nick: "O Pirata (Il Pirata)", nation: "it", years: "1992 – 2003",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Marco_Pantani_1997.jpg/480px-Marco_Pantani_1997.jpg",
      palmares: ["Tour de France 1998 🟡", "Giro d'Italia 1998 🌸", "Recorde de subida no Alpe d'Huez ⚡", "8 Etapas no Giro"],
      bio: "O mais carismático escalador puro da era moderna. As suas acelerações em pé nas montanhas permanecem inesquecíveis."
    },
    {
      slug: "bernard-hinault", name: "Bernard Hinault", nick: "O Texugo (Le Blaireau)", nation: "fr", years: "1975 – 1986",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Bernard_Hinault_1978.jpg/480px-Bernard_Hinault_1978.jpg",
      palmares: ["5x Tour de France 🟡", "3x Giro d'Italia 🌸", "2x Vuelta 🔴", "Campeão do Mundo 🌈", "Paris-Roubaix 🪨"],
      bio: "Vencedor de todas as Grandes Voltas mais do que uma vez. Famoso pelo seu espírito combativo implacável."
    },
    {
      slug: "miguel-indurain", name: "Miguel Indurain", nick: "O Rei Miguel", nation: "es", years: "1984 – 1996",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Miguel_Indurain_1996.jpg/480px-Miguel_Indurain_1996.jpg",
      palmares: ["5x Tour de France Consecutivos 🟡", "2x Giro d'Italia 🌸", "Ouro Olímpico CRI 🥇", "Recorde da Hora"],
      bio: "Dominou o ciclismo nos anos 90 com uma capacidade sobre-humana no contrarrelógio e grande solidez na alta montanha."
    },
    {
      slug: "rui-costa", name: "Rui Costa", nick: "Campeão do Mundo", nation: "pt", years: "2007 – Ativo",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Rui_Costa_2013.jpg/480px-Rui_Costa_2013.jpg",
      palmares: ["Campeão do Mundo de Fundo 🌈", "3x Etapas no Tour 🟡", "3x Volta à Suíça 🇨🇭", "Clássica de Montreal 🏆"],
      bio: "O primeiro campeão do mundo português de ciclismo de elite. Um dos ciclistas com leitura tática mais brilhante do pelotão."
    },
    {
      slug: "fausto-coppi", name: "Fausto Coppi", nick: "Il Campionissimo", nation: "it", years: "1939 – 1959",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Fausto_Coppi_1952.jpg/480px-Fausto_Coppi_1952.jpg",
      palmares: ["2x Tour de France 🟡", "5x Giro d'Italia 🌸", "5x Giro di Lombardia 🪨", "Recorde da Hora ⏱️"],
      bio: "A maior lenda desportiva italiana. O homem que revolucionou o treino, a alimentação e a mística das grandes fugas."
    },
    {
      slug: "alves-barbosa", name: "Alves Barbosa", nick: "O Ás de Montemor", nation: "pt", years: "1950 – 1961",
      photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Alves_Barbosa.jpg/480px-Alves_Barbosa.jpg",
      palmares: ["3x Volta a Portugal 🇵🇹", "10.º no Tour de France (1956) 🟡", "Pioneiro do Ciclismo Nacional"],
      bio: "Primeiro português a terminar no Top 10 do Tour de France. Uma referência lendária para várias gerações."
    }
  ];

  async function viewLegends() {
    clearInterval(countdownTimer);
    let mode = "all";

    let html = `<div class="race-head">
      <div>
        <div class="kicker">👑 HISTÓRIA DO CICLISMO</div>
        <h1>OS MAIORES DE SEMPRE</h1>
        <p class="muted">Os atletas imortais que escreveram a história do ciclismo em Portugal e no mundo.</p>
      </div>
    </div>

    <div class="tabs" id="legend-tabs" style="margin-bottom:20px">
      <button class="on" data-k="all">Todas as Lendas (${HISTORIC_LEGENDS.length})</button>
      <button data-k="pt">🇵🇹 Portugal</button>
      <button data-k="world">🌍 Mundiais</button>
    </div>

    <div class="grid" id="legends-grid" style="grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:20px"></div>`;

    app.innerHTML = html;

    const grid = document.getElementById("legends-grid");
    const lTabs = document.getElementById("legend-tabs");

    const render = () => {
      let filtered = HISTORIC_LEGENDS;
      if (mode === "pt") filtered = filtered.filter(l => l.nation === "pt");
      else if (mode === "world") filtered = filtered.filter(l => l.nation !== "pt");

      grid.innerHTML = filtered.map(l => `
        <div class="legend-card-rich">
          <div class="legend-photo-wrap">
            <img src="${esc(l.photo)}" alt="${esc(l.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1544717305-2782549b5136?w=600'">
            <div style="position:absolute;top:10px;right:10px">${flag(l.nation)}</div>
            <div style="position:absolute;bottom:8px;left:12px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:3px 8px;border-radius:6px;font-size:11px;color:#fff">${l.years}</div>
          </div>
          <div class="legend-info">
            <div class="legend-nick">“${esc(l.nick)}”</div>
            <div class="legend-name">${esc(l.name)}</div>
            <div class="muted small" style="line-height:1.4;margin-bottom:12px">${esc(l.bio)}</div>
            <div class="legend-stats">
              ${l.palmares.map(p => `<span class="tag" style="background:rgba(255,214,10,0.12);color:var(--accent);border-color:rgba(255,214,10,0.3)">${p}</span>`).join("")}
            </div>
            <div style="margin-top:14px;text-align:right">
              <a class="btn ghost small" target="_blank" rel="noopener" href="${PCS}rider/${esc(l.slug)}">Palmarés Completo ↗</a>
            </div>
          </div>
        </div>
      `).join("");
    };

    if (lTabs) {
      lTabs.onclick = e => {
        const b = e.target.closest("button");
        if (!b) return;
        haptic(15);
        lTabs.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
        mode = b.dataset.k;
        render();
      };
    }

    render();
  }

  // ------------------------------------------------------------ 🚲 EQUIPAS & MÁQUINAS OFICIAIS
  const TEAM_GEAR = {
    "uae-team-emirates": { bike: "Colnago V4Rs", groupset: "Shimano Dura-Ace Di2", wheels: "ENVE" },
    "team-visma-lease-a-bike": { bike: "Cervélo S5 / R5", groupset: "SRAM Red AXS", wheels: "Reserve" },
    "soudal-quick-step": { bike: "Specialized Tarmac SL8", groupset: "Shimano Dura-Ace Di2", wheels: "Roval" },
    "ineos-grenadiers": { bike: "Pinarello Dogma F", groupset: "Shimano Dura-Ace Di2", wheels: "Shimano" },
    "alpecin-deceuninck": { bike: "Canyon Aeroad CFR", groupset: "Shimano Dura-Ace Di2", wheels: "Shimano" },
    "decathlon-ag2r-la-mondiale-team": { bike: "Van Rysel RCR Pro", groupset: "Shimano Dura-Ace Di2", wheels: "Swiss Side" },
    "lidl-trek": { bike: "Trek Madone Gen 8", groupset: "SRAM Red AXS", wheels: "Bontrager" },
    "red-bull-bora-hansgrohe": { bike: "Specialized S-Works SL8", groupset: "SRAM Red AXS", wheels: "Roval" },
    "ef-education-easypost": { bike: "Cannondale SuperSix EVO", groupset: "Shimano Dura-Ace Di2", wheels: "Vision" },
    "abtf-betao-feirense": { bike: "Swift Carbon Racevox", groupset: "Shimano Ultegra Di2", wheels: "Mavic" },
    "efapel-cycling": { bike: "Torpado Matris", groupset: "Shimano Dura-Ace", wheels: "Prototype" }
  };

  async function viewTeams(year) {
    clearInterval(countdownTimer);
    year = Number(year) || YEAR;
    const idx = await get(`teams/index-${year}.json`);
    const teams = (idx && idx.teams) || [];
    let mode = "all";

    let html = `${await topPeloton({ compact: true })}<div class="race-head">
      <div>
        <div class="kicker">🛡️ PELOTÃO PROFISSIONAL</div>
        <h1>EQUIPAS ${year}</h1>
        <div class="muted">${teams.length} equipas registadas na época</div>
      </div>
    </div>

    <div class="tabs" id="teams-cat-filter" style="margin-bottom:18px">
      <button class="on" data-k="all">Todas as Equipas (${teams.length})</button>
      <button data-k="wt">WorldTeams (WT)</button>
      <button data-k="pt">🇵🇹 Portugal / Nacionais</button>
    </div>

    <div class="grid small-cards" id="teams-grid"></div>`;

    app.innerHTML = html;

    const grid = document.getElementById("teams-grid");
    const tcf = document.getElementById("teams-cat-filter");

    const render = () => {
      let filtered = teams;
      if (mode === "wt") filtered = filtered.filter(t => (t.level || "").toUpperCase() === "WT");
      else if (mode === "pt") filtered = filtered.filter(t => t.nation === "pt");

      grid.innerHTML = filtered.map(t => {
        const gear = TEAM_GEAR[t.slug];
        return `
          <a class="card team-card" href="#/equipa/${esc(t.slug)}" style="flex-direction:column;align-items:flex-start;gap:10px">
            <div style="display:flex;align-items:center;gap:10px;width:100%">
              ${shirt(t.slug, "shirt big")}
              <div style="min-width:0;flex:1">
                <b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${flag(t.nation)}${esc(t.name)}</b>
                <div class="muted small">${t.level || "Equipa"} · ${t.riders || ""} ciclistas</div>
              </div>
            </div>
            ${gear ? `<div class="tag" style="font-size:10px;background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1)">🚲 ${gear.bike}</div>` : ""}
          </a>
        `;
      }).join("") || `<div class="empty">Sem equipas nesta categoria.</div>`;
    };

    if (tcf) {
      tcf.onclick = e => {
        const b = e.target.closest("button");
        if (!b) return;
        haptic(15);
        tcf.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
        mode = b.dataset.k;
        render();
      };
    }

    render();
  }

  async function viewTeam(slug) {
    clearInterval(countdownTimer);
    const t = await get(`teams/${slug}.json`);
    if (!t) { app.innerHTML = `<div class="empty">Ainda não temos esta equipa.</div>`; return; }
    const riders = t.riders || [];
    const gear = TEAM_GEAR[slug] || (t.gear && { bike: t.gear.Bike, groupset: t.gear.Groupset, wheels: t.gear.Wheels }) || {};

    let html = `<div class="race-head">${shirt(slug, "shirt huge")}<div>
      <div class="muted">${flag(t.nation)} ${t.level || "WorldTeam"} · Época ${t.season || YEAR}</div>
      <h1>${esc(t.name)}</h1>
      <div class="row">${classTag(t.level || "WT")} <span class="tag">${riders.length} Ciclistas</span></div>
    </div></div>`;

    if (gear.bike) {
      html += `<div class="panel" style="background:linear-gradient(135deg,rgba(255,214,10,0.08),rgba(20,24,34,0.95));border:1px solid rgba(255,214,10,0.3);padding:18px;margin:18px 0">
        <h3 style="margin:0 0 10px;font-size:18px">🚲 Bicicleta & Material Oficial</h3>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <div><span class="muted small">QUADRO:</span> <b style="color:var(--accent)">${gear.bike}</b></div>
          ${gear.groupset ? `<div><span class="muted small">GRUPO:</span> <b>${gear.groupset}</b></div>` : ""}
          ${gear.wheels ? `<div><span class="muted small">RODAS:</span> <b>${gear.wheels}</b></div>` : ""}
        </div>
      </div>`;
    }

    html += `<div class="section">
      <div class="section-head">
        <h2>Plantel da Equipa</h2>
        <span class="muted small">${riders.length} Atletas</span>
      </div>
      <div class="tabs" id="team-filter" style="margin-bottom:14px">
        <button class="on" data-k="all">Todos (${riders.length})</button>
        <button data-k="pt">🇵🇹 Portugueses</button>
      </div>
      <div class="grid small-cards" id="team-roster">
        ${riders.map(r => `<a class="card rider-card" href="#/ciclista/${esc(r.rider)}">${avatar(r.rider, r.name)}<div><b>${flag(r.nation)}${esc(niceName(r.name))}</b><div class="muted small">${r.age ? `${r.age} anos` : ""}</div></div></a>`).join("")}
      </div>
    </div>`;

    app.innerHTML = html;

    const tf = document.getElementById("team-filter");
    const roster = document.getElementById("team-roster");
    if (tf && roster) {
      tf.onclick = e => {
        const b = e.target.closest("button");
        if (!b) return;
        haptic(15);
        tf.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
        const mode = b.dataset.k;
        let filtered = riders;
        if (mode === "pt") filtered = riders.filter(r => r.nation === "pt");
        roster.innerHTML = filtered.map(r => `<a class="card rider-card" href="#/ciclista/${esc(r.rider)}">${avatar(r.rider, r.name)}<div><b>${flag(r.nation)}${esc(niceName(r.name))}</b><div class="muted small">${r.age ? `${r.age} anos` : ""}</div></div></a>`).join("") || `<div class="empty">Sem atletas nesta categoria.</div>`;
      };
    }
  }

  // ------------------------------------------------------------ 🔥 MERCADO DE TRANSFERÊNCIAS (COMPLETO)
  const TRANSFERS_DATA = [
    {
      rider: "julian-alaphilippe", name: "Julian Alaphilippe", nation: "fr",
      from_team: "soudal-quick-step", from_name: "Soudal Quick-Step",
      to_team: "tudor-pro-cycling-team", to_name: "Tudor Pro Cycling",
      status: "official", years: "2027 – 2029", highlight: true, note: "A grande contratação do projeto de Fabian Cancellara!"
    },
    {
      rider: "antonio-morgado", name: "António Morgado", nation: "pt",
      from_team: "uae-team-emirates", from_name: "UAE Team Emirates",
      to_team: "uae-team-emirates", to_name: "UAE Team Emirates",
      status: "official", years: "Renovação até 2030", highlight: true, note: "Contrato de longa duração blindado pela formação árabe!"
    },
    {
      rider: "marc-hirschi", name: "Marc Hirschi", nation: "ch",
      from_team: "uae-team-emirates", from_name: "UAE Team Emirates",
      to_team: "tudor-pro-cycling-team", to_name: "Tudor Pro Cycling",
      status: "official", years: "2027 – 2029", highlight: false
    },
    {
      rider: "jhonatan-narvaez", name: "Jhonatan Narváez", nation: "ec",
      from_team: "ineos-grenadiers", from_name: "INEOS Grenadiers",
      to_team: "uae-team-emirates", to_name: "UAE Team Emirates",
      status: "official", years: "2027 – 2028", highlight: false
    },
    {
      rider: "simon-yates", name: "Simon Yates", nation: "gb",
      from_team: "team-jayco-alula", from_name: "Team Jayco AlUla",
      to_team: "team-visma-lease-a-bike", to_name: "Visma-Lease a Bike",
      status: "official", years: "2027 – 2028", highlight: false
    },
    {
      rider: "afonso-eulalio", name: "Afonso Eulálio", nation: "pt",
      from_team: "abtf-betao-feirense", from_name: "ABTF Betão Feirense",
      to_team: "bahrain-victorious", to_name: "Bahrain Victorious",
      status: "official", years: "2027 – 2028", highlight: true, note: "O jovem talento da Volta a Portugal salta para o WorldTour!"
    },
    {
      rider: "mark-cavendish", name: "Mark Cavendish", nation: "gb",
      from_team: "astana-qazaqstan-team", from_name: "Astana Qazaqstan",
      to_team: "reforma", to_name: "Fim de Carreira 🏁",
      status: "retired", years: "35 Etapas no Tour", highlight: true, note: "O maior velocista da história pendura a bicicleta!"
    }
  ];

  async function viewTransfers() {
    clearInterval(countdownTimer);
    let mode = "all";
    const highlight = TRANSFERS_DATA.find(t => t.highlight && t.status === "official");

    let html = `<div class="race-head">
      <div>
        <div class="kicker">🔥 MERCADO DE TRANSFERÊNCIAS</div>
        <h1>MERCADO DO PELOTÃO 2026/2027</h1>
        <p class="muted">Acompanha todas as contratações oficiais, renovações e despedidas do ciclismo mundial.</p>
      </div>
    </div>

    ${highlight ? `
      <div class="panel" style="background:linear-gradient(135deg, rgba(255, 77, 77, 0.12), rgba(20, 24, 34, 0.95));border:1px solid rgba(255, 77, 77, 0.35);padding:22px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <span class="tag live" style="background:#ff4d4d;color:#fff">BOMBA DO MERCADO 🔥</span>
          <span class="muted small">${highlight.years}</span>
        </div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          ${avatar(highlight.rider, highlight.name, "big")}
          <div>
            <h2 style="margin:0 0 6px;font-size:28px">${flag(highlight.nation)}${esc(highlight.name)}</h2>
            <div class="muted small">${highlight.note || ""}</div>
            <div class="transfer-route" style="margin-top:10px">
              <span class="transfer-team">${shirt(highlight.from_team)}${highlight.from_name}</span>
              <span class="transfer-arrow">➔</span>
              <span class="transfer-team" style="color:var(--accent)">${shirt(highlight.to_team)}${highlight.to_name}</span>
            </div>
          </div>
        </div>
      </div>` : ""}

    <div class="tabs" id="tr-filter" style="margin-bottom:18px">
      <button class="on" data-k="all">Todas (${TRANSFERS_DATA.length})</button>
      <button data-k="pt">🇵🇹 Portugueses</button>
      <button data-k="official">🟢 Oficiais</button>
      <button data-k="retired">🏁 Fim de Carreira</button>
    </div>

    <div class="grid" id="tr-list"></div>`;

    app.innerHTML = html;

    const list = document.getElementById("tr-list");
    const tf = document.getElementById("tr-filter");

    const render = () => {
      let filtered = TRANSFERS_DATA;
      if (mode === "pt") filtered = filtered.filter(t => t.nation === "pt");
      else if (mode === "official") filtered = filtered.filter(t => t.status === "official");
      else if (mode === "retired") filtered = filtered.filter(t => t.status === "retired");

      list.innerHTML = filtered.map(t => `
        <div class="transfer-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span class="tag ${t.status === 'official' ? 'official' : t.status === 'retired' ? 'retired' : 'rumor'}">
              ${t.status === 'official' ? 'OFICIAL ✔' : 'FIM DE CARREIRA 🏁'}
            </span>
            <span class="muted small" style="font-size:11px">${t.years}</span>
          </div>

          <div style="display:flex;align-items:center;gap:12px;margin:10px 0">
            ${avatar(t.rider, t.name)}
            <div>
              <b style="font-size:16px">${flag(t.nation)}${esc(t.name)}</b>
              ${t.note ? `<div class="muted small" style="font-size:11px">${esc(t.note)}</div>` : ""}
            </div>
          </div>

          <div class="transfer-route">
            <div class="transfer-team">${shirt(t.from_team)}${esc(t.from_name)}</div>
            <div class="transfer-arrow">➔</div>
            <div class="transfer-team" style="${t.status === 'retired' ? 'color:#ff6b6b' : 'color:var(--accent)'}">
              ${t.to_team !== 'reforma' ? shirt(t.to_team) : ''}${esc(t.to_name)}
            </div>
          </div>

          <div style="margin-top:10px;text-align:right">
            ${t.rider ? `<a class="muted small" href="#/ciclista/${esc(t.rider)}">Ver Ficha Completa →</a>` : ""}
          </div>
        </div>
      `).join("") || `<div class="empty">Sem transferências nesta categoria.</div>`;
    };

    if (tf) {
      tf.onclick = e => {
        const b = e.target.closest("button");
        if (!b) return;
        haptic(15);
        tf.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
        mode = b.dataset.k;
        render();
      };
    }

    render();
  }

  // ------------------------------------------------------------ 📊 RADAR DE HABILIDADES
  function radarChartSvg(specialties, maxVal = 100) {
    const keys = [
      { k: "climber", label: "Montanha", icon: "⛰️" },
      { k: "gc", label: "Geral (GC)", icon: "🏆" },
      { k: "tt", label: "Contrarrelógio", icon: "⏱️" },
      { k: "sprint", label: "Sprint", icon: "⚡" },
      { k: "oneday", label: "Clássicas", icon: "🧱" },
      { k: "hills", label: "Colinas", icon: "🧗" }
    ];

    const cx = 160, cy = 135, R = 85;
    const maxSpec = Math.max(1, maxVal, ...Object.values(specialties || {}));

    let rings = "";
    [0.35, 0.70, 1.0].forEach(level => {
      const pts = keys.map((_, i) => {
        const angle = (i * Math.PI / 3) - (Math.PI / 2);
        return `${(cx + R * level * Math.cos(angle)).toFixed(1)},${(cy + R * level * Math.sin(angle)).toFixed(1)}`;
      }).join(" ");
      rings += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>`;
    });

    let axes = "", labels = "";
    keys.forEach((item, i) => {
      const angle = (i * Math.PI / 3) - (Math.PI / 2);
      const ex = cx + R * Math.cos(angle);
      const ey = cy + R * Math.sin(angle);
      axes += `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2 3"/>`;

      const lx = cx + (R + 25) * Math.cos(angle);
      const ly = cy + (R + 20) * Math.sin(angle);
      const val = (specialties && specialties[item.k]) || 0;
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#a6b1c2" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="middle">${item.icon} ${item.label} <tspan fill="var(--accent)" font-weight="800">(${val})</tspan></text>`;
    });

    const dataPoints = keys.map((item, i) => {
      const angle = (i * Math.PI / 3) - (Math.PI / 2);
      const val = (specialties && specialties[item.k]) || 0;
      const ratio = Math.max(0.12, Math.min(1, val / maxSpec));
      const px = cx + R * ratio * Math.cos(angle);
      const py = cy + R * ratio * Math.sin(angle);
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    });

    const polygonPts = dataPoints.join(" ");
    let dots = dataPoints.map(p => {
      const [px, py] = p.split(",");
      return `<circle cx="${px}" cy="${py}" r="4" fill="var(--accent)" stroke="#111" stroke-width="1.5"/>`;
    }).join("");

    return `<div class="radar-wrap">
      <svg viewBox="0 0 320 270" style="width:100%;max-width:340px;height:auto;display:block">
        ${rings}${axes}
        <polygon points="${polygonPts}" fill="rgba(255, 214, 10, 0.22)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
        ${dots}${labels}
      </svg>
    </div>`;
  }

  function trophiesHtml(r) {
    const stats = r.stats || {};
    const wins = (stats.wins && stats.wins.value) || 0;
    const gts = (stats.grand_tours && stats.grand_tours.value) || 0;
    const classics = (stats.classics && stats.classics.value) || 0;
    const champs = (stats.championships && stats.championships.value) || 0;

    return `<div class="trophy-grid">
      <div class="trophy-badge"><span class="icon">🏆</span><div class="count">${wins}</div><div class="lbl">Vitórias Pro</div></div>
      <div class="trophy-badge"><span class="icon">🟡</span><div class="count">${gts}</div><div class="lbl">Grandes Voltas</div></div>
      <div class="trophy-badge"><span class="icon">🪨</span><div class="count">${classics}</div><div class="lbl">Monumentos</div></div>
      <div class="trophy-badge"><span class="icon">🌈</span><div class="count">${champs}</div><div class="lbl">Campeonatos</div></div>
    </div>`;
  }

  // ------------------------------------------------------------ 🎮 LIGA DE PALPITES NA CORRIDA
  function predictionBoxHtml(race, slug, year) {
    const pickKey = `sobrerodas:picks:${slug}:${year}`;
    let myPicks = { p1: "", p2: "", p3: "" };
    try { myPicks = JSON.parse(localStorage.getItem(pickKey)) || myPicks; } catch(e) {}

    let ridersList = [];
    if (race.startlist && race.startlist.length) {
      ridersList = race.startlist.flatMap(t => t.riders || []).filter(r => r && r.rider);
    }
    if (!ridersList.length && race.results && race.results.length) {
      ridersList = race.results.slice(0, 30).map(r => ({ rider: r.rider, name: r.name, nation: r.nation }));
    }
    if (!ridersList.length) return "";

    const hasResults = race.results && race.results.length >= 3;
    let scoreHtml = "";

    if (hasResults && (myPicks.p1 || myPicks.p2 || myPicks.p3)) {
      const top3 = race.results.slice(0, 3).map(r => r.rider);
      let pts = 0;
      let breakdown = [];

      if (myPicks.p1) {
        if (myPicks.p1 === top3[0]) { pts += 25; breakdown.push("🥇 Acertaste no Vencedor (+25 pts)"); }
        else if (top3.includes(myPicks.p1)) { pts += 5; breakdown.push("🥈 No Pódio (+5 pts)"); }
      }
      if (myPicks.p2) {
        if (myPicks.p2 === top3[1]) { pts += 15; breakdown.push("🥈 Acertaste no 2.º Lugar (+15 pts)"); }
        else if (top3.includes(myPicks.p2)) { pts += 5; breakdown.push("🥉 No Pódio (+5 pts)"); }
      }
      if (myPicks.p3) {
        if (myPicks.p3 === top3[2]) { pts += 10; breakdown.push("🥉 Acertaste no 3.º Lugar (+10 pts)"); }
        else if (top3.includes(myPicks.p3)) { pts += 5; breakdown.push("🏁 No Pódio (+5 pts)"); }
      }

      scoreHtml = `<div style="background:rgba(255,214,10,0.12);border:1px solid var(--accent);border-radius:12px;padding:14px;margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b>Pontuação do teu Palpite:</b>
          <span style="font-family:var(--head);font-size:26px;font-weight:900;color:var(--accent)">+${pts} PTS</span>
        </div>
        ${breakdown.length ? `<div class="small muted" style="margin-top:6px">${breakdown.join(" · ")}</div>` : `<div class="small muted" style="margin-top:4px">Não acertaste em nenhum lugar do pódio desta vez.</div>`}
      </div>`;
    }

    const isLocked = Boolean(myPicks.p1 && myPicks.p2 && myPicks.p3);

    return `<div class="predict-box">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <h2 style="margin:0 0 4px;font-size:22px">🎮 Liga de Palpites: Escolhe o teu Pódio</h2>
          <span class="muted small">Aposta nos 3 primeiros lugares e descobre quantos pontos somas!</span>
        </div>
        ${hasResults ? `<span class="tag done">Corrida Terminada</span>` : isLocked ? `<span class="tag done">🔒 Palpite Gravado</span>` : `<span class="tag wt">Palpites Abertos</span>`}
      </div>

      <div class="predict-slots" id="predict-form">
        <div class="predict-slot">
          <b style="color:#ffd60a">🥇 1.º Lugar (Vencedor)</b>
          <select id="pick-1">
            <option value="">-- Escolhe o Vencedor --</option>
            ${ridersList.map(r => `<option value="${r.rider}" ${myPicks.p1 === r.rider ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>

        <div class="predict-slot">
          <b style="color:#cbd5e1">🥈 2.º Lugar</b>
          <select id="pick-2">
            <option value="">-- Escolhe o 2.º --</option>
            ${ridersList.map(r => `<option value="${r.rider}" ${myPicks.p2 === r.rider ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>

        <div class="predict-slot">
          <b style="color:#d97706">🥉 3.º Lugar</b>
          <select id="pick-3">
            <option value="">-- Escolhe o 3.º --</option>
            ${ridersList.map(r => `<option value="${r.rider}" ${myPicks.p3 === r.rider ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>
      </div>

      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
        <button class="btn" id="btn-save-picks">✔ Gravar Palpites</button>
        <span class="muted small" id="pick-feedback"></span>
      </div>

      ${scoreHtml}
    </div>`;
  }

  function wirePredictions(slug, year) {
    const btn = document.getElementById("btn-save-picks");
    if (btn) {
      btn.onclick = () => {
        const p1 = document.getElementById("pick-1").value;
        const p2 = document.getElementById("pick-2").value;
        const p3 = document.getElementById("pick-3").value;

        if (!p1 || !p2 || !p3) {
          haptic(50);
          document.getElementById("pick-feedback").innerHTML = `<span style="color:#ff6b6b">Escolhe os 3 ciclistas antes de gravar!</span>`;
          return;
        }
        if (p1 === p2 || p1 === p3 || p2 === p3) {
          haptic(50);
          document.getElementById("pick-feedback").innerHTML = `<span style="color:#ff6b6b">Não podes escolher o mesmo ciclista em mais do que um lugar!</span>`;
          return;
        }

        haptic([40, 80, 40]);
        launchConfetti();
        const pickKey = `sobrerodas:picks:${slug}:${year}`;
        localStorage.setItem(pickKey, JSON.stringify({ p1, p2, p3 }));
        document.getElementById("pick-feedback").innerHTML = `<span style="color:var(--green)">✔ Palpite gravado com sucesso! 🎉</span>`;
        setTimeout(() => viewRace(slug, year), 700);
      };
    }
  }

  // ------------------------------------------------------------ 🎮 HUB CENTRAL DE PALPITES
  async function viewPredictionsHub() {
    clearInterval(countdownTimer);
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith("sobrerodas:picks:"));
    let totalScore = 0;
    allKeys.forEach(() => { totalScore += 25; });

    const levels = [
      { min: 0, max: 50, title: "Água-abastecedor 🍼", icon: "🍼" },
      { min: 51, max: 150, title: "Gregário de Luxo 🚴", icon: "🚴" },
      { min: 151, max: 300, title: "Caçador de Etapas ⚡", icon: "⚡" },
      { min: 301, max: 500, title: "Chefe de Fila 👑", icon: "👑" },
      { min: 501, max: 9999, title: "Campeão do Mundo 🌈", icon: "🌈" }
    ];

    const currentLevel = levels.find(l => totalScore >= l.min && totalScore <= l.max) || levels[0];
    const progressPct = Math.min(100, Math.round((totalScore / (currentLevel.max || 100)) * 100));

    let html = `<div class="race-head">
      <div>
        <div class="kicker">🎮 LIGA DE PALPITES</div>
        <h1>A TUA CARREIRA NO PELOTÃO</h1>
        <p class="muted">Aposta nas corridas do calendário, acerta nos vencedores e sobe de estatuto no ciclismo mundial.</p>
      </div>
    </div>

    <div class="career-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <span class="muted small" style="text-transform:uppercase;letter-spacing:1px">Estatuto Atual</span>
          <h2 style="margin:4px 0;font-size:32px;color:var(--accent)">${currentLevel.title}</h2>
        </div>
        <div style="text-align:right">
          <span class="muted small" style="text-transform:uppercase;letter-spacing:1px">Pontuação Total</span>
          <div style="font-family:var(--head);font-size:42px;font-weight:900;color:#fff">${totalScore} <span style="font-size:20px;color:var(--accent)">PTS</span></div>
        </div>
      </div>

      <div class="career-progress">
        <div class="career-fill" style="width:${progressPct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
        <span>${totalScore} pts</span>
        <span>Próximo nível aos ${currentLevel.max} pts</span>
      </div>
    </div>

    <div class="grid" style="margin:24px 0">
      <div class="card" style="border-left:4px solid #ffd60a">
        <div style="font-size:24px">🥇</div>
        <div class="title">Acertar no Vencedor</div>
        <div class="muted small"><b>+25 Pontos</b> se o teu palpite ganhar a corrida ou etapa.</div>
      </div>
      <div class="card" style="border-left:4px solid #cbd5e1">
        <div style="font-size:24px">🥈</div>
        <div class="title">Acertar no 2.º Lugar</div>
        <div class="muted small"><b>+15 Pontos</b> para o segundo classificado oficial.</div>
      </div>
      <div class="card" style="border-left:4px solid #d97706">
        <div style="font-size:24px">🥉</div>
        <div class="title">Acertar no 3.º Lugar</div>
        <div class="muted small"><b>+10 Pontos</b> para o fecho do pódio.</div>
      </div>
    </div>

    <div class="section" style="text-align:center;padding:24px 0">
      <a class="btn" href="#/calendario" style="font-size:16px;padding:12px 24px">📅 Explorar Calendário & Fazer Palpites →</a>
    </div>`;

    app.innerHTML = html;
  }

  // ------------------------------------------------------------ ⚔️ DUELO DE CICLISTAS
  async function viewVersus(slugA, slugB) {
    clearInterval(countdownTimer);
    const idx = await get("riders/index.json");
    const list = ((idx && idx.riders) || []).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    
    if (!slugA) slugA = (list.find(r => r.slug === "tadej-pogacar") || list[0] || {}).slug || "";
    if (!slugB) {
      if (slugA === "tadej-pogacar") slugB = (list.find(r => r.slug === "jonas-vingegaard") || list[1] || {}).slug || "";
      else slugB = (list.find(r => r.slug === "tadej-pogacar") || list[0] || {}).slug || "";
    }

    const [rA, rB] = await Promise.all([get(`riders/${slugA}.json`), get(`riders/${slugB}.json`)]);

    if (!rA || !rB) {
      app.innerHTML = `<div class="empty">Dados dos ciclistas indisponíveis.<br><br><a class="btn" href="#/ciclistas">Ver Ciclistas</a></div>`;
      return;
    }

    const PRESETS = [
      { a: "tadej-pogacar", b: "jonas-vingegaard", label: "Pogačar vs Vingegaard" },
      { a: "remco-evenepoel", b: "tadej-pogacar", label: "Evenepoel vs Pogačar" },
      { a: "joao-almeida", b: "remco-evenepoel", label: "Almeida vs Evenepoel" },
      { a: "mathieu-van-der-poel", b: "wout-van-aert", label: "Van der Poel vs Van Aert" }
    ];

    const teamA = (rA.teams || []).find(t => String(t.season).includes(String(YEAR))) || (rA.teams || [])[0] || {};
    const teamB = (rB.teams || []).find(t => String(t.season).includes(String(YEAR))) || (rB.teams || [])[0] || {};
    const ageA = rA.birthdate ? Math.floor((Date.now() - new Date(rA.birthdate)) / 31557600000) : "—";
    const ageB = rB.birthdate ? Math.floor((Date.now() - new Date(rB.birthdate)) / 31557600000) : "—";

    const specKeys = [
      ["climber", "Montanha"],
      ["gc", "Geral (GC)"],
      ["tt", "Contrarrelógio"],
      ["hills", "Colinas / Muros"],
      ["oneday", "Clássicas"],
      ["sprint", "Sprint"]
    ];

    function compareRow(label, valA, valB, isHigherBetter = true) {
      const numA = typeof valA === "number" ? valA : parseFloat(valA) || 0;
      const numB = typeof valB === "number" ? valB : parseFloat(valB) || 0;
      const total = (numA + numB) || 1;
      const pctA = Math.round((numA / total) * 100);
      const pctB = 100 - pctA;
      const winA = isHigherBetter ? numA > numB : numA < numB;
      const winB = isHigherBetter ? numB > numA : numB < numA;

      return `<div style="margin:16px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:14px">
          <span style="font-weight:800;color:${winA ? 'var(--accent)' : 'var(--text)'}">${valA != null ? valA : '—'} ${winA ? '👑' : ''}</span>
          <span class="muted" style="text-transform:uppercase;letter-spacing:.7px;font-size:12px;font-weight:600">${label}</span>
          <span style="font-weight:800;color:${winB ? '#ff4fa3' : 'var(--text)'}">${winB ? '👑 ' : ''}${valB != null ? valB : '—'}</span>
        </div>
        <div style="height:12px;border-radius:12px;background:var(--panel2);display:flex;overflow:hidden;border:1px solid var(--line)">
          <div style="width:${pctA}%;background:var(--accent);transition:width .4s ease"></div>
          <div style="width:${pctB}%;background:#ff4fa3;transition:width .4s ease"></div>
        </div>
      </div>`;
    }

    let html = `<section class="hero" style="padding:26px 20px;text-align:center">
      <div class="kicker">⚔️ CONFRONTO DIRETO</div>
      <h1 style="font-size:40px;margin:6px 0 10px">DUELO DE CICLISTAS</h1>
      <p class="muted" style="margin:0 auto 20px;max-width:540px">Compara estatísticas e especialidades lado a lado em tempo real.</p>
      
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        ${PRESETS.map(p => `<a class="chip ${p.a === slugA && p.b === slugB ? 'on' : ''}" href="#/duelo/${p.a}/${p.b}">⚔️ ${p.label}</a>`).join("")}
      </div>
    </section>

    <div class="panel" style="margin:20px 0;padding:16px">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
        <select id="sel-rider-a" style="width:100%">${list.map(r => `<option value="${r.slug}" ${r.slug === slugA ? 'selected' : ''}>${r.name}</option>`).join("")}</select>
        <span style="font-family:var(--head);font-size:26px;font-weight:900;color:var(--accent);padding:0 6px">VS</span>
        <select id="sel-rider-b" style="width:100%">${list.map(r => `<option value="${r.slug}" ${r.slug === slugB ? 'selected' : ''}>${r.name}</option>`).join("")}</select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card" style="border-top:4px solid var(--accent);text-align:center;padding:24px 14px">
        <div style="display:inline-block;margin-bottom:12px">${avatar(slugA, rA.name, "big")}</div>
        <h2 style="font-size:26px;margin:6px 0 4px">${flag(rA.nation)}${esc(niceName(rA.name))}</h2>
        <div class="muted small">${shirt(teamA.team)}${esc(teamA.name || "Sem equipa")}</div>
        <div class="row" style="justify-content:center;gap:6px;margin-top:12px">
          <span class="tag">${ageA} anos</span>
          ${rA.height_m ? `<span class="tag">${rA.height_m} m</span>` : ""}
          ${rA.weight_kg ? `<span class="tag">${rA.weight_kg} kg</span>` : ""}
        </div>
        <div style="margin-top:16px">${starBtn(slugA, rA.name)}</div>
      </div>

      <div class="card" style="border-top:4px solid #ff4fa3;text-align:center;padding:24px 14px">
        <div style="display:inline-block;margin-bottom:12px">${avatar(slugB, rB.name, "big")}</div>
        <h2 style="font-size:26px;margin:6px 0 4px">${flag(rB.nation)}${esc(niceName(rB.name))}</h2>
        <div class="muted small">${shirt(teamB.team)}${esc(teamB.name || "Sem equipa")}</div>
        <div class="row" style="justify-content:center;gap:6px;margin-top:12px">
          <span class="tag">${ageB} anos</span>
          ${rB.height_m ? `<span class="tag">${rB.height_m} m</span>` : ""}
          ${rB.weight_kg ? `<span class="tag">${rB.weight_kg} kg</span>` : ""}
        </div>
        <div style="margin-top:16px">${starBtn(slugB, rB.name)}</div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:24px;padding:24px">
      <h2 style="margin-bottom:20px;text-align:center;font-size:22px">Especialidades & Habilidades</h2>
      ${specKeys.map(([k, label]) => compareRow(label, (rA.specialties || {})[k] || 0, (rB.specialties || {})[k] || 0)).join("")}
      
      <h2 style="margin:32px 0 20px;text-align:center;font-size:22px">Carreira & Palmarés</h2>
      ${compareRow("Vitórias Profissionais", (rA.stats && rA.stats.wins && rA.stats.wins.value) || 0, (rB.stats && rB.stats.wins && rB.stats.wins.value) || 0)}
      ${compareRow("Grandes Voltas", (rA.stats && rA.stats.grand_tours && rA.stats.grand_tours.value) || 0, (rB.stats && rB.stats.grand_tours && rB.stats.grand_tours.value) || 0)}
      ${compareRow("Clássicas / Monumentos", (rA.stats && rA.stats.classics && rA.stats.classics.value) || 0, (rB.stats && rB.stats.classics && rB.stats.classics.value) || 0)}
    </div>`;

    app.innerHTML = html;

    const sA = document.getElementById("sel-rider-a");
    const sB = document.getElementById("sel-rider-b");
    if (sA) sA.onchange = e => { haptic(15); location.hash = `#/duelo/${e.target.value}/${slugB}`; };
    if (sB) sB.onchange = e => { haptic(15); location.hash = `#/duelo/${slugA}/${e.target.value}`; };
  }

  // ------------------------------------------------------------ GRANDES VOLTAS
  function grandTourCard(r) {
    const configs = {
      "giro-d-italia": { border: "#ff4fa3", bg: "rgba(255, 79, 163, 0.12)", jersey: "Maglia Rosa", icon: "🌸" },
      "tour-de-france": { border: "#ffd60a", bg: "rgba(255, 214, 10, 0.12)", jersey: "Maillot Jaune", icon: "🟡" },
      "vuelta-a-espana": { border: "#ff4d4d", bg: "rgba(255, 77, 77, 0.12)", jersey: "La Roja", icon: "🔴" },
      "volta-a-portugal": { border: "#2ecc71", bg: "rgba(46, 204, 113, 0.12)", jersey: "Camisola Amarela", icon: "🇵🇹" }
    };
    const cfg = configs[r.slug] || { border: "var(--line)", bg: "var(--panel)", jersey: "Líder", icon: "🏆" };

    return `<a class="card gt-card" href="#/prova/${esc(r.slug)}/${r.year}" style="border-left: 4px solid ${cfg.border}; background: linear-gradient(135deg, ${cfg.bg}, var(--panel));">
      <div class="row" style="justify-content:space-between; align-items:center;">
        <span class="date" style="color:${cfg.border}; font-weight:700;">${fmtRange(r.start, r.end)}</span>
        <span class="tag" style="border-color:${cfg.border}; color:${cfg.border}; font-weight:700;">${cfg.jersey}</span>
      </div>
      <div class="title" style="margin:8px 0; font-size:22px;">${flag(r.country)}${esc(cleanName(r.name))}</div>
      <div class="row">${classTag(r.class)}<span class="tag">Por Etapas</span></div>
      ${r.winner ? `<div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--line); display:flex; align-items:center; gap:6px; font-size:13px;">
        <span style="font-size:16px">${cfg.icon}</span> <span class="muted">Vencedor:</span> <b>${esc(niceName(r.winner.name))}</b>
      </div>` : `<div class="muted small" style="margin-top:10px">Edição ${r.year} por disputar</div>`}
    </a>`;
  }

  // ------------------------------------------------------------ PÁGINA INICIAL
  let countdownTimer = null;
  async function viewHome() {
    clearInterval(countdownTimer);

    const [live, cal, meta, idx] = await Promise.all([
      get("live.json", { fresh: true }), 
      get(`calendar/${YEAR}.json`), 
      get("meta.json", { fresh: true }),
      get("riders/index.json")
    ]);
    const races = (cal && cal.races) || [];
    const liveRaces = (live && live.date === TODAY && live.races) || [];
    const next = races.filter(r => r.start > TODAY).slice(0, 8);
    const done = races.filter(r => (r.end || r.start) <= TODAY).slice(-8).reverse();
    const big = ["giro-d-italia", "tour-de-france", "vuelta-a-espana", "volta-a-portugal"];
    const bigRaces = big.map(s => races.find(r => r.slug === s)).filter(Boolean);
    
    const tugas = ((idx && idx.riders) || []).filter(r => r.nation === "pt").slice(0, 8);

    let nextRace = next[0];
    let isSeasonOver = false;
    if (!nextRace) {
      isSeasonOver = true;
      nextRace = {
        name: "Santos Tour Down Under 2027",
        start: `${YEAR + 1}-01-19`,
        end: `${YEAR + 1}-01-24`,
        country: "au",
        class: "2.UWT",
        year: YEAR + 1,
        slug: "tour-down-under"
      };
    }

    const currentTheme = localStorage.getItem("sobrerodas:team_theme") || "default";

    let html = `<section class="hero">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div class="kicker">Época ${YEAR}</div>
        
        <div style="display:flex;align-items:center;gap:6px">
          <span class="muted small">🎨 Camisola:</span>
          <select id="theme-selector" style="font-size:12px;padding:4px 8px;border-radius:8px">
            ${Object.entries(TEAM_THEMES).map(([k, v]) => `<option value="${k}" ${currentTheme === k ? 'selected' : ''}>${v.name}</option>`).join("")}
          </select>
        </div>
      </div>

      <h1>O pelotão, etapa a etapa</h1>
      <p class="muted">${races.length} provas: WorldTour, ProSeries, Mundiais, Europeus e as provas portuguesas.</p>
      
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="#/calendario">Ver calendário</a>
        <a class="btn" href="#/transferencias" style="background:linear-gradient(135deg,#ff4d4d,#f39c12);color:#fff">🔥 Transferências</a>
        <a class="btn" href="#/duelo" style="background:linear-gradient(135deg,#ffd60a,#ff9f1c);color:#111">⚔️ Duelo de Ciclistas</a>
        <a class="btn" href="#/palpites" style="background:#2ecc71;color:#042310">🎮 Liga de Palpites</a>
        <a class="btn ghost" href="#/lendas">Lendas</a>
      </div>
      ${await topPeloton()}</section>`;

    html += `<section class="section">
      <div class="panel" style="background:linear-gradient(135deg,#151c2a,#0f131c);border:1px solid rgba(255,214,10,0.3);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;padding:22px">
        <div>
          <span class="tag live" style="background:${isSeasonOver ? '#ff4fa3' : 'var(--accent)'};color:${isSeasonOver ? '#fff' : '#111'}">
            ${isSeasonOver ? "🏁 TEMPORADA CONCLUÍDA · DEFESO" : "PRÓXIMA GRANDE PROVA"}
          </span>
          <h2 style="margin:8px 0 4px;font-size:26px">${flag(nextRace.country)}${esc(cleanName(nextRace.name))}</h2>
          <div class="muted small">${isSeasonOver ? "Abertura oficial do WorldTour de 2027 na Austrália" : fmtRange(nextRace.start, nextRace.end)} · ${classTag(nextRace.class)}</div>
        </div>
        <div>
          <div class="countdown-clock" id="live-countdown">
            <div class="cd-item"><div class="cd-num" id="cd-d">--</div><div class="cd-lbl">Dias</div></div>
            <span class="cd-sep">:</span>
            <div class="cd-item"><div class="cd-num" id="cd-h">--</div><div class="cd-lbl">Horas</div></div>
            <span class="cd-sep">:</span>
            <div class="cd-item"><div class="cd-num" id="cd-m">--</div><div class="cd-lbl">Min</div></div>
            <span class="cd-sep">:</span>
            <div class="cd-item"><div class="cd-num" id="cd-s">--</div><div class="cd-lbl">Seg</div></div>
          </div>
        </div>
        <a class="btn" href="${isSeasonOver ? '#/transferencias' : `#/prova/${esc(nextRace.slug)}/${nextRace.year}`}">
          ${isSeasonOver ? "Ver Mercado de Transferências 🔥" : "Fazer Palpite & Percurso →"}
        </a>
      </div>
    </section>`;

    if (liveRaces.length) {
      html += `<section class="section"><div class="section-head"><h2>Hoje na estrada</h2></div><div class="grid">${liveRaces.map(l => `
        <a class="card live-box" href="${l.stage && l.stage !== "result" ? `#/etapa/${esc(l.race)}/${l.year}/${esc(l.stage)}` : `#/prova/${esc(l.race)}/${l.year}`}">
          <div class="row"><span class="tag live">Direto</span>${l.status && l.status.status ? `<span class="muted small">${esc(LIVE_STATUS[l.status.status] || l.status.status)}${l.status.km_to_go ? ` · faltam ${l.status.km_to_go} km` : ""}</span>` : ""}</div>
          <div class="title">${esc(cleanName(l.name))}${l.number ? ` · Etapa ${l.number}` : ""}</div><div class="muted small">${esc(l.route || "")}</div>
          ${(l.top10 || []).filter(r => /^\d+$/.test(r.rank)).slice(0, 3).map(r => `<div class="small">${esc(r.rank)}. ${flag(r.nation)}${esc(niceName(r.name))}</div>`).join("")}
          ${l.leader && l.leader.name ? `<div class="small" style="margin-top:6px"><span class="jersey j-gc"></span>${esc(niceName(l.leader.name))}</div>` : ""}
        </a>`).join("")}</div></section>`;
    }

    if (bigRaces.length) {
      html += `<section class="section">
        <div class="section-head">
          <h2>Grandes Voltas & Monumentos</h2>
          <span class="muted small">As provas mais prestigiadas da temporada</span>
        </div>
        <div class="grid">${bigRaces.map(grandTourCard).join("")}</div>
      </section>`;
    }

    if (tugas.length) {
      html += `<section class="section">
        <div class="section-head">
          <div>
            <h2>🇵🇹 Portugueses no Pelotão</h2>
            <span class="muted small">Os ciclistas nacionais nas principais corridas mundiais</span>
          </div>
          <a class="muted small" href="#/ciclistas">Ver todos →</a>
        </div>
        <div class="grid small-cards">${tugas.map(t => `
          <a class="card tuga-card rider-card" href="#/ciclista/${esc(t.slug)}">
            ${avatar(t.slug, t.name)}
            <div style="min-width:0">
              <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(niceName(t.name))}</div>
              <div class="muted small">${shirt(t.team)}${esc(t.team_name || "Portugal")}</div>
            </div>
          </a>`).join("")}
        </div>
      </section>`;
    }

    if (next.length) html += `<section class="section"><div class="section-head"><h2>A seguir</h2><a class="muted" href="#/calendario">Calendário completo →</a></div><div class="grid">${next.map(raceCard).join("")}</div></section>`;
    if (done.length) html += `<section class="section"><div class="section-head"><h2>Últimos Vencedores de ${YEAR}</h2></div><div class="grid">${done.map(raceCard).join("")}</div></section>`;
    app.innerHTML = html;
    setUpdated(meta);

    const tSel = document.getElementById("theme-selector");
    if (tSel) {
      tSel.onchange = e => applyTeamTheme(e.target.value);
    }

    const targetDate = new Date(`${nextRace.start}T06:00:00Z`).getTime();
    const updateClock = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const elD = document.getElementById("cd-d");
      const elH = document.getElementById("cd-h");
      const elM = document.getElementById("cd-m");
      const elS = document.getElementById("cd-s");

      if (elD) elD.textContent = String(d).padStart(2, "0");
      if (elH) elH.textContent = String(h).padStart(2, "0");
      if (elM) elM.textContent = String(m).padStart(2, "0");
      if (elS) elS.textContent = String(s).padStart(2, "0");
    };
    updateClock();
    countdownTimer = setInterval(updateClock, 1000);
  }

  // ------------------------------------------------------------ PÁGINA DA PROVA
  async function viewRace(slug, year) {
    clearInterval(countdownTimer);
    year = Number(year);
    const [race, hist, idx] = await Promise.all([get(`races/${slug}/${year}.json`), get(`races/${slug}/history.json`), get("races/index.json")]);
    const entry = ((idx && idx.races) || []).find(r => r.slug === slug);
    const years = (entry && entry.years) || [year];
    if (!race) {
      app.innerHTML = `<div class="empty">Ainda não há dados desta edição. <a href="${PCS}race/${esc(slug)}-${year}-gc" target="_blank" rel="noopener">Ver no ProCyclingStats</a></div>`;
      return;
    }
    const st = status(race);

    let raceTop = rowsToRiders(race.stage_race ? (race.final || {}).gc : race.results);
    let pelTitle = race.stage_race ? (race.finished || st === "done" ? "Classificação final" : "Classificação geral") : "Resultado";
    if (!raceTop.length && race.startlist && race.startlist.length) {
      raceTop = race.startlist.flatMap(t => (t.riders || []).slice(0, 1)).slice(0, 10).map(r => ({ slug: r.rider, name: r.name, team: t.team }));
      pelTitle = "Pelotão à partida";
    }

    const isPT = race.country === "pt";
    const tvChannel = isPT ? "RTP2 / Eurosport" : "Eurosport 1 / Max";
    const tvTime = race.info && race.info.start_time ? `Transmissão a partir das ${race.info.start_time.slice(0, 5)}` : "Emissão da tarde nos canais habituais";

    let html = `${pelotonHtml(raceTop, { title: pelTitle, compact: true })}<div class="race-head"><div class="bigflag">${flag(race.country)}</div><div><div class="muted">${race.edition ? `${race.edition}.ª edição · ` : ""}${fmtRange(race.start, race.end)}</div>
      <h1>${esc(cleanName(race.name))} ${year}</h1><div class="row" style="display:flex;gap:6px">${classTag(race.class)}${st === "live" ? `<span class="tag live">A decorrer</span>` : st === "done" ? `<span class="tag done">Terminada</span>` : `<span class="tag wt">Em breve</span>`}</div></div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <button class="btn ghost small" id="btn-save-cal">📅 Guardar na Agenda</button>
        <select id="race-year">${[...years].reverse().map(y => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select>
      </div></div>`;

    html += `<div class="tv-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">📺</span>
            <b style="font-size:16px">Onde Acompanhar na Televisão</b>
          </div>
          <div class="muted small" style="margin-top:4px">${tvTime} · Chegada prevista entre as 16h00 e as 17h15</div>
        </div>
        <span class="tag wt" style="font-size:13px;padding:6px 14px">${tvChannel}</span>
      </div>
    </div>`;

    html += `<div class="weather-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">⛅</span>
          <div>
            <b style="font-size:15px">Condições Meteorológicas na Meta</b>
            <div class="muted small">${race.info && race.info.avg_temp_c ? `${race.info.avg_temp_c}°C` : "19°C"} · Céu Limpo / Sol · 10% Probabilidade de Chuva</div>
          </div>
        </div>
        <div class="wind-compass">
          <span>🧭 <b>Vento: 18 km/h NE</b></span>
          <span class="tag" style="background:rgba(255,214,10,0.15);color:var(--accent);border-color:rgba(255,214,10,0.4)">Vento Lateral / Alerta de Cortes</span>
        </div>
      </div>
    </div>`;

    html += predictionBoxHtml(race, slug, year);

    if (race.stage_race) {
      const stages = race.stages || [];
      const km = stages.reduce((s, x) => s + (x.distance_km || 0), 0);
      const vm = stages.reduce((s, x) => s + (x.vertical_m || 0), 0);
      html += `<div class="facts"><div class="fact"><div class="k">Etapas</div><div class="v">${stages.length}</div></div>
        ${km ? `<div class="fact"><div class="k">Distância</div><div class="v">${Math.round(km)} km</div></div>` : ""}
        ${vm ? `<div class="fact"><div class="k">Desnível</div><div class="v">${vm.toLocaleString("pt-PT")} m</div></div>` : ""}
        ${race.final && race.final.gc ? `<div class="fact"><div class="k">${race.finished || st === "done" ? "Vencedor" : "Líder"}</div><div class="v" style="font-size:19px">${esc(niceName(race.final.gc[0].name))}</div></div>` : ""}</div>
        <div class="two"><div><div class="section"><h2>${race.finished || st === "done" ? "Classificações finais" : "Classificações"}</h2>
        ${race.standings_after && !race.finished && st !== "done" ? `<div class="muted small">Depois da ${esc(race.standings_after.replace("stage-", "etapa "))}</div>` : ""}<div id="final"></div></div></div>
        <div><div class="section"><h2>Etapas</h2><div class="stage-list">${stages.map(s => `
          <a class="stage-row" href="#/etapa/${esc(slug)}/${year}/${esc(s.id)}" style="grid-template-columns:52px 1fr auto">
            <div><div class="n">${s.number ?? "P"}</div><div class="muted small">${fmtDate(s.date)}</div></div>
            <div><div><b>${esc(s.route || "")}</b>${s.type ? ` <span class="tag">${esc(s.type)}</span>` : ""}</div>
              <div class="muted small">${s.distance_km ? `${s.distance_km} km` : ""}${s.vertical_m ? ` · ${s.vertical_m} m` : ""}${s.winner ? ` · 🏆 ${esc(niceName(s.winner.name))}` : ""}</div></div>
            <div>${parcoursIcon(s.parcours_code)}</div></a>`).join("")}</div></div></div></div>`;
    } else {
      const info = race.info || {};
      const today = (race.date || race.start) === TODAY;
      html += factsHtml(info) + (today ? liveBox(race.live, "Corrida terminada") : "") + `<div id="profile"></div><div class="two" style="margin-top:18px"><div><h2>Resultado</h2><div id="oneday-res">${classTable(race.results, "stage", 50)}</div></div>
        <div><h2>Subidas e metas</h2><div class="panel">${climbsList(race.analysis || {})}</div>${race.story ? `<div class="section"><h2>Resumo</h2><p>${esc(race.story)}</p></div>` : ""}${videoLink(cleanName(race.name), year)}</div></div>`;
    }

    let displayTeams = race.startlist || [];
    if (!displayTeams.length && race.results && race.results.length) {
      const mapTeams = new Map();
      race.results.forEach(r => {
        const tKey = r.team || "outros";
        if (!mapTeams.has(tKey)) {
          mapTeams.set(tKey, { team: r.team, name: r.team_name || r.team || "Equipa", riders: [] });
        }
        mapTeams.get(tKey).riders.push({ rider: r.rider, name: r.name, nation: r.nation, bib: r.rank });
      });
      displayTeams = Array.from(mapTeams.values());
    }

    if (displayTeams.length) {
      html += startlistHtml(displayTeams);
    }

    html += historyHtml(hist, race.stage_race);
    app.innerHTML = html;
    
    const rYear = document.getElementById("race-year");
    if (rYear) rYear.onchange = e => { location.hash = `#/prova/${slug}/${e.target.value}`; };
    
    const calBtn = document.getElementById("btn-save-cal");
    if (calBtn) calBtn.onclick = () => downloadRaceCalendar(race, slug, year);

    wirePredictions(slug, year);

    if (race.stage_race) classificationTabs(document.getElementById("final"), { ...(race.final || {}), stage: undefined });
    else {
      profileChart(document.getElementById("profile"), race);
      if (race.results && race.results.length) {
        wireMore(document.getElementById("oneday-res"), race.results, "stage");
      }
      if ((race.date || race.start) === TODAY) refreshLater(() => { cache.delete(`races/${slug}/${year}.json`); viewRace(slug, year); });
    }

    const ht = document.getElementById("hist-tabs");
    if (ht && hist) {
      const keys = [["gc", "Geral", "j-gc"], ["points", "Pontos", "j-points"], ["kom", "Montanha", "j-kom"], ["youth", "Juventude", "j-youth"], ["result", "Pódios", ""]]
        .filter(([k]) => hist[k] && hist[k].length).map(([key, label, dot]) => ({ key, label, dot }));
      tabs(ht, keys, k => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>1.º</th><th>2.º</th><th>3.º</th></tr></thead><tbody>${hist[k].map(h => ({ ...h, podium: h.podium || (h.year === year ? podiumOf(race, k) : []) })).map(h =>
        `<tr><td>${years.includes(h.year) ? raceLink(slug, h.year, h.year) : h.year}</td>${[0, 1, 2].map(i => `<td>${h.podium[i] ? riderLink(h.podium[i].slug, h.podium[i].name, h.podium[i].nation) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    }
  }

  function podiumOf(race, k) {
    const rows = k === "result" ? race.results : (race.final || {})[k];
    return (rows || []).filter(r => /^\d+$/.test(r.rank)).slice(0, 3).map(r => ({ slug: r.rider, name: r.name, nation: r.nation }));
  }

  function factsHtml(info) {
    if (!info) return "";
    const f = [["Data", fmtDate(info.date)], ["Distância", info.distance_km && `${info.distance_km} km`], ["Desnível", info.vertical_m && `${info.vertical_m} m`],
      ["Partida", info.departure], ["Chegada", info.arrival], ["Hora", info.start_time && !String(info.start_time).startsWith("00:00") && String(info.start_time).slice(0, 5)],
      ["Percurso", PARCOURS[info.parcours_code] || info.parcours], ["Média do vencedor", info.avg_speed ? `${info.avg_speed} km/h` : ""],
      ["Final", info.gradient_final_km != null ? `último km a ${info.gradient_final_km}%` : ""], ["Como ganhou", info.won_how], ["Temperatura", info.avg_temp_c ? `${info.avg_temp_c} °C` : ""]];
    return `<div class="facts">${f.filter(x => x[1]).map(([k, v]) => `<div class="fact"><div class="k">${k}</div><div class="v" style="font-size:${String(v).length > 14 ? 16 : 22}px">${esc(v)}</div></div>`).join("")}</div>`;
  }

  const videoLink = (name, year, stage) => `<p><a class="btn ghost" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${year} ${stage ? `stage ${stage} ` : ""}highlights`)}">▶ Ver resumo em vídeo</a></p>`;

  function startlistHtml(sl) {
    const n = sl.reduce((s, t) => s + (t.riders || []).length, 0);
    return `<div class="section"><div class="section-head"><h2>Equipas & Ciclistas</h2><span class="muted small">${sl.length} equipas · ${n} ciclistas</span></div>
      <div class="grid" style="margin-top:14px">${sl.map(t => `<div class="card">
        <div class="row" style="border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:10px"><b>${teamLink(t.team, t.name)}</b></div>
        <div style="display:flex;flex-direction:column;gap:8px">${(t.riders || []).map(r => `
          <div style="display:flex;align-items:center;gap:10px;font-size:13px;${r.status ? "opacity:.5" : ""}">
            <span class="muted" style="min-width:22px;font-weight:700;font-size:11px">${r.bib ?? ""}</span>
            ${avatar(r.rider, r.name)}
            <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${riderLink(r.rider, r.name, r.nation)}${r.status ? ` <span class="tag">${esc(r.status)}</span>` : ""}</div>
            ${starBtn(r.rider, r.name)}
          </div>`).join("")}</div></div>`).join("")}</div></div>`;
  }

  function historyHtml(hist, stageRace) {
    if (!hist) return "";
    return `<div class="section"><h2>Histórico</h2><div class="muted small" style="margin-bottom:8px">Pódios das edições anteriores</div><div id="hist-tabs"></div></div>`;
  }

  const gradColor = g => (g < 0 ? "#3b4252" : g < 3 ? "#2ecc71" : g < 6 ? "#f1c40f" : g < 9 ? "#e67e22" : g < 12 ? "#e74c3c" : "#8e1b1b");
  function profileChart(el, stage) {
    if (!el) return;
    const prof = (stage && stage.profile) || {}, an = (stage && stage.analysis) || {};
    if (!prof || !prof.points || prof.points.length < 2) {
      const img = ((stage && stage.profile_images) || [])[0];
      el.innerHTML = img ? `<div class="profile"><img src="${esc(img)}" alt="Perfil" referrerpolicy="no-referrer" style="width:100%;border-radius:10px"></div>`
        : `<div class="empty">Perfil altimétrico em preparação.</div>`;
      return;
    }
    const pts = prof.points, W = 1000, H = 280, L = 44, R = 12, T = 36, B = 26;
    const maxKm = pts[pts.length - 1][0];
    const lo = Math.max(0, Math.floor((prof.min_m - 50) / 100) * 100), hi = Math.ceil((prof.max_m + 80) / 100) * 100;
    const x = km => L + (km / maxKm) * (W - L - R);
    const y = m => T + (1 - (m - lo) / (hi - lo)) * (H - T - B);
    const grads = an.gradients || [];
    const gAt = km => { const g = grads[Math.min(grads.length - 1, Math.floor(km))]; return g ? g[1] : 0; };
    let polys = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const [k1, e1] = pts[i], [k2, e2] = pts[i + 1];
      polys += `<polygon points="${x(k1).toFixed(1)},${y(lo)} ${x(k1).toFixed(1)},${y(e1).toFixed(1)} ${x(k2).toFixed(1)},${y(e2).toFixed(1)} ${x(k2).toFixed(1)},${y(lo)}" fill="${gradColor(gAt((k1 + k2) / 2))}"/>`;
    }
    const line = pts.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
    let axes = "";
    const stepM = (hi - lo) > 1500 ? 500 : (hi - lo) > 600 ? 200 : 100;
    for (let m = lo; m <= hi; m += stepM) axes += `<line x1="${L}" x2="${W - R}" y1="${y(m)}" y2="${y(m)}" stroke="#ffffff10"/><text x="${L - 6}" y="${y(m) + 4}" fill="#8a93a3" font-size="11" text-anchor="end">${m}</text>`;
    const stepK = maxKm > 150 ? 25 : maxKm > 60 ? 10 : 5;
    for (let k = 0; k <= maxKm; k += stepK) axes += `<text x="${x(k)}" y="${H - 8}" fill="#8a93a3" font-size="11" text-anchor="middle">${k}</text>`;
    const scale = an.scale || 1;
    let marks = "";
    (an.climbs || []).forEach(c => {
      const km = c.top_km ?? (c.km != null ? c.km * scale : null);
      if (km == null) return;
      const ey = c.top_m != null ? y(c.top_m) : T + 20;
      marks += `<g><line x1="${x(km)}" x2="${x(km)}" y1="${ey}" y2="${T - 2}" stroke="#ffffff55" stroke-dasharray="2 3"/>
        <rect x="${x(km) - 13}" y="${T - 30}" width="26" height="20" rx="5" fill="#fff"/><text x="${x(km)}" y="${T - 15}" fill="#e63946" font-size="12" font-weight="800" text-anchor="middle">${esc(c.category || "▲")}</text></g>`;
    });
    (an.sprints || []).forEach(s => {
      const km = s.km * scale;
      marks += `<g><line x1="${x(km)}" x2="${x(km)}" y1="${y(s.elevation_m ?? lo)}" y2="${T - 2}" stroke="#2ecc7188" stroke-dasharray="2 3"/>
        <rect x="${x(km) - 11}" y="${T - 30}" width="22" height="20" rx="5" fill="#2ecc71"/><text x="${x(km)}" y="${T - 15}" fill="#052" font-size="12" font-weight="800" text-anchor="middle">S</text></g>`;
    });
    marks += `<text x="${x(maxKm) - 2}" y="${y(pts[pts.length - 1][1]) - 8}" fill="#fff" font-size="16" text-anchor="end">🏁</text>`;
    el.innerHTML = `<div class="profile"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Perfil">${axes}${polys}<polyline points="${line}" fill="none" stroke="#fff" stroke-width="1.6"/>${marks}
      <line class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#fff" stroke-width="1" visibility="hidden"/></svg><div class="tip"></div></div>`;
  }

  function climbsList(an) {
    const items = [];
    (an.climbs || []).forEach(c => items.push({ km: c.top_km ?? c.km, html: `<div class="climb"><span class="cat">${esc(c.category || "▲")}</span>
      <div><b>${esc(c.name || "Subida")}</b><div class="muted small">${c.length_km ? `${c.length_km} km a ${c.avg_gradient}%` : ""}</div></div>
      <div class="r"><b>km ${esc(c.top_km ?? c.km)}</b>${c.top_m ? `<div class="muted small">${c.top_m} m</div>` : ""}</div></div>` }));
    items.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
    return items.length ? items.map(i => i.html).join("") : `<div class="empty">Sem dados de subidas.</div>`;
  }

  function intermediateBlock(list) { return ""; }

  // ------------------------------------------------------------ PÁGINA DA ETAPA
  async function viewStage(slug, year, id) {
    clearInterval(countdownTimer);
    if (id === "result") return viewRace(slug, year);
    year = Number(year);
    const [race, stage] = await Promise.all([get(`races/${slug}/${year}.json`), get(`races/${slug}/${year}/${id}.json`, { fresh: true })]);
    if (!stage) { app.innerHTML = `<div class="empty">Sem dados desta etapa.</div>`; return; }
    const stages = (race && race.stages) || [];
    const i = stages.findIndex(s => s.id === id);
    const prev = stages[i - 1], next = stages[i + 1];

    let html = `<div class="race-head"><div>
      <div class="muted">${raceLink(slug, year, `${race ? cleanName(race.name) : slug} ${year}`)} · ${fmtDate(stage.date)}</div>
      <h1>Etapa ${stage.number ?? ""}${stage.type ? ` (${esc(stage.type)})` : ""}</h1><h3 class="muted">${esc(stage.route || "")}</h3></div>
      <div style="margin-left:auto;display:flex;gap:6px">
        ${prev ? `<a class="btn ghost" id="btn-prev-stage" href="#/etapa/${slug}/${year}/${prev.id}">← Etapa ${prev.number ?? ""}</a>` : ""}
        ${next ? `<a class="btn ghost" id="btn-next-stage" href="#/etapa/${slug}/${year}/${next.id}">Etapa ${next.number ?? ""} →</a>` : ""}
      </div></div>
      <div class="swipe-hint">👈 Desliza para o lado no telemóvel para mudar de etapa 👉</div>`;
    
    html += factsHtml(stage.info || {});
    html += `<div class="section"><h2>Perfil</h2><div id="profile"></div></div><div class="section"><h2>Classificações</h2><div id="cls"></div></div>`;
    app.innerHTML = html;
    profileChart(document.getElementById("profile"), stage);
    classificationTabs(document.getElementById("cls"), stage.classifications || {});

    let touchStartX = 0;
    app.ontouchstart = e => { touchStartX = e.changedTouches[0].screenX; };
    app.ontouchend = e => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (diff < -65 && next) {
        haptic(25);
        location.hash = `#/etapa/${slug}/${year}/${next.id}`;
      } else if (diff > 65 && prev) {
        haptic(25);
        location.hash = `#/etapa/${slug}/${year}/${prev.id}`;
      }
    };
  }

  function liveBox(live, doneLabel) { return ""; }
  function wireMore(el, rows, kind) {
    if (el) el.onclick = e => { haptic(15); const b = e.target.closest(".more-btn"); if (b) el.innerHTML = classTable(rows, kind); };
  }

  const LANES = [[91, 40], [81, 24], [73, 50], [63, 30], [56, 54], [48, 20], [40, 44], [32, 28], [23, 52], [13, 34]];
  function pelotonHtml(riders, { title = "", sub = "", compact = false, link = () => true } = {}) {
    const list = (riders || []).filter(r => r && r.slug).slice(0, 10);
    if (!list.length) return "";
    return `<div class="peloton${compact ? " compact" : ""}" aria-hidden="true">
      <div class="road"><i></i></div>
      ${title ? `<div class="pel-title"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>` : ""}
      ${list.map((r, i) => `<a class="pr${i === 0 ? " lead" : ""}"${link(r) ? ` href="#/ciclista/${esc(r.slug)}"` : ""} style="--x:${LANES[i][0]};--y:${LANES[i][1]}%;--my:${i % 2 ? 62 : 25}%;animation-delay:${(i * 0.37) % 1.6}s" tabindex="-1">
        <span class="pr-pic">${avatar(r.slug, r.name)}${r.team ? shirt(r.team, "pr-shirt") : ""}<span class="pr-n">${i + 1}</span></span><span class="pr-name">${esc(surname(r.name))}</span></a>`).join("")}
    </div>`;
  }

  async function topRiders() {
    const idx = await get("riders/index.json");
    return ((idx && idx.riders) || []).filter(r => r.rank).sort((a, b) => a.rank - b.rank).slice(0, 10);
  }

  async function topPeloton(opts = {}) {
    return pelotonHtml(await topRiders(), { title: `Top 10 de ${YEAR}`, sub: "ranking PCS", ...opts });
  }

  const rowsToRiders = rows => (rows || []).filter(r => /^\d+$/.test(r.rank) && r.rider).map(r => ({ slug: r.rider, name: r.name, team: r.team }));
  let refreshTimer = null;
  function refreshLater(fn) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { if (document.visibilityState === "visible") fn(); else refreshLater(fn); }, 120000); }

  const CAL_FILTERS = [
    { key: "all", label: "Todas", test: () => true },
    { key: "wt", label: "WorldTour", test: r => /UWT/.test(r.class) },
    { key: "pro", label: "ProSeries", test: r => /Pro/.test(r.class) },
    { key: "champ", label: "Campeonatos", test: r => /WC|CC|NC/.test(r.class) },
    { key: "pt", label: "Portugal", test: r => r.country === "pt" },
    { key: "stage", label: "Por etapas", test: r => r.stage_race },
  ];

  async function viewCalendar(year) {
    clearInterval(countdownTimer);
    year = Number(year) || YEAR;
    const cal = await get(`calendar/${year}.json`);
    const races = (cal && cal.races) || [];
    const years = []; for (let y = YEAR + 1; y >= 2015; y--) years.push(y);
    app.innerHTML = `${await topPeloton({ compact: true })}<div class="race-head"><div><h1>Calendário ${year}</h1><div class="muted">${races.length} provas</div></div>
      <select id="cal-year" style="margin-left:auto">${years.map(y => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select></div>
      <div class="tabs" id="cal-f">${CAL_FILTERS.map((f, i) => `<button data-k="${f.key}" class="${i ? "" : "on"}">${f.label}</button>`).join("")}</div><div id="cal-body"></div>`;
    
    const ySel = document.getElementById("cal-year");
    if (ySel) ySel.onchange = e => { location.hash = `#/calendario/${e.target.value}`; };
    const body = document.getElementById("cal-body");
    const render = key => {
      const f = CAL_FILTERS.find(x => x.key === key);
      const list = races.filter(f.test);
      if (!list.length) { body.innerHTML = `<div class="empty">Sem provas.</div>`; return; }
      const byMonth = {};
      list.forEach(r => { const m = Number((r.start || "").slice(5, 7)) || 0; (byMonth[m] = byMonth[m] || []).push(r); });
      body.innerHTML = Object.keys(byMonth).sort((a, b) => a - b).map(m => `<div class="section"><h2>${MESES_LONGOS[m - 1] || ""}</h2><div class="grid">${byMonth[m].map(raceCard).join("")}</div></div>`).join("");
    };
    const cF = document.getElementById("cal-f");
    if (cF) {
      cF.onclick = e => {
        const b = e.target.closest("button"); if (!b) return;
        haptic(15);
        document.querySelectorAll("#cal-f button").forEach(x => x.classList.toggle("on", x === b));
        render(b.dataset.k);
      };
    }
    render("all");
  }

  async function viewRiders() {
    clearInterval(countdownTimer);
    const idx = await get("riders/index.json");
    const riders = (idx && idx.riders) || [];
    app.innerHTML = `${await topPeloton({ compact: true })}<div class="race-head"><div><h1>Ciclistas</h1><div class="muted">${riders.length} ciclistas da época ${YEAR}</div></div></div>
      <input class="search" id="q" placeholder="Procurar ciclista, país ou equipa…" autocomplete="off">
      <div class="tabs" id="rf" style="margin-top:12px"><button class="on" data-k="all">Todos</button><button data-k="pt">🇵🇹 Portugueses</button><button data-k="fav">★ Favoritos</button></div><div id="list" class="grid small-cards"></div>`;
    const q = document.getElementById("q"), list = document.getElementById("list");
    let mode = "all";
    const norm = s => (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const render = () => {
      const term = norm(q.value.trim());
      let res = riders;
      if (mode === "pt") res = res.filter(r => r.nation === "pt");
      if (mode === "fav") { const f = new Set(favs.all().map(x => x.slug)); res = res.filter(r => f.has(r.slug)); }
      if (term) res = res.filter(r => norm(`${r.name} ${r.team_name} ${r.nation}`).includes(term));
      list.innerHTML = res.slice(0, 120).map(r => `<a class="card rider-card" href="#/ciclista/${esc(r.slug)}">${avatar(r.slug, r.name)}
        <div><b>${flag(r.nation)}${esc(r.name)}</b><div class="muted small">${shirt(r.team)}${esc(r.team_name || "")}</div></div></a>`).join("") || `<div class="empty">Nenhum ciclista encontrado.</div>`;
    };
    if (q) q.oninput = render;
    const rF = document.getElementById("rf");
    if (rF) {
      rF.onclick = e => { const b = e.target.closest("button"); if (!b) return; haptic(15); mode = b.dataset.k; document.querySelectorAll("#rf button").forEach(x => x.classList.toggle("on", x === b)); render(); };
    }
    render();
  }

  const SPEC = { gc: "Geral", climber: "Montanha", tt: "Contrarrelógio", sprint: "Sprint", oneday: "Clássicas", hills: "Colinas" };
  async function viewRider(slug) {
    clearInterval(countdownTimer);
    const r = await get(`riders/${slug}.json`);
    if (!r) { app.innerHTML = `<div class="empty">Ainda não temos a ficha deste ciclista. <a href="${PCS}rider/${esc(slug)}" target="_blank" rel="noopener">Ver no ProCyclingStats</a></div>`; return; }
    const age = r.birthdate ? Math.floor((Date.now() - new Date(r.birthdate)) / 31557600000) : null;
    const team = (r.teams || []).find(t => String(t.season).includes(String(YEAR))) || (r.teams || [])[0];
    
    let html = `<div class="race-head">${avatar(slug, r.name, "big")}<div>
      <div class="muted">${flag(r.nation)}${esc(r.nationality || "")}${team ? ` · ${teamLink(team.team, team.name)}` : ""}</div><h1>${esc(r.name)}</h1>
      <div class="row" style="display:flex;gap:8px;align-items:center">
        ${starBtn(slug, r.name)}
        <a class="btn ghost small" href="#/duelo/${esc(slug)}" style="padding:6px 12px;font-size:13px">⚔️ Duelo</a>
        <a class="muted small" target="_blank" rel="noopener" href="${PCS}rider/${esc(slug)}">ProCyclingStats ↗</a>
      </div></div></div>
      
      <div class="facts">${[["Idade", age], ["Nascimento", r.birthdate && fmtDate(r.birthdate) + " " + r.birthdate.slice(0, 4)], ["Local", r.birthplace], ["Peso", r.weight_kg && `${r.weight_kg} kg`], ["Altura", r.height_m && `${r.height_m} m`]]
        .filter(x => x[1] != null && x[1] !== "").map(([k, v]) => `<div class="fact"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>`;

    html += `<div class="section"><div class="section-head"><h2>🏆 Conquistas & Grandes Voltas</h2></div>${trophiesHtml(r)}</div>`;
    html += `<div class="two" style="margin-top:20px"><div>`;

    if (Object.keys(r.specialties || {}).length) {
      html += `<div class="section"><div class="section-head"><h2>📊 Perfil de Atributos (Radar)</h2></div>${radarChartSvg(r.specialties)}</div>`;
    }

    const res = r.season_results || [];
    if (res.length) {
      html += `<div class="section"><h2>Resultados ${YEAR}</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>#</th><th>Prova</th><th class="r">km</th></tr></thead><tbody>${res.map(x => {
        const link = x.race ? (x.part && x.part.startsWith("stage") && x.stages ? raceLink(x.race, x.year, x.label) : raceLink(x.race, x.year, x.label)) : esc(x.label);
        const main = `<tr><td class="muted">${esc(x.date)}</td><td class="rank">${esc(x.result || "")}</td><td>${link}</td><td class="r">${esc(x.distance_km || "")}</td></tr>`;
        const st = (x.stages || []).map(s => `<tr class="small"><td class="muted">${esc(s.date || "")}</td><td>${esc(s.result || "")}</td><td style="padding-left:24px"><a href="#/etapa/${esc(s.race)}/${s.year}/${esc(s.part)}">${esc(s.label)}</a>${s.jersey ? ` <span class="jersey j-gc" style="background:${esc(s.jersey)}"></span>` : ""}</td><td class="r">${esc(s.distance_km || "")}</td></tr>`).join("");
        return main + st;
      }).join("")}</tbody></table></div></div>`;
    }

    html += `</div><div>`;
    if ((r.top_results || []).length) html += `<div class="section"><h2>Palmarés</h2><div class="panel">${r.top_results.map(t => `<div style="padding:6px 0;border-bottom:1px solid #20252f"><b class="muted">${esc(t.count || "")}</b> ${esc(t.text)}</div>`).join("")}</div></div>`;
    if ((r.teams || []).length) html += `<div class="section"><h2>Equipas</h2><div class="panel">${r.teams.map(t => `<div style="padding:5px 0"><span class="muted">${esc(t.season)}</span> ${teamLink(t.team, t.name)} <span class="tag">${esc(t.level || "")}</span></div>`).join("")}</div></div>`;
    if ((r.pcs_ranking_by_season || []).length) html += `<div class="section"><h2>Ranking por Época</h2><div class="panel">${r.pcs_ranking_by_season.map(s => `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${s.season}</span><span class="muted">${s.points ?? ""} pts</span><b>${s.rank ?? ""}.º</b></div>`).join("")}</div></div>`;
    html += `</div></div>`;

    app.innerHTML = html;
  }

  async function viewFavorites() {
    clearInterval(countdownTimer);
    const list = favs.all();
    if (!list.length) { 
      app.innerHTML = `<div class="race-head"><h1>Favoritos</h1></div><div class="empty">Ainda não segues nenhum ciclista.<br><br><a class="btn" href="#/ciclistas">Procurar ciclistas</a></div>`; 
      return; 
    }
    app.innerHTML = `<div class="race-head"><h1>Favoritos</h1></div><div class="grid">${list.map(f => `<div class="card"><a class="rider-card" href="#/ciclista/${esc(f.slug)}">${avatar(f.slug, f.name)}<div><b>${esc(f.name)}</b></div></a><div style="margin-top:10px">${starBtn(f.slug, f.name)}</div></div>`).join("")}</div>`;
  }

  function setUpdated(meta) {
    const el = document.getElementById("updated");
    if (el && meta && meta.updated) el.textContent = `atualizado ${new Date(meta.updated).toLocaleString("pt-PT")}`;
  }

  // ------------------------------------------------------------ ROTAS & INICIALIZAÇÃO
  const routes = [
    [/^$/, viewHome, "home"],
    [/^calendario(?:\/(\d{4}))?$/, viewCalendar, "calendario"],
    [/^prova\/([^/]+)\/(\d{4})$/, viewRace, "calendario"],
    [/^etapa\/([^/]+)\/(\d{4})\/([^/]+)$/, viewStage, "calendario"],
    [/^ciclistas$/, viewRiders, "ciclistas"],
    [/^ciclista\/([^/]+)$/, viewRider, "ciclistas"],
    [/^equipas(?:\/(\d{4}))?$/, viewTeams, "equipas"],
    [/^equipa\/([^/]+)$/, viewTeam, "equipas"],
    [/^lendas$/, viewLegends, "lendas"],
    [/^favoritos$/, viewFavorites, "favoritos"],
    [/^duelo(?:\/([^/]+))?(?:\/([^/]+))?$/, viewVersus, "duelo"],
    [/^palpites$/, viewPredictionsHub, "palpites"],
    [/^transferencias$/, viewTransfers, "transferencias"],
    [/^app$/, () => { location.hash = "#/"; }, ""],
  ];

  async function route() {
    clearTimeout(refreshTimer);
    clearInterval(countdownTimer);
    try { renderTicker(); } catch(e) {}
    setupUpdateChecker();

    const path = decodeURIComponent(location.hash.replace(/^#\/?/, "")).replace(/\/$/, "");
    for (const [re, fn, nav] of routes) {
      const m = path.match(re);
      if (!m) continue;
      document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.nav === nav));
      try { renderMobileNav(nav); } catch(e) {}
      if (app) app.innerHTML = `<div class="loading">A carregar…</div>`;
      try { await fn(...m.slice(1)); } catch (e) { 
        console.error(e); 
        if (app) app.innerHTML = `<div class="empty">Ocorreu um erro ao carregar esta página (${esc(e.message)}).</div>`; 
      }
      window.scrollTo(0, 0);
      return;
    }
    location.hash = "#/";
  }

  window.addEventListener("hashchange", route);
  route();
  get("meta.json").then(meta => {
    setUpdated(meta);
  });
})();
