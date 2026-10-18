"""Parsers das páginas do ProCyclingStats (esquema de URLs de 2026).

Cada função recebe HTML e devolve dicts/listas simples, prontos para JSON.
"""
import json
import re
from datetime import date

from selectolax.lexbor import LexborHTMLParser

PCS = "https://www.procyclingstats.com/"
RACE_HREF = re.compile(r"^/?race/(.+?)-(\d{4})(?:-(.+))?$")
MONTHS = {m: i + 1 for i, m in enumerate(
    "january february march april may june july august september october november december".split())}


def html(text):
    return LexborHTMLParser(text)


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def num(s):
    s = clean(s).replace(",", ".").lstrip("+")
    m = re.match(r"^-?\d+(\.\d+)?$", s)
    if not m:
        return None
    return float(s) if "." in s else int(s)


def tail(href, prefix):
    href = (href or "").lstrip("/").split("?")[0]
    return href[len(prefix):] if href.startswith(prefix) else None


def flag(node):
    f = node.css_first("span.flag") if node else None
    if not f:
        return None
    parts = [c for c in (f.attributes.get("class") or "").split() if c not in ("flag", "w32") and not c.startswith("c2")]
    return parts[0] if parts else None


def img_url(src):
    if not src:
        return None
    return src if src.startswith("http") else PCS + src.lstrip("/")


def split_race_href(href):
    """'race/tour-de-france-2025-stage-12' -> ('tour-de-france', 2025, 'stage-12')."""
    m = RACE_HREF.match((href or "").split("?")[0])
    if not m:
        return None
    return m.group(1), int(m.group(2)), m.group(3)


def compact(d):
    return {k: v for k, v in d.items() if v not in (None, "", [], {})}


def time_to_s(s):
    s = clean(s).lstrip("+").strip()
    if not re.match(r"^\d+(:\d{1,2}){0,2}$", s):
        return None
    secs = 0
    for p in s.split(":"):
        secs = secs * 60 + int(p)
    return secs


# ---------------------------------------------------------------- calendário

def parse_calendar(text, year):
    h = html(text)
    out = []
    for tr in h.css("table tbody tr"):
        tds = tr.css("td")
        if len(tds) < 5:
            continue
        a = tds[2].css_first("a")
        if not a:
            continue
        sp = split_race_href(a.attributes.get("href"))
        if not sp:
            continue
        slug, yr, kind = sp
        dates = clean(tds[0].text()).split("-")

        def iso(d):
            d = d.strip()
            if not re.match(r"^\d\d\.\d\d$", d):
                return None
            dd, mm = d.split(".")
            return f"{year}-{mm}-{dd}"

        start = iso(dates[0])
        end = iso(dates[1]) if len(dates) > 1 else start
        w = tds[3].css_first("a")
        out.append(compact({
            "slug": slug,
            "year": yr,
            "name": clean(a.text()),
            "country": flag(tds[2]),
            "class": clean(tds[4].text()),
            "start": start,
            "end": end,
            "stage_race": kind != "result",
            "pcs": a.attributes.get("href"),
            "winner": compact({"slug": tail(w.attributes.get("href"), "rider/"), "name": clean(w.text())}) if w else None,
        }))
    return out


# ---------------------------------------------------------------- página de resultados

INFO_KEYS = {
    "Date": "date", "Start time": "start_time", "Avg. speed winner": "avg_speed",
    "Classification": "class", "Race category": "category", "Distance": "distance_km",
    "Points scales": "points_scale", "Parcours type": "parcours", "Profile score": "profile_score",
    "Gradient final km": "gradient_final_km", "Vertical meters": "vertical_m", "Departure": "departure",
    "Arrival": "arrival", "Race ranking": "race_ranking", "Startlist quality score": "startlist_quality",
    "Won how": "won_how", "Avg. temperature": "avg_temp_c", "Timelimit": "time_limit",
}


def parse_date_text(s):
    m = re.match(r"(\d{1,2})\w*\s+([A-Za-z]+)\s+(\d{4})", clean(s))
    if not m or m.group(2).lower() not in MONTHS:
        return clean(s) or None
    return date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1))).isoformat()


