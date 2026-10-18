"""Orquestração: decide o que buscar ao PCS e grava JSON em data/.

Comandos (python -m collector <comando>):
  calendar [--year Y]          calendário das provas seguidas
  race SLUG YEAR [--force]     uma edição completa (etapas, classificações, perfis, startlist)
  daily                        atualização diária: calendário, provas a decorrer/recentes, histórico, equipas, ciclistas
  live                         etapas de hoje: resultados, classificações e cronologia ao minuto
  backfill [--from Y]          histórico de edições anteriores
  rider SLUG / team SLUG       uma ficha
  photos                       fotos dos ciclistas (PCS e Wikidata) e camisolas das equipas
"""
import argparse
import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from . import parse as P
from . import profile as PR
from .photos import sync_photos, sync_shirts
from .fetch import FetchError, Fetcher

ROOT = Path(os.environ.get("SOBRERODAS_DATA", Path(__file__).resolve().parent.parent / "data"))
SCOPE = json.loads((Path(__file__).parent / "scope.json").read_text())
# classificações intermédias completas só para a classificação geral; nas restantes guarda-se o top
TRIM_PAST_STAGE = {"points": 30, "kom": 30, "youth": 30, "youth_day": 15, "teams_day": 10}


def log(*a):
    print(datetime.now(timezone.utc).strftime("%H:%M:%S"), *a, flush=True)


def today():
    return datetime.now(timezone.utc).date()


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


# ---------------------------------------------------------------- armazenamento

def path(*parts):
    return ROOT.joinpath(*[str(p) for p in parts])


def load(p, default=None):
    try:
        return json.loads(Path(p).read_text())
    except (FileNotFoundError, ValueError):
        return default


def save(p, data):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    if p.exists() and p.read_text() == text:
        return False
    tmp = p.with_suffix(".tmp")
    tmp.write_text(text)
    tmp.replace(p)
    return True


def age_days(iso):
    if not iso:
        return 1e9
    try:
        t = datetime.fromisoformat(iso)
    except ValueError:
        return 1e9
    return (datetime.now(timezone.utc) - t).total_seconds() / 86400


# ---------------------------------------------------------------- âmbito

def in_scope(entry):
    name, cls, slug = entry.get("name", ""), entry.get("class", ""), entry["slug"]
    if slug in SCOPE["extra_slugs"] or any(re.search(p, name) for p in SCOPE.get("extra_name_patterns", [])):
        return True
    if any(re.search(p, name) for p in SCOPE["exclude_name_patterns"]):
        return False
    if cls in SCOPE["classes"]:
        return True
    if cls in SCOPE["championship_classes"]:
        return bool(re.search(r"\bME\b", name)) or "World Championships" in name and not re.search(r"\b[MW][UJE]\b", name)
    return False


def calendar(fx, year):
    races = {}
    for q in SCOPE["calendar_queries"]:
        try:
            rows = P.parse_calendar(fx.get(f"races.php?year={year}&{q}&filter=Filter"), year)
        except FetchError as e:
            log("calendário falhou", q, e)
            continue
        for r in rows:
            if in_scope(r):
                races.setdefault((r["slug"], r["year"]), r)
    out = sorted(races.values(), key=lambda r: (r.get("start") or "", r["slug"]))
    if out:
        save(path("calendar", f"{year}.json"), {"year": year, "updated": now_iso(), "races": out})
    log(f"calendário {year}: {len(out)} provas")
    return out


def calendar_entries(year):
    return (load(path("calendar", f"{year}.json")) or {}).get("races", [])


# ---------------------------------------------------------------- provas

def base_href(slug, year, stage_race):
    return f"race/{slug}-{year}-{'gc' if stage_race else 'result'}"


def stage_date(year, dm):
    m = re.match(r"(\d\d)/(\d\d)", dm or "")
    return f"{year}-{m.group(1)}-{m.group(2)}" if m else None


def trim(classifications, limits):
    return {k: (v[:limits[k]] if k in limits else v) for k, v in classifications.items()}


def fetch_profile(fx, href):
    try:
        return P.parse_live(fx.get(href + "/live/live"))
    except FetchError as e:
        log("  perfil indisponível", href, e)
        return {}


