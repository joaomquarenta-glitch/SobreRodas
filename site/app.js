/* SobreRodas — Plataforma Dinâmica de Ciclismo (Lendas com Fotos, Bicicletas & Update Banner) */
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

      /* ESTILOS DE LUXO PARA AS LENDAS */
      .legend-card-rich { background: linear-gradient(145deg, #161b26, #10131a); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; transition: transform .2s, border-color .2s; box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
      .legend-card-rich:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 15px var(--accent-glow); }
      .legend-photo-wrap { position: relative; width: 100%; height: 220px; overflow: hidden; background: #1a202c; }
      .legend-photo-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: top center; transition: transform .3s; }
      .legend-card-rich:hover .legend-photo-wrap img { transform: scale(1.04); }
      .legend-info { padding: 18px; display: flex; flex-direction: column; flex: 1; }
      .legend-nick { font-family: var(--head); color: var(--accent); font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
      .legend-name { font-family: var(--head); font-size: 24px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px; color: #fff; }
      .legend-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; padding-top: 10px; }

      /* BARRA FLUTUANTE DE ATUALIZAÇÃO AUTOMÁTICA */
      #update-banner { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background: #131926; border: 1px solid var(--accent); border-radius: 30px; padding: 8px 18px; display: none; align-items: center; gap: 12px; z-index: 999999; box-shadow: 0 10px 30px rgba(0,0,0,0.7); animation: bounceIn .4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      @keyframes bounceIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }

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

  // ------------------------------------------------------------ ⚡ DETETOR DE ATUALIZAÇÃO DA APP
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
      document.getElementById("btn-do-update").onclick = () => {
        haptic(30);
        window.location.reload(true);
      };
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        banner.style.display = "flex";
      });
    }
  }

  // ------------------------------------------------------------ 🎉 CONFETIS EM CANVAS PURO
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

  // ------------------------------------------------------------ TICKER COM SELETOR DE TEMAS
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

  // ------------------------------------------------------------ BARRA MOBILE INFERIOR (BOTTOM NAV)
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

    // BLOCO DE MATERIAL & BICICLETA DA EQUIPA
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
    const el = document.getElementById("updated");
    if (el && meta && meta.updated) el.textContent = `atualizado ${new Date(meta.updated).toLocaleString("pt-PT")}`;
  });
})();