def parse_keyvalues(container):
    """Lê blocos 'div.bold Chave: div valor ... <br>' em pares chave->lista de textos."""
    pairs, key, vals, icons = {}, None, [], []
    for node in container.iter(include_text=False):
        cls = node.attributes.get("class") or ""
        if node.tag == "br":
            if key:
                pairs[key] = (vals, icons)
            key, vals, icons = None, [], []
        elif node.tag == "div" and "bold" in cls.split():
            if key:
                pairs[key] = (vals, icons)
            key, vals, icons = clean(node.text()).rstrip(":").strip(), [], []
        elif key:
            t = clean(node.text())
            if t:
                vals.append(t)
            ic = node.css_first("span.icon")
            if ic:
                icons.append(ic.attributes.get("class") or "")
    if key:
        pairs[key] = (vals, icons)
    return pairs


def parse_info(h):
    box = None
    for d in h.css("div.bold"):
        if clean(d.text()).startswith("Date"):
            box = d.parent
            break
    if not box:
        return {}
    info = {}
    for k, (vals, icons) in parse_keyvalues(box).items():
        key = INFO_KEYS.get(k, re.sub(r"\W+", "_", k.lower()).strip("_"))
        v = " ".join(vals)
        if key == "date":
            info[key] = parse_date_text(v)
        elif key == "parcours":
            info["parcours"] = v or None
            m = re.search(r"\bp(\d)\b", " ".join(icons))
            if m:
                info["parcours_code"] = int(m.group(1))
        elif key == "profile_score":
            info[key] = num(vals[0]) if vals else None
            f = re.search(r"final:\s*(\d+)", v)
            if f:
                info["profile_score_final"] = int(f.group(1))
        elif key in ("distance_km", "avg_speed", "vertical_m", "race_ranking", "startlist_quality", "avg_temp_c"):
            info[key] = num(vals[0]) if vals else None
        elif key == "gradient_final_km":
            info[key] = num(v.rstrip("%"))
        else:
            info[key] = v or None
    return compact(info)


def parse_title(h):
    h1 = h.css_first(".page-title h1")
    out = {}
    if h1:
        full = clean(h1.text())
        m = re.match(r"(\d{4})\s*»\s*(\d+)\w*\s+(.*?)\s*\(([^)]+)\)\s*$", full)
        if m:
            out = {"year": int(m.group(1)), "edition": int(m.group(2)), "name": m.group(3), "class": m.group(4)}
        else:
            out = {"name": full}
    out["country"] = flag(h.css_first(".page-title"))
    t = h.css_first("title")
    if t:
        out["page_title"] = clean(t.text())
    return compact(out)


COLS = {
    "Rnk": "rank", "#": "rank", "Age": "age", "Specialty": None, "BIB": "bib",
    "Prev.": "prev", "Prev": "prev", "▼▲": "delta", "UCI": "uci_pts", "PCS": "pcs_pts",
    "Pnt": "points", "points": "points", "Today": "today", "Class": "team_class",
    "Bonis": "bonus", "rnk": "uci_rank", "Time": "time",
}