def build_stage(fx, slug, year, stage, old, want_profile, live=False):
    href = f"race/{slug}-{year}-{stage['id']}"
    page = P.parse_result_page(fx.get(href))
    data = {
        "race": slug, "year": year, "id": stage["id"], "number": stage.get("number"),
        "type": stage.get("type"), "route": stage.get("route"), "date": page.get("info", {}).get("date") or stage.get("date"),
        "info": page.get("info", {}), "classifications": page.get("classifications", {}),
        "intermediate": page.get("intermediate", []), "climbs_list": page.get("climbs", []),
        "story": page.get("story"), "profile_images": page.get("profile_images", []),
    }
    lv = {}
    if want_profile or live:
        lv = fetch_profile(fx, href)
    profile = lv.get("profile") or (old or {}).get("profile")
    if profile:
        data["profile"] = profile
    data["analysis"] = PR.analyse(profile, data["intermediate"], data["info"].get("distance_km"))
    if live and lv:
        data["live"] = {k: lv[k] for k in ("status", "timeline") if k in lv}
    elif old and old.get("live"):
        data["live"] = old["live"]
    data["profile_checked"] = bool(want_profile or (old or {}).get("profile_checked"))
    data["has_results"] = bool(data["classifications"].get("stage"))
    data["updated"] = now_iso()
    return P.compact(data)


def stage_summary(st):
    info = st.get("info", {})
    winner = (st.get("classifications", {}).get("stage") or [{}])[0]
    leader = (st.get("classifications", {}).get("gc") or [{}])[0]
    return P.compact({
        "id": st["id"], "number": st.get("number"), "type": st.get("type"), "route": st.get("route"),
        "date": st.get("date"), "departure": info.get("departure"), "arrival": info.get("arrival"),
        "distance_km": info.get("distance_km"), "vertical_m": info.get("vertical_m"),
        "parcours_code": info.get("parcours_code"), "parcours": info.get("parcours"),
        "profile_score": info.get("profile_score"), "start_time": info.get("start_time"),
        "climbs": len(st.get("analysis", {}).get("climbs", [])), "sprints": len(st.get("analysis", {}).get("sprints", [])),
        "has_results": st.get("has_results"),
        "winner": P.compact({k: winner.get(k) for k in ("rider", "name", "nation", "team", "team_name")}) if st.get("has_results") else None,
        "leader": P.compact({k: leader.get(k) for k in ("rider", "name", "nation")}) if st.get("has_results") and leader else None,
    })


