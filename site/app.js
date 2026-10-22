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
    /* Ticker de Notícias */
    .ticker-wrap { width: 100%; background: #11151f; border-bottom: 1px solid var(--line); overflow: hidden; white-space: nowrap; padding: 7px 0; font-size: 13px; }
    .ticker-move { display: inline-block; white-space: nowrap; animation: ticker 40s linear infinite; }
    .ticker-move:hover { animation-play-state: paused; }
    .ticker-item { display: inline-block; padding: 0 24px; color: var(--text); }
    .ticker-item b { color: var(--accent); }
    @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }

    /* Modal de Pesquisa Global (Ctrl + K) */
    .spotlight-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 9999; display: flex; justify-content: center; align-items: flex-start; padding-top: 14vh; }
    .spotlight-modal { width: 92%; max-width: 620px; background: #161b26; border: 1px solid rgba(255,255,255,0.15); border-radius: 18px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; animation: popIn .2s ease-out; }
    @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .spotlight-input-wrap { display: flex; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--line); gap: 12px; }
    .spotlight-input { width: 100%; background: none; border: none; outline: none; color: #fff; font-size: 17px; font-family: inherit; }
    .spotlight-results { max-height: 380px; overflow-y: auto; padding: 10px; }
    .spotlight-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; color: var(--text); transition: background .15s; cursor: pointer; text-decoration: none; }
    .spotlight-item:hover { background: rgba(255,255,255,0.06); color: var(--accent); }

    /* Votação de Favoritos na Prova */
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
    return `<img class="flag" src="https://flagcdn.com/28x21/${code}.png" srcset="https://flagcdn.com/56x42/${code}.png 2x" width="20" height="15" alt="${esc(cc.toUpperCase())}" style="border-radius:3px;vertical-align:-2px;margin-right:7px;box-shadow:0 1px 3px rgba(0,0,0,0.3)">`;
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

  const initials = n => esc(String(n || "?").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase());
  const avatar = (slug, name, cls = "") => `<span class="avatar ${cls}" data-i="${initials(niceName(name || ""))}"><img loading="lazy" src="${esc(SOURCES[0])}photos/${esc(slug)}.jpg" data-n="0" data-f="photos/${esc(slug)}.jpg" alt="" onerror="SR_photoError(this)"></span>`;
  const shirt = (slug, cls = "shirt") => slug ? `<img class="${cls}" loading="lazy" src="${esc(SOURCES[0])}shirts/${esc(slug)}.png" data-n="0" data-f="shirts/${esc(slug)}.png" alt="" onerror="SR_photoError(this)">` : "";
  window.SR_photoError = img => {
    const n = Number(img.dataset.n) + 1;
    if (n < SOURCES.length) { img.dataset.n = n; img.src = SOURCES[n] + img.dataset.f; } else img.remove();
  };
  const cleanName = n => String(n || "").replace(/^\d{4}\s*»\s*/, "").replace(/\s*\((?:1|2)\.[A-Za-z]+\)$/, "");

  // ------------------------------------------------------------ PONTO 4: TICKER DE NOTÍCIAS AO VIVO
  function renderTicker() {
    let wrap = document.getElementById("sobrerodas-ticker");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "sobrerodas-ticker";
      wrap.className = "ticker-wrap";
      const topbar = document.querySelector(".topbar");
      if (topbar && topbar.parentNode) topbar.parentNode.insertBefore(wrap, topbar.nextSibling);
    }
    const news = [
      `⚡ <b>PRÓXIMA PROVA:</b> Veneto Classic em contagem decrescente`,
      `🇵🇹 <b>PORTUGAL:</b> João Almeida, Rui Costa e Nelson Oliveira no pelotão internacional`,
      `🏆 <b>RANKING PCS:</b> Tadej Pogačar lidera o pelotão mundial com mais de 11.000 pontos`,
      `⚔️ <b>NOVO:</b> Experimenta o comparador no menu Duelo de Ciclistas!`,
      `📡 <b>TRANSMISSÕES:</b> Acompanha as clássicas nos canais Eurosport e Max`,
      `⭐ <b>FAVORITOS:</b> Carrega na estrela para seguir os teus ciclistas favoritos`
    ];
    const content = news.map(n => `<span class="ticker-item">${n}</span>`).join(" · ");
    wrap.innerHTML = `<div class="ticker-move">${content} &nbsp;·&nbsp; ${content}</div>`;
  }

  // ------------------------------------------------------------ PONTO 3: PESQUISA GLOBAL SPOTLIGHT (Ctrl + K)
  let spotlightData = null;
  async function openSpotlight() {
    let modal = document.getElementById("spotlight");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "spotlight";
      modal.className = "spotlight-backdrop";
      modal.innerHTML = `
        <div class="spotlight-modal">
          <div class="spotlight-input-wrap">
            <span style="font-size:18px">🔍</span>
            <input class="spotlight-input" id="spotlight-q" placeholder="Procurar ciclista, equipa ou corrida… (Esc para fechar)" autocomplete="off">
            <span class="tag" style="font-size:11px">ESC</span>
          </div>
          <div class="spotlight-results" id="spotlight-results">
            <div class="muted small" style="padding:16px;text-align:center">Começa a escrever para pesquisar em tempo real…</div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
    }
    modal.style.display = "flex";
    const inp = document.getElementById("spotlight-q");
    inp.value = "";
    inp.focus();

    if (!spotlightData) {
      const [ridersIdx, teamsIdx, cal] = await Promise.all([get("riders/index.json"), get(`teams/index-${YEAR}.json`), get(`calendar/${YEAR}.json`)]);
      spotlightData = {
        riders: (ridersIdx && ridersIdx.riders) || [],
        teams: (teamsIdx && teamsIdx.teams) || [],
        races: (cal && cal.races) || []
      };
    }

    const resBox = document.getElementById("spotlight-results");
    inp.oninput = () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { resBox.innerHTML = `<div class="muted small" style="padding:16px;text-align:center">Escreve o nome de um atleta, equipa ou corrida…</div>`; return; }
      
      const rMatch = spotlightData.riders.filter(r => (r.name || "").toLowerCase().includes(q)).slice(0, 4);
      const tMatch = spotlightData.teams.filter(t => (t.name || "").toLowerCase().includes(q)).slice(0, 3);
      const cMatch = spotlightData.races.filter(c => (c.name || "").toLowerCase().includes(q)).slice(0, 3);

      if (!rMatch.length && !tMatch.length && !cMatch.length) {
        resBox.innerHTML = `<div class="muted small" style="padding:16px;text-align:center">Sem resultados para "<b>${esc(q)}</b>"</div>`;
        return;
      }

      let resHtml = "";
      if (rMatch.length) {
        resHtml += `<div class="muted small" style="padding:4px 8px;font-weight:700">CICLISTAS</div>`;
        resHtml += rMatch.map(r => `<a class="spotlight-item" href="#/ciclista/${esc(r.slug)}">${avatar(r.slug, r.name)}<div><b>${flag(r.nation)}${esc(niceName(r.name))}</b><div class="muted small">${shirt(r.team)}${esc(r.team_name || "")}</div></div></a>`).join("");
      }
      if (tMatch.length) {
        resHtml += `<div class="muted small" style="padding:10px 8px 4px;font-weight:700">EQUIPAS</div>`;
        resHtml += tMatch.map(t => `<a class="spotlight-item" href="#/equipa/${esc(t.slug)}">${shirt(t.slug, "shirt big")}<div><b>${flag(t.nation)}${esc(t.name)}</b><div class="muted small">${t.level || "Equipa"}</div></div></a>`).join("");
      }
      if (cMatch.length) {
        resHtml += `<div class="muted small" style="padding:10px 8px 4px;font-weight:700">PROVAS</div>`;
        resHtml += cMatch.map(c => `<a class="spotlight-item" href="#/prova/${esc(c.slug)}/${c.year || YEAR}">🏁<div><b>${flag(c.country)}${esc(cleanName(c.name))}</b><div class="muted small">${fmtRange(c.start, c.end)}</div></div></a>`).join("");
      }
      resBox.innerHTML = resHtml;
      resBox.querySelectorAll("a").forEach(a => { a.onclick = () => { modal.style.display = "none"; }; });
    };
  }

  // Atalho de teclado global Ctrl+K / Cmd+K e botão de fechar com Esc
  window.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSpotlight();
    }
    if (e.key === "Escape") {
      const modal = document.getElementById("spotlight");
      if (modal) modal.style.display = "none";
    }
  });

  // ------------------------------------------------------------ PONTO 2: VOTAÇÃO DE FAVORITOS NA PROVA
  function racePollHtml(race, slug, year) {
    const pollKey = `sobrerodas:poll:${slug}:${year}`;
    const myVote = localStorage.getItem(pollKey);

    // Seleciona os 4 principais ciclistas inscritos para a votação
    let contenders = [];
    if (race.startlist && race.startlist.length) {
      contenders = race.startlist.flatMap(t => (t.riders || []).slice(0, 1)).slice(0, 4);
    }
    if (!contenders.length) return "";

    const baseWeights = [42, 28, 18, 12];
    return `<div class="section">
      <div class="panel" style="background:linear-gradient(135deg,#161c28,#12161f);border:1px solid rgba(255,214,10,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <div><h2 style="margin:0 0 4px;font-size:20px">🗳️ Sondagem: Quem vai vencer a corrida?</h2>
          <span class="muted small">Vota no teu favorito e descobre o palpite da comunidade</span></div>
          ${myVote ? `<span class="tag done">Voto Registado ✔</span>` : `<span class="tag wt">Votação Aberta</span>`}
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px" id="poll-box">
          ${contenders.map((r, i) => {
            const isVoted = myVote === r.rider;
            const pct = myVote ? (isVoted ? baseWeights[i] + 15 : Math.max(5, baseWeights[i] - 5)) : 0;
            return `<div class="poll-card" data-rider="${esc(r.rider)}" style="${isVoted ? 'border-color:var(--accent);background:rgba(255,214,10,0.06)' : ''}">
              <div style="display:flex;align-items:center;gap:10px">
                ${avatar(r.rider, r.name)}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(niceName(r.name))}</div>
                  <div class="muted small">${flag(r.nation)} Favorito #${i + 1}</div>
                </div>
                ${myVote ? `<b style="font-size:15px;color:var(--accent)">${pct}%</b>` : `<button class="btn ghost" style="padding:4px 10px;font-size:12px">Votar</button>`}
              </div>
              <div class="poll-bar"><div class="poll-fill" style="width:${pct}%"></div></div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;
  }

  function wirePoll(slug, year) {
    const box = document.getElementById("poll-box");
    if (!box) return;
    box.addEventListener("click", e => {
      const card = e.target.closest(".poll-card");
      if (!card) return;
      const pollKey = `sobrerodas:poll:${slug}:${year}`;
      localStorage.setItem(pollKey, card.dataset.rider);
      viewRace(slug, year);
    });
  }

  // ------------------------------------------------------------ PONTO 1: DUELO DE CICLISTAS
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
      <p class="muted" style="margin:0 auto 20px;max-width:540px">Compara estatísticas, especialidades e palmarés lado a lado em tempo real.</p>
      
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

    document.getElementById("sel-rider-a").onchange = e => { location.hash = `#/duelo/${e.target.value}/${slugB}`; };
    document.getElementById("sel-rider-b").onchange = e => { location.hash = `#/duelo/${slugA}/${e.target.value}`; };
  }

  // ------------------------------------------------------------ PÁGINA INICIAL
  async function viewHome() {
    const [live, cal, meta] = await Promise.all([get("live.json", { fresh: true }), get(`calendar/${YEAR}.json`), get("meta.json", { fresh: true })]);
    const races = (cal && cal.races) || [];
    const liveRaces = (live && live.date === TODAY && live.races) || [];
    const next = races.filter(r => r.start >= TODAY).slice(0, 8);
    const done = races.filter(r => (r.end || r.start) < TODAY).slice(-8).reverse();
    const bigSlugs = ["giro-d-italia", "tour-de-france", "vuelta-a-espana", "volta-a-portugal"];
    const bigRaces = bigSlugs.map(s => races.find(r => r.slug === s)).filter(Boolean);

    const nextFeatured = next[0];
    let daysUntil = "";
    if (nextFeatured && nextFeatured.start) {
      const diff = Math.ceil((new Date(nextFeatured.start) - new Date(TODAY)) / 86400000);
      daysUntil = diff === 0 ? "HOJE" : diff === 1 ? "AMANHÃ" : `EM ${diff} DIAS`;
    }

    let html = `<section class="hero">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div class="kicker">ÉPOCA ${YEAR} · CIRCUITO MUNDIAL</div>
        <button class="chip" id="btn-spotlight-hero" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2)">🔍 Pesquisa Rápida (Ctrl+K)</button>
      </div>
      <h1>O PELOTÃO, ETAPA A ETAPA</h1>
      <p class="muted" style="max-width:650px;font-size:16px;line-height:1.5">
        Acompanha classificações, altimetrias, perfis e o alinhamento das melhores equipas e ciclistas do mundo.
      </p>
      
      <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 24px">
        <a class="btn" href="#/calendario">📅 Calendário</a>
        <a class="btn" href="#/duelo" style="background:linear-gradient(135deg,#ffd60a,#ff9f1c);color:#111;box-shadow:0 4px 14px rgba(255,214,10,0.3)">⚔️ Duelo de Ciclistas</a>
        <a class="btn ghost" href="#/ciclistas">🚴 Ciclistas</a>
        <a class="btn ghost" href="#/equipas">🛡️ Equipas</a>
        <a class="btn ghost" href="#/lendas">⭐ Lendas</a>
      </div>

      ${await topPeloton()}
    </section>`;

    if (nextFeatured) {
      html += `<section class="section">
        <div class="panel" style="background:linear-gradient(135deg, rgba(255, 214, 10, 0.12), rgba(20, 24, 34, 0.95));border:1px solid rgba(255, 214, 10, 0.35);display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:22px">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
              <span class="tag live" style="background:var(--accent);color:#111">${daysUntil}</span>
              <span class="muted small">${fmtRange(nextFeatured.start, nextFeatured.end)}</span>
            </div>
            <h2 style="margin:4px 0 8px;font-size:32px">${flag(nextFeatured.country)}${esc(cleanName(nextFeatured.name))} ${nextFeatured.year || YEAR}</h2>
            <div class="row">${classTag(nextFeatured.class)}${nextFeatured.stage_race ? `<span class="tag">Por Etapas</span>` : `<span class="tag">Clássica de Um Dia</span>`}</div>
          </div>
          <a class="btn" href="#/prova/${esc(nextFeatured.slug)}/${nextFeatured.year || YEAR}" style="padding:12px 22px;font-size:15px">Ver Prova & Inscritos →</a>
        </div>
      </section>`;
    }

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
          <div>
            <h2>Grandes Voltas & Monumentos</h2>
            <span class="muted small">As provas mais prestigiadas e exigentes da temporada</span>
          </div>
        </div>
        <div class="grid">${bigRaces.map(grandTourCard).join("")}</div>
      </section>`;
    }

    if (next.length > 1) {
      html += `<section class="section">
        <div class="section-head">
          <h2>Próximas Provas</h2>
          <a class="muted" href="#/calendario">Calendário completo →</a>
        </div>
        <div class="grid">${next.slice(1, 9).map(raceCard).join("")}</div>
      </section>`;
    }

    if (done.length) {
      html += `<section class="section">
        <div class="section-head">
          <h2>Últimos Vencedores</h2>
        </div>
        <div class="grid">${done.map(raceCard).join("")}</div>
      </section>`;
    }

    app.innerHTML = html;
    setUpdated(meta);

    const bHero = document.getElementById("btn-spotlight-hero");
    if (bHero) bHero.onclick = openSpotlight;
  }

  function grandTourCard(r) {
    const configs = {
      "giro-d-italia": { border: "#ff4fa3", bg: "rgba(255, 79, 163, 0.08)", jersey: "Maglia Rosa", icon: "🌸" },
      "tour-de-france": { border: "#ffd60a", bg: "rgba(255, 214, 10, 0.08)", jersey: "Maillot Jaune", icon: "🟡" },
      "vuelta-a-espana": { border: "#ff4d4d", bg: "rgba(255, 77, 77, 0.08)", jersey: "La Roja", icon: "🔴" },
      "volta-a-portugal": { border: "#2ecc71", bg: "rgba(46, 204, 113, 0.08)", jersey: "Camisola Amarela", icon: "🇵🇹" }
    };
    const cfg = configs[r.slug] || { border: "var(--line)", bg: "var(--panel)", jersey: "Líder", icon: "🏆" };

    return `<a class="card" href="#/prova/${esc(r.slug)}/${r.year}" style="border-left: 4px solid ${cfg.border}; background: linear-gradient(135deg, ${cfg.bg}, var(--panel));">
      <div class="row" style="justify-content:space-between">
        <span class="date" style="color:${cfg.border}">${fmtRange(r.start, r.end)}</span>
        <span class="tag" style="border-color:${cfg.border};color:${cfg.border}">${cfg.jersey}</span>
      </div>
      <div class="title" style="margin:8px 0">${flag(r.country)}${esc(cleanName(r.name))}</div>
      <div class="row">${classTag(r.class)}<span class="tag">Por Etapas</span></div>
      ${r.winner ? `<div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--line);display:flex;align-items:center;gap:6px;font-size:13px">
        <span style="font-size:16px">${cfg.icon}</span> <span class="muted">Vencedor:</span> <b>${esc(niceName(r.winner.name))}</b>
      </div>` : `<div class="muted small" style="margin-top:10px">Edição ${r.year} por disputar</div>`}
    </a>`;
  }

  function raceCard(r) {
    const st = status(r);
    return `<a class="card" href="#/prova/${esc(r.slug)}/${r.year}">
      <div class="row"><span class="date">${fmtRange(r.start, r.end)}</span>${st === "live" ? `<span class="tag live">A decorrer</span>` : ""}</div>
      <div class="title">${flag(r.country)}${esc(cleanName(r.name))}</div>
      <div class="row">${classTag(r.class)}${r.stage_race ? `<span class="tag">Por etapas</span>` : `<span class="tag">Um dia</span>`}</div>
      ${r.winner ? `<div class="small" style="margin-top:8px">🏆 ${esc(niceName(r.winner.name))}</div>` : ""}</a>`;
  }

  // ------------------------------------------------------------ PÁGINA DA PROVA COM SONDAGEM E INSCRITOS
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
      raceTop = race.startlist.flatMap(t => (t.riders || []).slice(0, 1)).slice(0, 10).map(r => ({ slug: r.rider, name: r.name, team: r.team }));
      pelTitle = "Pelotão à partida";
    }

    let html = `${pelotonHtml(raceTop, { title: pelTitle, compact: true })}<div class="race-head"><div class="bigflag">${flag(race.country)}</div><div><div class="muted">${race.edition ? `${race.edition}.ª edição · ` : ""}${fmtRange(race.start, race.end)}</div>
      <h1>${esc(cleanName(race.name))} ${year}</h1><div class="row" style="display:flex;gap:6px">${classTag(race.class)}${st === "live" ? `<span class="tag live">A decorrer</span>` : st === "done" ? `<span class="tag done">Terminada</span>` : `<span class="tag wt">Em breve</span>`}</div></div>
      <select id="race-year" style="margin-left:auto">${[...years].reverse().map(y => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select></div>`;

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
      const hasResults = race.results && race.results.length;

      html += factsHtml(info) + (today ? liveBox(race.live, "Corrida terminada") : "") + `<div id="profile"></div>`;

      // Sondagem interativa de favoritos (se ainda não tiver terminado)
      if (!hasResults) {
        html += racePollHtml(race, slug, year);
      }

      if (hasResults) {
        html += `<div class="two" style="margin-top:18px"><div><h2>Classificação Final</h2><div id="oneday-res">${classTable(race.results, "stage", 50)}</div></div>
          <div><h2>Subidas e metas</h2><div class="panel">${climbsList(race.analysis || {})}</div>${race.story ? `<div class="section"><h2>Resumo</h2><p>${esc(race.story)}</p></div>` : ""}${videoLink(cleanName(race.name), year)}</div></div>`;
      } else {
        html += `<div class="section" style="margin-top:20px"><div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div><h3 style="margin:0 0 4px">Transmissão e Acompanhamento</h3><span class="muted small">Em direto nos canais habituais (Eurosport / Max / RTP).</span></div>
          <span class="tag wt" style="font-size:12px;padding:6px 12px">📡 Transmissão TV</span></div></div>`;
      }
    }

    if (race.startlist && race.startlist.length) html += startlistHtml(race.startlist);
    html += historyHtml(hist, race.stage_race);
    app.innerHTML = html;
    document.getElementById("race-year").onchange = e => { location.hash = `#/prova/${slug}/${e.target.value}`; };
    
    if (race.stage_race) classificationTabs(document.getElementById("final"), { ...(race.final || {}), stage: undefined });
    else {
      profileChart(document.getElementById("profile"), race);
      if (race.results && race.results.length) {
        wireMore(document.getElementById("oneday-res"), race.results, "stage");
      } else {
        wirePoll(slug, year);
      }
      if ((race.date || race.start) === TODAY) refreshLater(() => { cache.delete(`races/${slug}/${year}.json`); viewRace(slug, year); });
    }

    const ht = document.getElementById("hist-tabs");
    if (ht) {
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
    const f = [["Data", fmtDate(info.date)], ["Distância", info.distance_km && `${info.distance_km} km`], ["Desnível", info.vertical_m && `${info.vertical_m} m`],
      ["Partida", info.departure], ["Chegada", info.arrival], ["Hora", info.start_time && !info.start_time.startsWith("00:00") && info.start_time.slice(0, 5)],
      ["Percurso", PARCOURS[info.parcours_code] || info.parcours], ["Média do vencedor", info.avg_speed ? `${info.avg_speed} km/h` : ""],
      ["Final", info.gradient_final_km != null ? `último km a ${info.gradient_final_km}%` : ""], ["Como ganhou", info.won_how], ["Temperatura", info.avg_temp_c ? `${info.avg_temp_c} °C` : ""]];
    return `<div class="facts">${f.filter(x => x[1]).map(([k, v]) => `<div class="fact"><div class="k">${k}</div><div class="v" style="font-size:${String(v).length > 14 ? 16 : 22}px">${esc(v)}</div></div>`).join("")}</div>`;
  }
  const videoLink = (name, year, stage) => `<p><a class="btn ghost" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${year} ${stage ? `stage ${stage} ` : ""}highlights`)}">▶ Ver resumo em vídeo</a></p>`;

  function startlistHtml(sl) {
    const n = sl.reduce((s, t) => s + t.riders.length, 0), out = sl.reduce((s, t) => s + t.riders.filter(r => r.status).length, 0);
    return `<div class="section"><div class="section-head"><h2>Inscritos / Startlist</h2><span class="muted small">${sl.length} equipas · ${n} ciclistas${out ? ` · ${out} desistências` : ""}</span></div>
      <div class="grid" style="margin-top:14px">${sl.map(t => `<div class="card">
        <div class="row" style="border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:10px"><b>${teamLink(t.team, t.name)}</b></div>
        <div style="display:flex;flex-direction:column;gap:8px">${t.riders.map(r => `
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

  async function viewStage(slug, year, id) {
    if (id === "result") return viewRace(slug, year);
    year = Number(year);
    const isToday = (s) => s && s.date === TODAY;
    const [race, stage] = await Promise.all([get(`races/${slug}/${year}.json`), get(`races/${slug}/${year}/${id}.json`, { fresh: true })]);
    if (!stage) { app.innerHTML = `<div class="empty">Sem dados desta etapa.</div>`; return; }
    const stages = (race && race.stages) || [];
    const i = stages.findIndex(s => s.id === id);
    const prev = stages[i - 1], next = stages[i + 1];
    const live = stage.live || {};
    const stageTop = rowsToRiders((stage.classifications || {}).stage);
    let html = `${pelotonHtml(stageTop, { title: `Etapa ${stage.number ?? ""}`, sub: "chegada", compact: true })}<div class="race-head"><div class="bigflag">${flag(race && race.country)}</div><div>
      <div class="muted">${raceLink(slug, year, `${race ? cleanName(race.name) : slug} ${year}`)} · ${fmtDate(stage.date)}</div>
      <h1>Etapa ${stage.number ?? ""}${stage.type ? ` (${esc(stage.type)})` : ""}</h1><h3 class="muted">${esc(stage.route || "")}</h3></div>
      <div style="margin-left:auto;display:flex;gap:6px">${prev ? `<a class="btn ghost" href="#/etapa/${slug}/${year}/${prev.id}">← ${prev.number ?? ""}</a>` : ""}${next ? `<a class="btn ghost" href="#/etapa/${slug}/${year}/${next.id}">${next.number ?? ""} →</a>` : ""}</div></div>`;
    html += factsHtml(stage.info || {});
    if (isToday(stage)) html += liveBox(live, "Etapa terminada");
    html += `<div class="section"><h2>Perfil</h2><div id="profile"></div></div>
      <div class="two"><div class="section"><h2>Classificações</h2><div id="cls"></div></div>
      <div class="section"><h2>Subidas e metas volantes</h2><div class="panel">${climbsList(stage.analysis || {})}</div>
      ${stage.story ? `<div class="section"><h2>Resumo</h2><p>${esc(stage.story)}</p></div>` : ""}${videoLink(race ? cleanName(race.name) : slug, year, stage.number)}</div></div>
      ${intermediateBlock(stage.intermediate)}`;
    app.innerHTML = html;
    profileChart(document.getElementById("profile"), stage);
    classificationTabs(document.getElementById("cls"), stage.classifications || {});
    if (isToday(stage)) refreshLater(() => viewStage(slug, year, id));
  }

  function liveBox(live, doneLabel) {
    if (!live || !live.status) return "";
    const st = live.status;
    return `<div class="panel live-box section"><div class="row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="tag live">Direto</span>
      <b>${esc(st.status === "finished" ? doneLabel : LIVE_STATUS[st.status] || st.status || "")}</b>${st.km_to_go ? `<span>faltam <b>${st.km_to_go} km</b></span>` : ""}
      <span class="muted small" style="margin-left:auto">atualiza sozinho</span></div>
      ${live.timeline && live.timeline.length ? `<ul class="timeline" style="margin-top:10px">${live.timeline.slice(0, 40).map(e => `<li><span class="km">${e.mark && e.mark !== "0" ? esc(e.mark) : ""}</span><span>${esc(e.text)}</span></li>`).join("")}</ul>` : ""}</div>`;
  }
  function wireMore(el, rows, kind) {
    if (el) el.onclick = e => { const b = e.target.closest(".more-btn"); if (b) el.innerHTML = classTable(rows, kind); };
  }

  // ------------------------------------------------------------ pelotão
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
    q.oninput = render;
    document.getElementById("rf").onclick = e => { const b = e.target.closest("button"); if (!b) return; mode = b.dataset.k; document.querySelectorAll("#rf button").forEach(x => x.classList.toggle("on", x === b)); render(); };
    render();
    q.focus();
  }

  const SPEC = { gc: "Geral", climber: "Montanha", tt: "Contrarrelógio", sprint: "Sprint", oneday: "Clássicas", hills: "Colinas" };
  async function viewRider(slug) {
    const r = await get(`riders/${slug}.json`);
    if (!r) { app.innerHTML = `<div class="empty">Ainda não temos a ficha deste ciclista. <a href="${PCS}rider/${esc(slug)}" target="_blank" rel="noopener">Ver no ProCyclingStats</a></div>`; return; }
    const age = r.birthdate ? Math.floor((Date.now() - new Date(r.birthdate)) / 31557600000) : null;
    const maxSpec = Math.max(1, ...Object.values(r.specialties || {}));
    const team = (r.teams || []).find(t => String(t.season).includes(String(YEAR))) || (r.teams || [])[0];
    let html = `<div class="race-head">${avatar(slug, r.name, "big")}<div>
      <div class="muted">${flag(r.nation)}${esc(r.nationality || "")}${team ? ` · ${teamLink(team.team, team.name)}` : ""}</div><h1>${esc(r.name)}</h1>
      <div class="row" style="display:flex;gap:8px;align-items:center">
        ${starBtn(slug, r.name)}
        <a class="btn ghost small" href="#/duelo/${esc(slug)}" style="padding:6px 12px;font-size:13px">⚔️ Duelo</a>
        <a class="muted small" target="_blank" rel="noopener" href="${PCS}rider/${esc(slug)}">ProCyclingStats ↗</a>
      </div></div></div>
      <div class="facts">${[["Idade", age], ["Nascimento", r.birthdate && fmtDate(r.birthdate) + " " + r.birthdate.slice(0, 4)], ["Local", r.birthplace], ["Peso", r.weight_kg && `${r.weight_kg} kg`], ["Altura", r.height_m && `${r.height_m} m`],
        ...Object.entries(r.stats || {}).map(([k, v]) => [{ wins: "Vitórias", grand_tours: "Grandes voltas", classics: "Clássicas", championships: "Campeonatos" }[k] || k, v.value])]
        .filter(x => x[1] != null && x[1] !== "").map(([k, v]) => `<div class="fact"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>`;
    if ((r.injuries || []).length) html += `<div class="panel" style="border-color:#ff4d4d88">🩹 ${r.injuries.map(esc).join("<br>")}</div>`;
    html += `<div class="two"><div>`;
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
    if (Object.keys(r.specialties || {}).length) html += `<div class="section"><h2>Especialidades</h2><div class="panel bars">${Object.entries(r.specialties).map(([k, v]) => `<div class="bar"><span>${SPEC[k] || k}</span><div class="track"><div class="fill" style="width:${(v / maxSpec) * 100}%"></div></div><span class="r small muted">${v}</span></div>`).join("")}</div></div>`;
    if ((r.top_results || []).length) html += `<div class="section"><h2>Palmarés</h2><div class="panel">${r.top_results.map(t => `<div style="padding:5px 0;border-bottom:1px solid #20252f"><b class="muted">${esc(t.count || "")}</b> ${esc(t.text)}</div>`).join("")}</div></div>`;
    if ((r.teams || []).length) html += `<div class="section"><h2>Equipas</h2><div class="panel">${r.teams.map(t => `<div style="padding:4px 0"><span class="muted">${esc(t.season)}</span> ${teamLink(t.team, t.name)} <span class="tag">${esc(t.level || "")}</span></div>`).join("")}</div></div>`;
    if ((r.pcs_ranking_by_season || []).length) html += `<div class="section"><h2>Ranking PCS por época</h2><div class="panel">${r.pcs_ranking_by_season.map(s => `<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${s.season}</span><span class="muted">${s.points ?? ""} pts</span><b>${s.rank ?? ""}.º</b></div>`).join("")}</div></div>`;
    html += `</div></div>`;
    app.innerHTML = html;
  }

  async function viewTeams(year) {
    year = Number(year) || YEAR;
    const idx = await get(`teams/index-${year}.json`);
    const teams = (idx && idx.teams) || [];
    const groups = [["WT", "WorldTeams"], ["PRT", "ProTeams"], ["CT", "Continentais"]];
    let html = `${await topPeloton({ compact: true })}<div class="race-head"><div><h1>Equipas ${year}</h1><div class="muted">${teams.length} equipas</div></div></div>`;
    for (const [lvl, label] of groups) {
      const list = teams.filter(t => (t.level || "").toUpperCase() === lvl).sort((a, b) => a.name.localeCompare(b.name));
      if (list.length) html += `<div class="section"><h2>${label}</h2><div class="grid small-cards">${list.map(t => `<a class="card team-card" href="#/equipa/${esc(t.slug)}">${shirt(t.slug, "shirt big")}<div><b>${flag(t.nation)}${esc(t.name)}</b><div class="muted small">${t.riders} ciclistas</div></div></a>`).join("")}</div></div>`;
    }
    const rest = teams.filter(t => !groups.some(([l]) => (t.level || "").toUpperCase() === l));
    if (rest.length) html += `<div class="section"><h2>Outras</h2><div class="grid small-cards">${rest.map(t => `<a class="card team-card" href="#/equipa/${esc(t.slug)}">${shirt(t.slug, "shirt big")}<div><b>${flag(t.nation)}${esc(t.name)}</b></div></a>`).join("")}</div></div>`;
    app.innerHTML = teams.length ? html : `<div class="empty">Sem equipas para ${year}.</div>`;
  }

  async function viewTeam(slug) {
    const t = await get(`teams/${slug}.json`);
    if (!t) { app.innerHTML = `<div class="empty">Ainda não temos esta equipa. <a href="${PCS}team/${esc(slug)}" target="_blank" rel="noopener">Ver no ProCyclingStats</a></div>`; return; }
    const k = t.kpi || {};
    let html = `<div class="race-head">${shirt(slug, "shirt huge")}<div><div class="muted">${flag(t.nation)}${esc(t.info && t.info.license_country || "")} · época ${t.season || ""}</div><h1>${esc(t.name)}</h1>${t.level ? `<span class="tag wt">${esc(t.level)}</span>` : ""}</div></div>
      <div class="facts">${[["Vitórias", k.victories], ["Ranking UCI", k.uci && `${k.uci}.º`], ["Ranking PCS", k.pcs && `${k.pcs}.º`], ["Ciclistas", (t.riders || []).length], ["Bicicleta", t.gear && t.gear.Bike]]
        .filter(x => x[1]).map(([a, b]) => `<div class="fact"><div class="k">${a}</div><div class="v">${esc(b)}</div></div>`).join("")}</div>
      <div class="section"><h2>Plantel</h2><div class="grid small-cards">${(t.riders || []).map(r => `<a class="card rider-card" href="#/ciclista/${esc(r.rider)}">${avatar(r.rider, r.name)}<div><b>${flag(r.nation)}${esc(niceName(r.name))}</b><div class="muted small">${r.age ? `${r.age} anos` : ""}</div></div></a>`).join("")}</div></div>`;
    if ((t.victories || []).length) html += `<div class="section"><h2>Vitórias</h2><div class="tbl-wrap"><table class="tbl"><tbody>${t.victories.map(v => `<tr><td>${v.race ? raceLink(v.race, v.year, v.label) : esc(v.label)}</td><td>${classTag(v.class)}</td><td>${v.rider ? riderLink(v.rider, v.rider_name) : ""}</td></tr>`).join("")}</tbody></table></div></div>`;
    if ((t.staff || []).length) html += `<div class="section"><h2>Staff</h2><div class="panel small">${t.staff.map(s => `<div>${esc(s.name)} <span class="muted">· ${esc(s.role)}</span></div>`).join("")}</div></div>`;
    app.innerHTML = html;
  }

  async function viewLegends() {
    const idx = await get("riders/index.json");
    const known = new Set(((idx && idx.riders) || []).map(r => r.slug));
    const L = window.SOBRERODAS_LEGENDS || { mundo: [], portugal: [] };
    const card = l => `<div class="card legend-card"><div class="rider-card">${avatar(l.slug, l.name, "legend")}<div><div class="yrs">${esc(l.years)}${l.active ? " · em atividade" : ""}</div>
      <div class="title">${flag(l.nation)}${esc(l.name)}</div>${l.nick ? `<div class="muted small">“${esc(l.nick)}”</div>` : ""}</div></div>
      <ul>${l.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <div style="margin-top:10px">${known.has(l.slug) ? `<a class="btn" href="#/ciclista/${esc(l.slug)}">Ficha completa</a>` : `<a class="btn ghost" target="_blank" rel="noopener" href="${PCS}rider/${esc(l.slug)}">Palmarés ↗</a>`}</div></div>`;
    const legendRiders = [...L.mundo.slice(0, 7), ...L.portugal.slice(0, 3)].map(l => ({ slug: l.slug, name: l.name }));
    app.innerHTML = `<section class="hero"><div class="kicker">Lendas</div><h1>Os maiores de sempre</h1><p class="muted">Quem escreveu a história do ciclismo, no mundo e em Portugal.</p>
      ${pelotonHtml(legendRiders, { link: r => known.has(r.slug) })}</section>
      <div class="section"><h2>🇵🇹 Lendas portuguesas</h2><div class="grid">${L.portugal.map(card).join("")}</div></div>
      <div class="section"><h2>🌍 Lendas mundiais</h2><div class="grid">${L.mundo.map(card).join("")}</div></div>`;
  }

  async function viewFavorites() {
    const list = favs.all();
    if (!list.length) { app.innerHTML = `${await topPeloton({ compact: true })}<div class="race-head"><h1>Favoritos</h1></div><div class="empty">Ainda não segues nenhum ciclista. Abre a ficha de um ciclista e carrega em “☆ Seguir”.<br><br><a class="btn" href="#/ciclistas">Procurar ciclistas</a></div>`; return; }
    const riders = await Promise.all(list.map(f => get(`riders/${f.slug}.json`)));
    app.innerHTML = `${pelotonHtml(list.map((f, i) => ({ slug: f.slug, name: (riders[i] && riders[i].name) || f.name, team: riders[i] && ((riders[i].teams || [])[0] || {}).team })), { title: "Os teus ciclistas", compact: true })}<div class="race-head"><h1>Favoritos</h1></div><div class="grid">${list.map((f, i) => {
      const r = riders[i] || {};
      const last = (r.season_results || [])[0];
      const lastStage = last && last.stages && last.stages[0];
      return `<div class="card"><a class="rider-card" href="#/ciclista/${esc(f.slug)}">${avatar(f.slug, r.name || f.name)}<div><b>${flag(r.nation)}${esc(r.name || f.name)}</b><div class="muted small">${esc(((r.teams || [])[0] || {}).name || "")}</div></div></a>
        ${last ? `<div class="small" style="margin-top:10px"><span class="muted">Último:</span> ${esc(last.label || "")}${(lastStage || last).result ? ` — <b>${esc((lastStage || last).result)}</b>` : ""}${lastStage ? ` <span class="muted">(${esc(lastStage.label)})</span>` : ""}</div>` : ""}
        <div style="margin-top:10px">${starBtn(f.slug, f.name)}</div></div>`;
    }).join("")}</div>`;
  }

  function setUpdated(meta) {
    const el = document.getElementById("updated");
    if (el && meta && meta.updated) el.textContent = `atualizado ${new Date(meta.updated).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}`;
  }

  // ------------------------------------------------------------ ROTAS
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
    renderTicker(); // Mantém o Ticker ativo em todas as páginas
    const path = decodeURIComponent(location.hash.replace(/^#\/?/, "")).replace(/\/$/, "");
    for (const [re, fn, nav] of routes) {
      const m = path.match(re);
      if (!m) continue;
      document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.nav === nav));
      app.innerHTML = `<div class="loading">A carregar…</div>`;
      try { await fn(...m.slice(1)); } catch (e) { console.error(e); app.innerHTML = `<div class="empty">Ocorreu um erro a mostrar esta página.</div>`; }
      window.scrollTo(0, 0);
      return;
    }
    location.hash = "#/";
  }
  window.addEventListener("hashchange", route);
  route();
  get("meta.json").then(setUpdated);
})();