def parse_table(table):
    heads = [clean(th.text()) for th in table.css("thead th")]
    keys, seen_lag = [], 0
    for hd in heads:
        if hd == "Timelag":
            keys.append(None if seen_lag == 0 and "GC" in heads else "time")
            seen_lag += 1
        elif hd == "GC":
            keys.append("gc_rank")
        elif hd in ("Rider", "ridername"):
            keys.append("rider")
        elif hd == "Team":
            keys.append("team")
        elif hd == "Time won/lost":
            keys.append("secs")
        elif hd == "":
            keys.append("bonus")
        elif hd == "H2H":
            keys.append(None)
        else:
            keys.append(COLS[hd] if hd in COLS else re.sub(r"\W+", "_", hd.lower()).strip("_") or None)
    rows = []
    for tr in table.css("tbody tr"):
        tds = tr.css("td")
        row = {}
        for k, td in zip(keys, tds):
            if not k:
                continue
            if k == "rider":
                a = td.css_first('a[href^="rider/"]')
                if a:
                    row["rider"] = tail(a.attributes.get("href"), "rider/")
                    row["name"] = clean(a.text())
                    row["nation"] = flag(td)
                continue
            if k == "team":
                a = td.css_first('a[href^="team/"]')
                if a:
                    if "rider" in keys:
                        row["team"] = tail(a.attributes.get("href"), "team/")
                        row["team_name"] = clean(a.text())
                    else:  # classificação por equipas
                        row["team"] = tail(a.attributes.get("href"), "team/")
                        row["name"] = clean(a.text())
                        row["nation"] = flag(td)
                continue
            if k == "secs":
                a = td.css_first("a[data-s1]")
                s = int(a.attributes.get("data-s1") or 0) if a else 0
                if s > 0:
                    row["secs"] = s
                continue
            t = clean(td.text())
            if k in ("rank", "bib", "age", "gc_rank", "prev", "uci_pts", "pcs_pts", "points", "uci_rank"):
                v = num(t)
                row[k] = v if v is not None else (t or None)
            elif k == "time":
                row[k] = t.replace(",,", "").strip() or None
            elif k == "bonus":
                row[k] = num(t.replace("″", "").replace('"', "")) if t else None
            elif k == "delta":
                row[k] = num(t.replace("▲", "").replace("▼", "-")) if t not in ("-", "") else 0
            else:
                row[k] = t or None
        row = compact(row)
        if row:
            rows.append(row)
    return rows


GROUP_KEYS = {"Stage": "stage", "Result": "stage", "GC": "gc", "Points": "points", "KOM": "kom",
              "Youth": "youth", "Teams": "teams"}
KOM_RE = re.compile(r"KOM Sprint\s*\(([^)]*)\)\s*(.*?)\s*\(([\d.]+)\s*km\)", re.I)
SPRINT_RE = re.compile(r"^Sprint\s*(?:\d+\s*)?(?:\|\s*(.*?))?\s*\(([\d.]+)\s*km\)", re.I)


def classify_heading(title):
    m = KOM_RE.search(title)
    if m:
        return {"type": "kom", "category": m.group(1), "name": m.group(2) or None, "km": num(m.group(3))}
    m = SPRINT_RE.search(title)
    if m:
        return {"type": "sprint", "name": m.group(1) or title.split("(")[0].strip(), "km": num(m.group(2))}
    low = title.lower()
    if "points at finish" in low:
        return {"type": "finish"}
    if "combative" in low:
        return {"type": "combative"}
    if "youth day" in low:
        return {"type": "youth_day"}
    if "team day" in low:
        return {"type": "teams_day"}
    return {"type": "other"}


def parse_results(h):
    """Todas as classificações de uma página de resultados (etapa, GC, pontos, montanha, juventude, equipas)
    e as classificações do dia (metas volantes, prémios de montanha, combatividade)."""
    tops, subs = {}, {}
    for a in h.css("a.resultNav"):
        nav, parent, label = a.attributes.get("data-navid"), a.attributes.get("data-parentid"), clean(a.text())
        if "data-filters" in a.attributes:
            tops[nav] = label
        else:
            subs[nav] = (parent, label)
    classifications, intermediate = {}, []
    for rc in h.css("div.resultCont"):
        nav = rc.attributes.get("data-navid")
        if nav in subs:
            group, sub = tops.get(subs[nav][0], "Stage"), subs[nav][1]
        else:
            group, sub = tops.get(nav, "Stage"), "General"
        base = GROUP_KEYS.get(group, re.sub(r"\W+", "_", group.lower()))
        heading = None
        for node in rc.iter():
            if node.tag in ("h3", "h4"):
                heading = clean(node.text())
            elif node.tag == "table":
                rows = parse_table(node)
                if sub == "General" and not heading:
                    classifications.setdefault(base, rows)
                elif heading:
                    item = classify_heading(heading)
                    if item["type"] in ("youth_day", "teams_day") or (item["type"] == "other" and sub == "General"):
                        classifications.setdefault(item["type"] if item["type"] != "other" else base, rows)
                    else:
                        item.update(title=heading, results=rows)
                        if not any(i["title"] == heading for i in intermediate):
                            intermediate.append(compact(item))
                else:
                    classifications.setdefault(base + "_day", rows)
                heading = None
    return classifications, intermediate