def update_race(fx, slug, year, entry=None, force=False, full_stages=True, live=False):
    """Atualiza uma edição. `full_stages=False` guarda só a classificação final (histórico leve)."""
    entry = entry or {}
    rfile = path("races", slug, f"{year}.json")
    race = load(rfile, {}) or {}
    stage_race = entry.get("stage_race", race.get("stage_race"))
    if stage_race is None:
        stage_race = True
    td = today().isoformat()
    href = base_href(slug, year, stage_race)
    try:
        main = P.parse_result_page(fx.get(href))
    except FetchError as e:
        if stage_race and "404" in str(e):
            stage_race, href = False, base_href(slug, year, False)
            main = P.parse_result_page(fx.get(href))
        else:
            raise
    if stage_race and (not main.get("info") or "one day race" in (main.get("page_title") or "").lower()):
        stage_race, href = False, base_href(slug, year, False)
        main = P.parse_result_page(fx.get(href))
    race.update(P.compact({
        "slug": slug, "year": year, "name": main.get("name") or entry.get("name"), "edition": main.get("edition"),
        "class": main.get("class") or entry.get("class"), "country": main.get("country") or entry.get("country"),
        "stage_race": stage_race, "start": entry.get("start") or race.get("start"), "end": entry.get("end") or race.get("end"),
        "pcs": href,
    }))
    started = (race.get("start") or td) <= td
    if stage_race:
        stages = P.parse_stages(fx.get(href + "/stages"))
        for s in stages:
            s["date"] = stage_date(year, s.get("date_dm"))
        summaries = []
        old_summaries = {s["id"]: s for s in race.get("stages", [])}
        if full_stages:
            profile_ok = year >= 2026
            for s in stages:
                sfile = path("races", slug, year, f"{s['id']}.json")
                old = load(sfile)
                sd = s.get("date") or td
                is_today = sd == td
                recent = (today() - timedelta(days=2)).isoformat() <= sd < td
                need = (force or old is None or is_today
                        or (sd < td and not old.get("has_results"))
                        or (recent and age_days(old.get("updated")) > 0.5)  # correções do PCS
                        or (sd > td and age_days(old.get("updated")) > 3))
                if not need:
                    summaries.append(stage_summary(old))
                    continue
                want_profile = profile_ok and not (old or {}).get("profile")
                try:
                    st = build_stage(fx, slug, year, s, old, want_profile, live=live and is_today)
                except FetchError as e:
                    log("  etapa falhou", slug, year, s["id"], e)
                    if old:
                        summaries.append(stage_summary(old))
                    continue
                if want_profile and not st.get("profile") and s is stages[0] and year < today().year:
                    profile_ok = False  # edições antigas não têm perfil detalhado
                if (s.get("date") or td) < td:
                    st["classifications"] = trim(st["classifications"], TRIM_PAST_STAGE) if year < today().year else st["classifications"]
                save(sfile, st)
                summaries.append(stage_summary(st))
            race["stages"] = summaries
        else:
            race["stages"] = [P.compact({**old_summaries.get(s["id"], {}), **{k: s.get(k) for k in ("id", "number", "type", "route", "date", "parcours_code")},
                                         "winner": s.get("winner"), "leader": s.get("leader")}) for s in stages]
        if stages:
            race["start"] = race.get("start") or stages[0].get("date")
            race["end"] = race.get("end") or stages[-1].get("date")
        # classificações gerais atuais: a página -gc mostra a última etapa; se ainda não foi corrida,
        # usamos a última etapa com resultados
        cls, after = main.get("classifications", {}), race["stages"][-1]["id"] if race.get("stages") else None
        if not cls.get("gc"):
            done = [s for s in race.get("stages", []) if s.get("has_results")]
            st = load(path("races", slug, year, f"{done[-1]['id']}.json")) if done else None
            cls, after = ((st or {}).get("classifications", {}), done[-1]["id"]) if done else ({}, None)
        if started and cls.get("gc"):
            race["final"] = {k: cls[k] for k in ("gc", "points", "kom", "youth", "teams") if k in cls}
            race["standings_after"] = after
            race["finished"] = bool(race.get("stages")) and after == race["stages"][-1]["id"] and (race.get("end") or td) <= td
    else:
        race["date"] = main.get("info", {}).get("date") or entry.get("start")
        race["start"] = race.get("start") or race["date"]
        race["end"] = race.get("end") or race["date"]
        race["info"] = main.get("info", {})
        race["results"] = main.get("classifications", {}).get("stage", [])
        race["intermediate"] = main.get("intermediate", [])
        race["climbs_list"] = main.get("climbs", [])
        race["story"] = main.get("story")
        race["profile_images"] = main.get("profile_images", [])
        if full_stages and year >= 2026 and (not race.get("profile") or live):
            lv = fetch_profile(fx, href)
            if lv.get("profile"):
                race["profile"] = lv["profile"]
            if live and lv:
                race["live"] = {k: lv[k] for k in ("status", "timeline") if k in lv}
        race["analysis"] = PR.analyse(race.get("profile"), race["intermediate"], race["info"].get("distance_km"))
    # startlist: até ao fim da prova e uma vez depois
    if full_stages and (not race.get("startlist") or (race.get("end") or td) >= (today() - timedelta(days=3)).isoformat()):
        if (race.get("start") or td) <= (today() + timedelta(days=21)).isoformat():
            try:
                race["startlist"] = P.parse_startlist(fx.get(href + "/startlist"))
            except FetchError as e:
                log("  startlist falhou", e)
    race["complete"] = bool(race.get("end") and race["end"] < (today() - timedelta(days=2)).isoformat()
                            and (not stage_race or not full_stages or all(s.get("has_results") for s in race.get("stages", []))))
    race["updated"] = now_iso()
    save(rfile, P.compact(race))
    log(f"prova {slug} {year}: ok ({fx.count} pedidos até agora)")
    return race


