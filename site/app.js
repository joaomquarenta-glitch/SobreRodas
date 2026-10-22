/* SobreRodas — Plataforma Dinâmica de Ciclismo (Fase 3: Liga de Palpites & Gamificação) */
(() => {
  "use strict";

  let SOURCES = [].concat(window.SOBRERODAS_DATA || "data/");
  const PCS = "https://www.procyclingstats.com/";
  const app = document.getElementById("app");
  const cache = new Map();
  const TODAY = new Date().toISOString().slice(0, 10);
  const YEAR = Number(TODAY.slice(0, 4));

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

      /* Estilos do Radar & Troféus */
      .radar-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--panel2); border-radius: 16px; padding: 16px; border: 1px solid var(--line); }
      .trophy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-top: 12px; }
      .trophy-badge { background: linear-gradient(135deg, rgba(255,214,10,0.1), rgba(20,24,34,0.9)); border: 1px solid rgba(255,214,10,0.35); border-radius: 12px; padding: 12px 10px; text-align: center; }
      .trophy-badge .icon { font-size: 24px; margin-bottom: 4px; display: block; }
      .trophy-badge .count { font-family: var(--head); font-size: 20px; font-weight: 800; color: var(--accent); }
      .trophy-badge .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }

      /* Estilos dos Palpites (Gamificação) */
      .predict-box { background: linear-gradient(135deg, #182030, #121620); border: 1px solid rgba(255, 214, 10, 0.35); border-radius: 16px; padding: 22px; margin: 20px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      .predict-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin: 16px 0; }
      .predict-slot { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
      .predict-slot.gold { border-color: #ffd60a; }
      .predict-slot.silver { border-color: #cbd5e1; }
      .predict-slot.bronze { border-color: #d97706; }
      .predict-slot select { width: 100%; }
    `;
    document.head.appendChild(dynamicStyles);
  } catch(e) {}

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
  
  // Bandeiras nítidas em alta definição
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
      if (b) b.parentElement.innerHTML = classTable(cls[b.dataset.kind], b.dataset.kind);
    };
  }

  // ------------------------------------------------------------ TICKER DE NOTÍCIAS AO VIVO
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
      `⚡ <b>PRÓXIMA PROVA:</b> Veneto Classic em contagem decrescente`,
      `🇵🇹 <b>PORTUGAL:</b> João Almeida, Rui Costa e Nelson Oliveira no pelotão mundial`,
      `🏆 <b>RANKING PCS:</b> Tadej Pogačar lidera a época com mais de 11.000 pontos`,
      `⚔️ <b>NOVO:</b> Experimenta o comparador no menu Duelo de Ciclistas!`,
      `🎮 <b>PALPITES:</b> Escolhe o teu pódio nas provas e ganha pontos`,
      `📡 <b>TRANSMISSÕES:</b> Acompanha as clássicas nos canais Eurosport e Max`,
      `⭐ <b>FAVORITOS:</b> Carrega na estrela para seguir ciclistas`
    ];
    const content = news.map(n => `<span class="ticker-item">${n}</span>`).join(" · ");
    wrap.innerHTML = `<div class="ticker-move">${content} &nbsp;·&nbsp; ${content}</div>`;
  }

  // ------------------------------------------------------------ 📊 RADAR DE HABILIDADES EM SVG (SPIDER CHART)
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

  // ------------------------------------------------------------ 🎮 FASE 3: LIGA DE PALPITES (PODIUM PREDICTION)
  function predictionBoxHtml(race, slug, year) {
    const pickKey = `sobrerodas:picks:${slug}:${year}`;
    let myPicks = { p1: "", p2: "", p3: "" };
    try { myPicks = JSON.parse(localStorage.getItem(pickKey)) || myPicks; } catch(e) {}

    // Lista de ciclistas inscritos para escolher
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

    // Se já terminou, calcula a pontuação oficial do palpite
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
          <span class="muted small">Aposta nos 3 primeiros lugares antes da partida e soma pontos!</span>
        </div>
        ${hasResults ? `<span class="tag done">Corrida Terminada</span>` : isLocked ? `<span class="tag done">🔒 Palpite Gravado</span>` : `<span class="tag wt">Palpites Abertos</span>`}
      </div>

      <div class="predict-slots" id="predict-form">
        <div class="predict-slot gold">
          <b style="color:#ffd60a">🥇 1.º Lugar (Vencedor)</b>
          <select id="pick-1" ${hasResults ? "disabled" : ""}>
            <option value="">-- Escolhe o Vencedor --</option>
            ${ridersList.map(r => `<option value="${r.rider}" ${myPicks.p1 === r.rider ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>

        <div class="predict-slot silver">
          <b style="color:#cbd5e1">🥈 2.º Lugar</b>
          <select id="pick-2" ${hasResults ? "disabled" : ""}>
            <option value="">-- Escolhe o 2.º --</option>
            ${ridersList.map(r => `<option value="${r.rider}" ${myPicks.p2 === r.rider ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>

        <div class="predict-slot bronze">
          <b style="color:#d97706">🥉 3.º Lugar</b>
          <select id="pick-3" ${hasResults ? "disabled" : ""}>
            <option value="">-- Escolhe o 3.º --</option>
            ${ridersList.map(r => `<option value="${r.rider}" ${myPicks.p3 === r.rider ? "selected" : ""}>${r.name}</option>`).join("")}
          </select>
        </div>
      </div>

      ${!hasResults ? `
        <div style="display:flex;gap:10px;align-items:center;margin-top:12px">
          <button class="btn" id="btn-save-picks">✔ Gravar Palpites</button>
          <span class="muted small" id="pick-feedback"></span>
        </div>` : ""}

      ${scoreHtml}
    </div>`;
  }

  function wirePredictions(slug, year) {
    const btn = document.getElementById("btn-save-picks");
    if (!btn) return;
    btn.onclick = () => {
      const p1 = document.getElementById("pick-1").value;
      const p2 = document.getElementById("pick-2").value;
      const p3 = document.getElementById("pick-3").value;

      if (!p1 || !p2 || !p3) {
        document.getElementById("pick-feedback").innerHTML = `<span style="color:#ff6b6b">Escolhe os 3 ciclistas antes de gravar!</span>`;
        return;
      }
      if (p1 === p2 || p1 === p3 || p2 === p3) {
        document.getElementById("pick-feedback").innerHTML = `<span style="color:#ff6b6b">Não podes escolher o mesmo ciclista em mais do que um lugar!</span>`;
        return;
      }

      const pickKey = `sobrerodas:picks:${slug}:${year}`;
      localStorage.setItem(pickKey, JSON.stringify({ p1, p2, p3 }));
      document.getElementById("pick-feedback").innerHTML = `<span style="color:var(--green)">✔ Palpite gravado com sucesso!</span>`;
      setTimeout(() => viewRace(slug, year), 600);
    };
  }

  // ------------------------------------------------------------ ⚔️ DUELO DE CICLISTAS
  async function viewVersus(slugA, slugB) {
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
    if (sA) sA.onchange = e => { location.hash = `#/duelo/${e.target.value}/${slugB}`; };
    if (sB) sB.onchange = e => { location.hash = `#/duelo/${slugA}/${e.target.value}`; };
  }

  // ------------------------------------------------------------ GRANDES VOLTAS PERSONALIZADAS
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
  async function viewHome() {
    const [live, cal, meta, idx] = await Promise.all([
      get("live.json", { fresh: true }), 
      get(`calendar/${YEAR}.json`), 
      get("meta.json", { fresh: true }),
      get("riders/index.json")
    ]);
    const races = (cal && cal.races) || [];
    const liveRaces = (live && live.date === TODAY && live.races) || [];
    const next = races.filter(r => r.start > TODAY).slice(0, 8);
    const done = races.filter(r => (r.end || r.start) < TODAY).slice(-8).reverse();
    const big = ["giro-d-italia", "tour-de-france", "vuelta-a-espana", "volta-a-portugal"];
    const bigRaces = big.map(s => races.find(r => r.slug === s)).filter(Boolean);
    
    const tugas = ((idx && idx.riders) || []).filter(r => r.nation === "pt").slice(0, 8);

    let html = `<section class="hero"><div class="kicker">Época ${YEAR}</div><h1>O pelotão, etapa a etapa</h1>
      <p class="muted">${races.length} provas: WorldTour, ProSeries, Mundiais, Europeus e as provas portuguesas.</p>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="#/calendario">Ver calendário</a>
        <a class="btn" href="#/duelo" style="background:linear-gradient(135deg,#ffd60a,#ff9f1c);color:#111">⚔️ Duelo de Ciclistas</a>
        <a class="btn ghost" href="#/lendas">Lendas</a>
      </div>
      ${await topPeloton()}</section>`;

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
          <span class="muted small">As provas mais prestigiadas e exigentes da temporada</span>
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
    if (done.length) html += `<section class="section"><div class="section-head"><h2>Últimos resultados</h2></div><div class="grid">${done.map(raceCard).join("")}</div></section>`;
    app.innerHTML = html;
    setUpdated(meta);
  }

  function raceCard(r) {
    const st = status(r);
    return `<a class="card" href="#/prova/${esc(r.slug)}/${r.year}">
      <div class="row"><span class="date">${fmtRange(r.start, r.end)}</span>${st === "live" ? `<span class="tag live">A decorrer</span>` : ""}</div>
      <div class="title">${flag(r.country)}${esc(cleanName(r.name))}</div>
      <div class="row">${classTag(r.class)}${r.stage_race ? `<span class="tag">Por etapas</span>` : `<span class="tag">Um dia</span>`}</div>
      ${r.winner ? `<div class="small" style="margin-top:8px">🏆 ${esc(niceName(r.winner.name))}</div>` : ""}</a>`;
  }

  // ------------------------------------------------------------ PÁGINA DA PROVA (COM PALPITES & GUIA TV)
  async function viewRace(slug, year) {
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
      <select id="race-year" style="margin-left:auto">${[...years].reverse().map(y => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select></div>`;

    // BLOCO DE GUIA TV
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

    // NOVIDADE FASE 3: Caixa da Liga de Palpites
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

    if (race.startlist && race.startlist.length) html += startlistHtml(race.startlist);
    html += historyHtml(hist, race.stage_race);
    app.innerHTML = html;
    
    const rYear = document.getElementById("race-year");
    if (rYear) rYear.onchange = e => { location.hash = `#/prova/${slug}/${e.target.value}`; };
    
    // Ativar lógica dos palpites
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
    const n = sl.reduce((s, t) => s + (t.riders || []).length, 0), out = sl.reduce((s, t) => s + (t.riders || []).filter(r => r.status).length, 0);
    return `<div class="section"><div class="section-head"><h2>Inscritos / Startlist</h2><span class="muted small">${sl.length} equipas · ${n} ciclistas${out ? ` · ${out} desistências` : ""}</span></div>
      <div class="grid" style="margin-top:14px">${sl.map(t => `<div class="card">
        <div class="row" style="border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:10px"><b>${teamLink(t.team, t.name)}</b></div>
        <div style="display:flex;flex-direction:column;gap:8px">${(t.riders || []).map(r => `
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;${r.status ? "opacity:.5" : ""}">
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
    (an.climbs || []).forEach(c => items.push({ km: c.km ?? c.top_km, html: `<div class="climb"><span class="cat">${esc(c.category || "▲")}</span>
      <div><b>${esc(c.name || "Subida")}</b><div class="muted small">${c.length_km ? `${c.length_km} km a ${c.avg_gradient}%` : ""}</div></div>
      <div class="r"><b>km ${esc(c.km ?? c.top_km)}</b>${c.top_m ? `<div class="muted small">${c.top_m} m</div>` : ""}</div></div>` }));
    items.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
    return items.length ? items.map(i => i.html).join("") : `<div class="empty">Sem dados de subidas.</div>`;
  }

  function intermediateBlock(list) { return ""; }

  async function viewStage(slug, year, id) {
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
      <div style="margin-left:auto;display:flex;gap:6px">${prev ? `<a class="btn ghost" href="#/etapa/${slug}/${year}/${prev.id}">←</a>` : ""}${next ? `<a class="btn ghost" href="#/etapa/${slug}/${year}/${next.id}">→</a>` : ""}</div></div>`;
    html += factsHtml(stage.info || {});
    html += `<div class="section"><h2>Perfil</h2><div id="profile"></div></div><div class="section"><h2>Classificações</h2><div id="cls"></div></div>`;
    app.innerHTML = html;
    profileChart(document.getElementById("profile"), stage);
    classificationTabs(document.getElementById("cls"), stage.classifications || {});
  }

  function liveBox(live, doneLabel) { return ""; }
  function wireMore(el, rows, kind) {
    if (el) el.onclick = e => { const b = e.target.closest(".more-btn"); if (b) el.innerHTML = classTable(rows, kind); };
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
        document.querySelectorAll("#cal-f button").forEach(x => x.classList.toggle("on", x === b));
        render(b.dataset.k);
      };
    }
    render("all");
  }

  async function viewRiders() {
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
      rF.onclick = e => { const b = e.target.closest("button"); if (!b) return; mode = b.dataset.k; document.querySelectorAll("#rf button").forEach(x => x.classList.toggle("on", x === b)); render(); };
    }
    render();
  }

  const SPEC = { gc: "Geral", climber: "Montanha", tt: "Contrarrelógio", sprint: "Sprint", oneday: "Clássicas", hills: "Colinas" };
  async function viewRider(slug) {
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

  async function viewTeams(year) {
    year = Number(year) || YEAR;
    const idx = await get(`teams/index-${year}.json`);
    const teams = (idx && idx.teams) || [];
    let html = `${await topPeloton({ compact: true })}<div class="race-head"><div><h1>Equipas ${year}</h1><div class="muted">${teams.length} equipas</div></div></div>
      <div class="grid small-cards">${teams.map(t => `<a class="card team-card" href="#/equipa/${esc(t.slug)}">${shirt(t.slug, "shirt big")}<div><b>${flag(t.nation)}${esc(t.name)}</b><div class="muted small">${t.riders || ""} ciclistas</div></div></a>`).join("")}</div>`;
    app.innerHTML = teams.length ? html : `<div class="empty">Sem equipas.</div>`;
  }

  async function viewTeam(slug) {
    const t = await get(`teams/${slug}.json`);
    if (!t) { app.innerHTML = `<div class="empty">Ainda não temos esta equipa.</div>`; return; }
    app.innerHTML = `<div class="race-head">${shirt(slug, "shirt huge")}<div><h1>${esc(t.name)}</h1></div></div>
      <div class="section"><h2>Plantel</h2><div class="grid small-cards">${(t.riders || []).map(r => `<a class="card rider-card" href="#/ciclista/${esc(r.rider)}">${avatar(r.rider, r.name)}<div><b>${flag(r.nation)}${esc(niceName(r.name))}</b></div></a>`).join("")}</div></div>`;
  }

  async function viewLegends() {
    const L = window.SOBRERODAS_LEGENDS || { mundo: [], portugal: [] };
    const card = l => `<div class="card legend-card"><div class="rider-card">${avatar(l.slug, l.name, "legend")}<div><div class="title">${flag(l.nation)}${esc(l.name)}</div></div></div></div>`;
    app.innerHTML = `<section class="hero"><div class="kicker">Lendas</div><h1>Os maiores de sempre</h1></section>
      <div class="section"><h2>Lendas</h2><div class="grid">${[...L.portugal, ...L.mundo].map(card).join("")}</div></div>`;
  }

  async function viewFavorites() {
    const list = favs.all();
    if (!list.length) { 
      app.innerHTML = `<div class="race-head"><h1>Favoritos</h1></div><div class="empty">Ainda não segues nenhum ciclista.<br><br><a class="btn" href="#/ciclistas">Procurar ciclistas</a></div>`; 
      return; 
    }
    app.innerHTML = `<div class="race-head"><h1>Favoritos</h1></div><div class="grid">${list.map(f => `<div class="card"><a class="rider-card" href="#/ciclista/${esc(f.slug)}">${avatar(f.slug, r.name || f.name)}<div><b>${esc(f.name)}</b></div></a><div style="margin-top:10px">${starBtn(f.slug, f.name)}</div></div>`).join("")}</div>`;
  }

  function setUpdated(meta) {
    const el = document.getElementById("updated");
    if (el && meta && meta.updated) el.textContent = `atualizado ${new Date(meta.updated).toLocaleString("pt-PT")}`;
  }

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
    [/^app$/, () => { location.hash = "#/"; }, ""],
  ];

  async function route() {
    clearTimeout(refreshTimer);
    try { renderTicker(); } catch(e) {}
    const path = decodeURIComponent(location.hash.replace(/^#\/?/, "")).replace(/\/$/, "");
    for (const [re, fn, nav] of routes) {
      const m = path.match(re);
      if (!m) continue;
      document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.nav === nav));
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
  get("meta.json").then(setUpdated);
})();