def sidebar_sections(h):
    out = {}
    for h4 in h.css("h4"):
        out.setdefault(clean(h4.text()), h4)
    return out


def parse_result_page(text):
    """Página de etapa / GC / prova de um dia."""
    h = html(text)
    page = parse_title(h)
    page["info"] = parse_info(h)
    cls, inter = parse_results(h)
    page["classifications"] = cls
    page["intermediate"] = inter
    sec = sidebar_sections(h)
    if "Story of the day" in sec:
        story = sec["Story of the day"].next
        while story is not None and story.tag != "div":
            story = story.next
        if story is not None:
            page["story"] = clean(story.text())
    if "Climbs" in sec:
        ul = sec["Climbs"].next
        while ul is not None and ul.tag != "ul":
            ul = ul.next
        if ul is not None:
            page["climbs"] = [{"slug": tail(a.attributes.get("href"), "location/"), "name": clean(a.text())}
                              for a in ul.css("a")]
    if "Race profile" in sec:
        ul = sec["Race profile"].next
        while ul is not None and ul.tag != "ul":
            ul = ul.next
        if ul is not None:
            page["profile_images"] = [img_url(i.attributes.get("src")) for i in ul.css("img")]
    return compact(page)


# ---------------------------------------------------------------- lista de etapas

def parse_stages(text):
    h = html(text)
    tables = h.css("table")
    out = []
    if not tables:
        return out
    for tr in tables[0].css("tbody tr"):
        tds = tr.css("td")
        if len(tds) < 3:
            continue
        a = tds[2].css_first("a")
        if not a:
            continue
        label = clean(a.text())
        sp = split_race_href(a.attributes.get("href"))
        m = re.match(r"(Stage\s*(\d+)|Prologue)\s*(?:\(([^)]+)\))?\s*\|?\s*(.*)$", label)
        ic = tds[1].css_first("span.icon")
        pc = re.search(r"\bp(\d)\b", ic.attributes.get("class") or "") if ic else None
        winner = tds[3].css_first('a[href^="rider/"]') if len(tds) > 3 else None
        leader = tds[4].css_first('a[href^="rider/"]') if len(tds) > 4 else None
        out.append(compact({
            "id": sp[2] if sp else None,
            "number": int(m.group(2)) if m and m.group(2) else (0 if m else None),
            "type": m.group(3) if m else None,
            "route": m.group(4) if m else label,
            "date_dm": clean(tds[0].text()),
            "parcours_code": int(pc.group(1)) if pc else None,
            "winner": compact({"slug": tail(winner.attributes.get("href"), "rider/"), "name": clean(winner.text())}) if winner else None,
            "leader": compact({"slug": tail(leader.attributes.get("href"), "rider/"), "name": clean(leader.text())}) if leader else None,
        }))
    return out


# ---------------------------------------------------------------- startlist

def parse_startlist(text):
    h = html(text)
    teams = []
    for li in h.css("ul.startlist_v4 > li"):
        ta = li.css_first("a.team")
        if not ta:
            continue
        name = clean(ta.text())
        m = re.match(r"(.*)\s+\(([^)]+)\)$", name)
        shirt = li.css_first(".shirtCont img")
        riders = []
        for r in li.css(".ridersCont ul li"):
            a = r.css_first('a[href^="rider/"]')
            if not a:
                continue
            bib = r.css_first(".bib")
            extra = clean(r.text().replace(a.text(), "").replace(bib.text() if bib else "", ""))
            st = re.search(r"\b(DNF|DNS|OTL|DSQ|DF)\b\s*#?(\d+)?", extra)
            riders.append(compact({
                "bib": num(bib.text()) if bib else None,
                "rider": tail(a.attributes.get("href"), "rider/"),
                "name": clean(a.text()),
                "nation": flag(r),
                "status": st.group(1) if st else None,
                "status_stage": int(st.group(2)) if st and st.group(2) else None,
            }))
        teams.append(compact({
            "team": tail(ta.attributes.get("href"), "team/"),
            "name": m.group(1) if m else name,
            "level": m.group(2) if m else None,
            "shirt": img_url(shirt.attributes.get("src")) if shirt else None,
            "riders": riders,
        }))
    return teams