# ---------------------------------------------------------------- histórico, ciclistas, equipas

HISTORY_TYPES = {"gc": 4, "points": 5, "kom": 7, "youth": 6}


def update_history(fx, slug, year, stage_race):
    href = base_href(slug, year, stage_race)
    text = fx.get(href + "/history/winners")
    hist = {"race": slug, "updated": now_iso(), "gc" if stage_race else "result": P.parse_history(text)}
    if stage_race:
        m = re.search(r'name="id" value="(\d+)"', text)
        if m:
            for key, t in HISTORY_TYPES.items():
                if key == "gc":
                    continue
                try:
                    hist[key] = P.parse_history(fx.get(f"race.php?id={m.group(1)}&p=history&s=winners&type={t}&filter=Filter"))
                except FetchError as e:
                    log("  histórico", key, e)
    save(path("races", slug, "history.json"), P.compact(hist))
    log(f"histórico {slug}: ok")


def update_rider(fx, slug):
    data = P.parse_rider(fx.get(f"rider/{slug}"))
    data["slug"] = slug
    data["updated"] = now_iso()
    save(path("riders", f"{slug}.json"), data)
    return data


def update_team(fx, slug):
    data = P.parse_team(fx.get(f"team/{slug}"))
    data["slug"] = slug
    m = re.search(r"-(\d{4})$", slug)
    data["season"] = int(m.group(1)) if m else None
    data["updated"] = now_iso()
    save(path("teams", f"{slug}.json"), data)
    return data


def rebuild_indexes():
    riders = []
    for f in sorted(path("riders").glob("*.json")):
        if f.name == "index.json":
            continue
        r = load(f) or {}
        team = (r.get("teams") or [{}])
        cur = next((t for t in team if str(today().year) in t.get("season", "")), team[0] if team else {})
        rk = next((x for x in r.get("pcs_ranking_by_season") or [] if x.get("season") == today().year), {})
        riders.append(P.compact({"slug": r.get("slug"), "name": r.get("name"), "nation": r.get("nation"),
                                 "birthdate": r.get("birthdate"), "photo": r.get("photo"),
                                 "team": cur.get("team"), "team_name": cur.get("name"),
                                 "rank": rk.get("rank"), "points": rk.get("points")}))
    if riders:
        save(path("riders", "index.json"), {"updated": now_iso(), "riders": riders})
    teams = {}
    for f in sorted(path("teams").glob("*.json")):
        if f.name.startswith("index"):
            continue
        t = load(f) or {}
        teams.setdefault(str(t.get("season")), []).append(P.compact({
            "slug": t.get("slug"), "name": t.get("name"), "level": t.get("level") or t.get("info", {}).get("team_status"),
            "nation": t.get("nation"), "riders": len(t.get("riders", []))}))
    for season, lst in teams.items():
        save(path("teams", f"index-{season}.json"), {"season": season, "teams": lst})
    races = []
    for d in sorted(path("races").glob("*")):
        if not d.is_dir():
            continue
        years = sorted(int(f.stem) for f in d.glob("*.json") if f.stem.isdigit())
        if not years:
            continue
        last = load(d / f"{years[-1]}.json") or {}
        races.append(P.compact({"slug": d.name, "name": last.get("name"), "country": last.get("country"),
                                "class": last.get("class"), "stage_race": last.get("stage_race"), "years": years,
                                "history": (d / "history.json").exists()}))
    save(path("races", "index.json"), {"updated": now_iso(), "races": races})


def startlist_people(year):
    riders, teams = set(), set()
    for f in path("races").glob(f"*/{year}.json"):
        r = load(f) or {}
        for t in r.get("startlist", []):
            if t.get("team"):
                teams.add(t["team"])
            for x in t.get("riders", []):
                riders.add(x["rider"])
    return riders, teams