# ---------------------------------------------------------------- histórico (pódios por edição)

def parse_history(text):
    h = html(text)
    out = []
    for li in h.css("ul.palmares > li"):
        ya = li.css_first(".year a")
        if not ya:
            continue
        sp = split_race_href(ya.attributes.get("href"))
        podium = []
        for rc in li.css(".riderCont"):
            a = rc.css_first('a[href^="rider/"]')
            if a:
                podium.append(compact({"slug": tail(a.attributes.get("href"), "rider/"),
                                       "name": clean(a.text()), "nation": flag(rc)}))
        out.append(compact({"year": int(clean(ya.text())) if clean(ya.text()).isdigit() else None,
                            "pcs": ya.attributes.get("href"), "kind": sp[2] if sp else None, "podium": podium}))
    return out


# ---------------------------------------------------------------- perfil altimétrico (página live)

def parse_live(text):
    """Perfil altimétrico detalhado, estado da corrida e cronologia (página .../live/live)."""
    h = html(text)
    out = {}
    m = re.search(r"var profile = (\{.*?\});?\s*[\r\n]", text)
    if m:
        try:
            p = json.loads(m.group(1).rstrip(";"))
        except ValueError:
            p = None
        if p and p.get("profile") and p.get("max_ele") is not None:
            out["profile"] = decode_profile(p)
    kpi = {}
    for li in h.css("ul.ls5b-kpi li"):
        sp, dv = li.css_first("span"), li.css_first("div")
        if sp and dv:
            kpi[re.sub(r"\W+", "_", clean(sp.text()).lower()).strip("_")] = dv.attributes.get("data-value") or clean(dv.text())
    if kpi:
        out["status"] = compact({
            "status": kpi.get("status"), "km_to_go": num(kpi.get("km_to_go", "")),
            "km_done": num(kpi.get("km_done", "")), "race_time": kpi.get("racetime"),
            "avg_speed": num(kpi.get("avg", "")), "start": kpi.get("start"),
        })
    events = []
    for li in h.css("ul.timeline7 li.event"):
        b, t = li.css_first(".bol"), li.css_first(".tekst")
        if t:
            events.append(compact({"seq": num(li.attributes.get("data-seqnr") or ""),
                                   "mark": clean(b.text()) if b else None, "text": clean(t.text())}))
    if events:
        out["timeline"] = events
    return out


def decode_profile(p, max_points=600):
    """Converte o polígono do PCS (x% da distância, y% a partir do topo) em [km, altitude]."""
    lo, hi, length = p["min_ele"], p["max_ele"], (p.get("lengte") or 0) / 1000
    pts = []
    for chunk in p["profile"].split(","):
        parts = chunk.split()
        if len(parts) != 2:
            continue
        try:
            x, y = float(parts[0].rstrip("%")), float(parts[1].rstrip("%"))
        except ValueError:
            continue
        pts.append((x, y))
    # o polígono fecha nos cantos (0 0%) e (100% 0%): retirar
    pts = [pt for i, pt in enumerate(pts) if not ((i == 0 or i == len(pts) - 1) and pt[1] == 0)]
    series = [[round(x / 100 * length, 2), round(hi - (y / 100) * (hi - lo))] for x, y in pts]
    if len(series) > max_points:
        step = len(series) / max_points
        series = [series[int(i * step)] for i in range(max_points)] + [series[-1]]
    return {"distance_km": round(length, 2), "min_m": lo, "max_m": hi, "points": series}


# ---------------------------------------------------------------- ciclista

def parse_rider(text):
    h = html(text)
    out = {}
    title = h.css_first(".page-title h1")
    if title:
        out["name"] = clean(title.text())
    box = None
    for d in h.css("div.bold"):
        if clean(d.text()).startswith("Name"):
            box = d.parent
            break
    if box:
        kv = parse_keyvalues(box)
        if "Name" in kv:
            out["full_name"] = " ".join(kv["Name"][0])
        if "Date of birth" in kv:
            dob = " ".join(kv["Date of birth"][0])
            m = re.match(r"(\d+)\w*\s+([A-Za-z]+)\s+(\d{4})", dob)
            if m and m.group(2).lower() in MONTHS:
                out["birthdate"] = date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1))).isoformat()
        if "Nationality" in kv:
            out["nationality"] = " ".join(kv["Nationality"][0])
        if "Weight" in kv:
            out["weight_kg"] = num(kv["Weight"][0][0]) if kv["Weight"][0] else None
        if "Height" in kv:
            out["height_m"] = num(kv["Height"][0][0]) if kv["Height"][0] else None
        if "Place of birth" in kv:
            out["birthplace"] = " ".join(kv["Place of birth"][0])
        out["nation"] = flag(box)
    img = h.css_first('img[src*="images/riders/"]')
    if img:
        out["photo"] = img_url(img.attributes.get("src"))
    spec = {}
    for li in h.css("ul.pps li"):
        t, v = li.css_first(".xtitle"), li.css_first(".xvalue")
        if t and v:
            spec[clean(t.text()).lower()] = num(v.text())
    out["specialties"] = spec
    links = []
    for ul in h.css("ul.list.horizontal"):
        for a in ul.css('a[target="_blank"]'):
            href = a.attributes.get("href")
            if href and href.startswith("http") and href not in links:
                links.append(href)
    out["links"] = links
    teams = []
    for li in h.css("ul.rdr-teams2 li.main"):
        s, n = li.css_first(".season"), li.css_first(".name a")
        if s and n:
            lvl = re.search(r"\(([^)]+)\)", clean(li.css_first(".name").text()))
            teams.append(compact({"season": clean(s.text()), "team": tail(n.attributes.get("href"), "team/"),
                                  "name": clean(n.text()), "level": lvl.group(1) if lvl else None}))
    out["teams"] = teams
    tops = []
    for li in h.css("ul.topresults li"):
        nrs, races = li.css_first(".nrs"), li.css_first(".races")
        if races:
            a = races.css_first("a")
            tops.append(compact({"count": clean(nrs.text()) if nrs else None, "text": clean(races.text()),
                                 "race": split_race_href(a.attributes.get("href"))[0] if a and split_race_href(a.attributes.get("href")) else None}))
    out["top_results"] = tops
    kpis = {}
    for li in h.css("ul.rider-kpi li"):
        k, t = li.css_first(".kpi"), li.css_first(".title")
        if k and t:
            kpis[re.sub(r"\W+", "_", clean(t.text()).lower()).strip("_")] = compact({
                "value": num(k.text()), "info": clean(li.css_first(".info").text()) if li.css_first(".info") else None})
    out["stats"] = kpis
    injuries = [t for t in (clean(d.text()) for d in h.css("div.red")) if t]
    out["injuries"] = injuries
    for t in h.css("table"):
        heads = [clean(th.text()) for th in t.css("thead th")]
        if heads[:2] == ["", "Points"]:
            out["pcs_ranking_by_season"] = [compact({"season": num(r.css("td")[0].text()),
                                                     "points": num(r.css_first(".title").text()) if r.css_first(".title") else None,
                                                     "rank": num(r.css("td")[2].text())}) for r in t.css("tbody tr") if len(r.css("td")) >= 3]
        elif "Race" in heads and "Distance" in heads:
            out["season_results"] = parse_rider_results(t)
    out["badges"] = [clean(li.text()) for li in h.css("ul.badges li")]
    return compact(out)