def refresh_people(fx, year, max_riders, max_teams, rider_days=10, team_days=14):
    riders, teams = startlist_people(year)
    stale_t = [t for t in sorted(teams) if age_days((load(path("teams", f"{t}.json")) or {}).get("updated")) > team_days]
    for t in stale_t[:max_teams]:
        try:
            for r in update_team(fx, t).get("riders", []):
                riders.add(r["rider"])
        except FetchError as e:
            log("equipa falhou", t, e)
    stale_r = sorted(riders, key=lambda s: age_days((load(path("riders", f"{s}.json")) or {}).get("updated")), reverse=True)
    stale_r = [s for s in stale_r if age_days((load(path("riders", f"{s}.json")) or {}).get("updated")) > rider_days]
    for s in stale_r[:max_riders]:
        try:
            update_rider(fx, s)
        except FetchError as e:
            log("ciclista falhou", s, e)
    log(f"equipas: {min(len(stale_t), max_teams)}/{len(stale_t)} atualizadas; ciclistas: {min(len(stale_r), max_riders)}/{len(stale_r)}")


# ---------------------------------------------------------------- comandos

def cmd_daily(fx, args):
    t = today()
    years = [t.year] + ([t.year + 1] if t.month >= 10 else [])
    entries = []
    for y in years:
        entries += calendar(fx, y)
    budget_until = time.time() + args.minutes * 60
    soon, recent = (t + timedelta(days=10)).isoformat(), (t - timedelta(days=3)).isoformat()
    # 1) a decorrer, próximas e recentes; 2) edições terminadas que ainda não temos completas
    active = [e for e in entries if (e.get("start") or "9999") <= soon and (e.get("end") or e.get("start") or "") >= recent]
    backlog = [e for e in entries if (e.get("end") or "9999") < recent and not (load(path("races", e["slug"], f"{e['year']}.json")) or {}).get("complete")]
    for e in active + backlog:
        if time.time() > budget_until and e in backlog:
            log("tempo esgotado; o resto fica para a próxima execução")
            break
        try:
            update_race(fx, e["slug"], e["year"], e)
        except FetchError as err:
            log("prova falhou", e["slug"], err)
    # histórico: em falta, ou edição deste ano terminada depois da última atualização
    for e in entries:
        if e["year"] != t.year or time.time() > budget_until:
            continue
        h = load(path("races", e["slug"], "history.json"))
        if h is None or ((e.get("end") or "9999") < t.isoformat() and (h.get("updated") or "") < (e.get("end") or "")):
            try:
                update_history(fx, e["slug"], e["year"], e.get("stage_race", True))
            except FetchError as err:
                log("histórico falhou", e["slug"], err)
    if time.time() < budget_until:
        refresh_people(fx, t.year, args.max_riders, args.max_teams)
    rebuild_indexes()
    # fotos novas ou mudadas (no máximo 10 minutos; o resto fica para o dia seguinte)
    sync_photos(fx, ROOT, log, budget_until=time.time() + 600)
    sync_shirts(fx, ROOT, log, budget_until=time.time() + 300)
    write_meta(fx)


def todays_stages():
    td = today().isoformat()
    out = []
    for e in calendar_entries(today().year):
        if not ((e.get("start") or "9") <= td <= (e.get("end") or e.get("start") or "")):
            continue
        out.append(e)
    return out


def cmd_live(fx, args):
    races = todays_stages()
    td = today().isoformat()
    if not races:
        log("sem etapas hoje")
        save(path("live.json"), {"updated": now_iso(), "date": td, "races": []})
        return
    live = []
    for e in races:
        try:
            r = update_race(fx, e["slug"], e["year"], e, live=True)
        except FetchError as err:
            log("prova falhou", e["slug"], err)
            continue
        if r.get("stage_race"):
            st_sum = next((s for s in r.get("stages", []) if s.get("date") == td), None)
            if not st_sum:
                continue
            st = load(path("races", e["slug"], e["year"], f"{st_sum['id']}.json")) or {}
        else:
            st, st_sum = r, {"id": "result"}
        top = (st.get("classifications", {}).get("stage") if r.get("stage_race") else r.get("results")) or []
        live.append(P.compact({
            "race": e["slug"], "year": e["year"], "name": r.get("name"), "stage": st_sum.get("id"),
            "number": st_sum.get("number"), "route": st_sum.get("route"),
            "status": (st.get("live") or {}).get("status"),
            "last_events": ((st.get("live") or {}).get("timeline") or [])[:5],
            "top10": [P.compact({k: x.get(k) for k in ("rank", "rider", "name", "nation", "team_name", "time")}) for x in top[:10]],
            "leader": P.compact({k: v for k, v in ((r.get("final") or {}).get("gc") or [{}])[0].items() if k in ("rider", "name", "nation", "team_name")}),
        }))
    save(path("live.json"), {"updated": now_iso(), "date": td, "races": live})
    write_meta(fx)