def parse_rider_results(table):
    out, current = [], None
    for tr in table.css("tbody tr"):
        tds = tr.css("td")
        if len(tds) < 5:
            continue
        a = tds[4].css_first("a")
        sp = split_race_href(a.attributes.get("href")) if a else None
        if a:
            for junk in a.css(".imob"):
                junk.decompose()
        cls = tr.attributes.get("class") or ""
        item = compact({
            "date": clean(tds[0].text()), "result": clean(tds[1].text()) or None,
            "race": sp[0] if sp else None, "year": sp[1] if sp else None, "part": sp[2] if sp else None,
            "label": clean(a.text()) if a else None,
            "distance_km": num(tds[6].text()) if len(tds) > 6 else None,
            "pcs_pts": num(tds[7].text()) if len(tds) > 7 else None,
            "uci_pts": num(tds[8].text()) if len(tds) > 8 else None,
            "jersey": (tr.css_first(".svg_shirt").attributes.get("data-color") if tr.css_first(".svg_shirt") else None),
        })
        if "main" in cls.split():
            current = item
            item["stages"] = []
            out.append(item)
        elif "stage" in cls.split() and current is not None and current.get("race") == item.get("race"):
            current["stages"].append(item)
        else:
            current = None
            out.append(item)
    return out


# ---------------------------------------------------------------- equipa

def parse_team(text):
    h = html(text)
    out = {}
    title = h.css_first(".page-title h1")
    if title:
        m = re.match(r"(.*?)\s*\(([^)]+)\)$", clean(title.text()))
        out["name"] = m.group(1) if m else clean(title.text())
        if m:
            out["level"] = m.group(2)
    out["nation"] = flag(h.css_first(".page-title"))
    info = {}
    for li in h.css("ul.infolist li"):
        t, v = li.css_first(".title"), li.css_first(".value")
        if t and v:
            info[re.sub(r"\W+", "_", clean(t.text()).lower()).strip("_")] = clean(v.text())
    out["info"] = info
    kpi = {}
    for li in h.css("ul.teamkpi li"):
        t, v = li.css_first(".title"), li.css_first(".value")
        if t and v:
            kpi[re.sub(r"\W+", "_", clean(t.text()).lower()).strip("_")] = num(v.text())
    out["kpi"] = kpi
    photos = {}
    for li in h.css("ul.photos li"):
        a, i = li.css_first('a[href^="rider/"]'), li.css_first("img")
        if a and i:
            photos[tail(a.attributes.get("href"), "rider/")] = img_url(i.attributes.get("src"))
    riders = []
    for li in h.css("ul.teamlist li"):
        a = li.css_first('a[href^="rider/"]')
        if not a:
            continue
        slug = tail(a.attributes.get("href"), "rider/")
        divs = li.css("div.w10")
        riders.append(compact({"rider": slug, "name": clean(a.text()), "nation": flag(li),
                               "age": num(divs[1].text()) if len(divs) > 1 else None,
                               "since": clean(li.css_first(".fs10").text()) if li.css_first(".fs10") else None,
                               "photo": photos.get(slug)}))
    out["riders"] = riders
    for t in h.css("table"):
        heads = [clean(th.text()) for th in t.css("thead th")]
        if heads == ["Name", "Functions"]:
            out["staff"] = [compact({"name": clean(r.css("td")[0].text()), "role": clean(r.css("td")[1].text())})
                            for r in t.css("tbody tr") if len(r.css("td")) == 2]
        elif heads == ["", ""]:
            out["gear"] = {clean(r.css("td")[0].text()): clean(r.css("td")[1].text())
                           for r in t.css("tbody tr") if len(r.css("td")) == 2}
        elif heads[:2] == ["#", "Race"] and "Winner" in heads:
            wins = []
            for r in t.css("tbody tr"):
                tds = r.css("td")
                a = tds[1].css_first("a")
                w = tds[3].css_first("a")
                sp = split_race_href(a.attributes.get("href")) if a else None
                wins.append(compact({"race": sp[0] if sp else None, "year": sp[1] if sp else None,
                                     "part": sp[2] if sp else None, "label": clean(a.text()) if a else None,
                                     "class": clean(tds[2].text()),
                                     "rider": tail(w.attributes.get("href"), "rider/") if w else None,
                                     "rider_name": clean(w.text()) if w else None}))
            out["victories"] = wins
    return compact(out)