def cmd_backfill(fx, args):
    deadline = time.time() + args.minutes * 60
    full = set(SCOPE["history_full_stages"])
    for year in range(today().year - 1, args.since - 1, -1):
        entries = calendar_entries(year) or calendar(fx, year)
        for e in entries:
            if args.races and e["slug"] not in args.races:
                continue
            if time.time() > deadline:
                log("tempo esgotado")
                rebuild_indexes()
                return
            r = load(path("races", e["slug"], f"{year}.json"))
            if r and r.get("complete"):
                continue
            try:
                update_race(fx, e["slug"], year, e, full_stages=(e["slug"] in full and year >= SCOPE["history_stages_from"]))
            except FetchError as err:
                log("prova falhou", e["slug"], year, err)
    for e in calendar_entries(today().year):
        if time.time() > deadline:
            break
        if not path("races", e["slug"], "history.json").exists():
            try:
                update_history(fx, e["slug"], e["year"], e.get("stage_race", True))
            except FetchError as err:
                log("histórico falhou", e["slug"], err)
    rebuild_indexes()


def write_meta(fx):
    m = load(path("meta.json"), {}) or {}
    m.update({"updated": now_iso(), "source": "ProCyclingStats (procyclingstats.com)", "last_run_requests": fx.count})
    save(path("meta.json"), m)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="collector", description="Recolector de dados do SobreRodas")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("calendar")
    c.add_argument("--year", type=int, default=today().year)
    r = sub.add_parser("race")
    r.add_argument("slug")
    r.add_argument("year", type=int)
    r.add_argument("--force", action="store_true")
    r.add_argument("--light", action="store_true", help="só classificação final, sem detalhe por etapa")
    d = sub.add_parser("daily")
    d.add_argument("--minutes", type=float, default=40, help="tempo máximo para recuperar atraso")
    d.add_argument("--max-riders", type=int, default=250)
    d.add_argument("--max-teams", type=int, default=40)
    sub.add_parser("live")
    b = sub.add_parser("backfill")
    b.add_argument("--since", type=int, default=SCOPE["history_from"])
    b.add_argument("--minutes", type=float, default=300)
    b.add_argument("--races", nargs="*")
    rd = sub.add_parser("rider")
    rd.add_argument("slug")
    tm = sub.add_parser("team")
    tm.add_argument("slug")
    sub.add_parser("indexes")
    ph = sub.add_parser("photos")
    ph.add_argument("--minutes", type=float, default=120)
    ph.add_argument("--limit", type=int)
    args = ap.parse_args(argv)
    fx = Fetcher()
    if args.cmd == "calendar":
        calendar(fx, args.year)
    elif args.cmd == "race":
        entry = next((e for e in calendar_entries(args.year) if e["slug"] == args.slug), None)
        update_race(fx, args.slug, args.year, entry, force=args.force, full_stages=not args.light)
    elif args.cmd == "daily":
        cmd_daily(fx, args)
    elif args.cmd == "live":
        cmd_live(fx, args)
    elif args.cmd == "backfill":
        cmd_backfill(fx, args)
    elif args.cmd == "rider":
        update_rider(fx, args.slug)
    elif args.cmd == "team":
        update_team(fx, args.slug)
    elif args.cmd == "indexes":
        rebuild_indexes()
    elif args.cmd == "photos":
        sync_photos(fx, ROOT, log, budget_until=time.time() + args.minutes * 60, limit=args.limit)
        sync_shirts(fx, ROOT, log, budget_until=time.time() + args.minutes * 60)
    log(f"feito: {fx.count} pedidos")


if __name__ == "__main__":
    sys.exit(main())
