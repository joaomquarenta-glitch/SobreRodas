"""Fotos dos ciclistas, guardadas em data/photos/{slug}.jpg.

O PCS bloqueia imagens pedidas a partir de outros sites (só as serve com Referer do
próprio PCS), por isso o site não pode ligar diretamente às fotos de lá. Aqui
descarregam-se, reduzem-se e guardam-se junto dos dados. Quem não tem foto no PCS
(e as lendas antigas) é procurado na Wikidata, pela propriedade P1663 (ID do
ProCyclingStats) e a imagem P18 do Wikimedia Commons.
"""
import io
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from curl_cffi import requests

from .fetch import BASE, FetchError

WIDTH = 240          # px; o site mostra no máximo 140 px
RETRY_DAYS = 30      # quem não tem foto em lado nenhum volta a ser procurado ao fim de 30 dias
UA = {"User-Agent": "SobreRodas/1.0 (https://github.com/joaomquarenta-glitch/SobreRodas)"}
SPARQL = "https://query.wikidata.org/sparql"


def _today():
    return datetime.now(timezone.utc).date().isoformat()


def _save_jpeg(data, dest):
    from PIL import Image
    im = Image.open(io.BytesIO(data))
    im = im.convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)


def legend_slugs(root):
    f = Path(root).parent / "site" / "legends.js"
    return re.findall(r'slug:\s*"([^"]+)"', f.read_text()) if f.exists() else []


def wikidata_images(slugs, log):
    """{slug_pcs: nome_do_ficheiro_no_commons} para os slugs com imagem na Wikidata."""
    out = {}
    for i in range(0, len(slugs), 150):
        chunk = slugs[i:i + 150]
        values = " ".join('"%s"' % s.replace('"', "") for s in chunk)
        q = f"SELECT ?id ?img WHERE {{ VALUES ?id {{ {values} }} ?x wdt:P1663 ?id; wdt:P18 ?img. }}"
        try:
            r = requests.get(SPARQL, params={"query": q, "format": "json"}, headers=UA, timeout=60)
            r.raise_for_status()
            for b in r.json()["results"]["bindings"]:
                out.setdefault(b["id"]["value"], b["img"]["value"].rsplit("/", 1)[-1])
        except Exception as e:  # a Wikidata é um extra; se falhar, fica para a próxima
            log("wikidata falhou", e)
            return None
    return out


def sync_photos(fx, root, log, budget_until=None, limit=None):
    """Descarrega as fotos que faltam ou mudaram. Devolve o número de fotos novas."""
    import time
    root = Path(root)
    pdir = root / "photos"
    idx_path = pdir / "index.json"
    idx = json.loads(idx_path.read_text()) if idx_path.exists() else {}
    riders = {}
    for f in sorted((root / "riders").glob("*.json")):
        if f.name == "index.json":
            continue
        d = json.loads(f.read_text())
        riders[f.stem] = d.get("photo")
    done = 0

    def out_of_time():
        return (budget_until and time.time() > budget_until) or (limit and done >= limit)

    # 1) PCS
    for slug, url in riders.items():
        if out_of_time():
            break
        if not url or (idx.get(slug, {}).get("src") == url and (pdir / f"{slug}.jpg").exists()):
            continue
        try:
            _save_jpeg(fx.get_bytes(url, referer=f"{BASE}rider/{quote(slug)}"), pdir / f"{slug}.jpg")
            idx[slug] = {"src": url, "from": "pcs", "date": _today()}
            done += 1
        except (FetchError, OSError) as e:
            log("foto falhou", slug, e)
        if done and done % 100 == 0:
            idx_path.write_text(json.dumps(idx, separators=(",", ":"), sort_keys=True))
            log(f"fotos: {done}")

    # 2) Wikidata, para quem não tem foto do PCS e para as lendas
    def wanted(slug):
        e = idx.get(slug)
        if not e:
            return True
        if e.get("from") == "none":
            return (datetime.fromisoformat(_today()) - datetime.fromisoformat(e["date"])).days >= RETRY_DAYS
        return False

    missing = [s for s, u in riders.items() if not u and wanted(s)]
    missing += [s for s in legend_slugs(root) if s not in riders and wanted(s)]
    if missing and not out_of_time():
        found = wikidata_images(missing, log)
        for slug in (missing if found is not None else []):
            if out_of_time():
                break
            name = found.get(slug)
            if not name:
                idx[slug] = {"from": "none", "date": _today()}
                continue
            src = f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(name)}?width={WIDTH * 2}"
            try:
                r = requests.get(src, headers=UA, timeout=60, allow_redirects=True)
                if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
                    raise OSError(f"HTTP {r.status_code}")
                _save_jpeg(r.content, pdir / f"{slug}.jpg")
                idx[slug] = {"src": src, "from": "wikimedia", "file": name, "date": _today()}
                done += 1
                time.sleep(0.5)
            except Exception as e:
                log("foto commons falhou", slug, e)

    pdir.mkdir(parents=True, exist_ok=True)
    idx_path.write_text(json.dumps(idx, separators=(",", ":"), sort_keys=True))
    have = sum(1 for e in idx.values() if e.get("from") != "none")
    log(f"fotos: {done} novas; {have} no total; {len(riders) - sum(1 for s in riders if idx.get(s, {}).get('from') not in (None, 'none'))} ciclistas sem foto")
    return done


SHIRT_HEIGHT = 120


def _save_png(data, dest):
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    if im.height > SHIRT_HEIGHT:
        im = im.resize((round(im.width * SHIRT_HEIGHT / im.height), SHIRT_HEIGHT), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)


def team_shirts(fx, root, log, year):
    """{slug_da_equipa: url_da_camisola} das startlists guardadas e da lista de equipas do PCS."""
    out = {}
    for f in sorted(Path(root).glob("races/*/*.json")):
        try:
            d = json.loads(f.read_text())
        except ValueError:
            continue
        for t in (d.get("startlist") or []) if isinstance(d, dict) else []:
            if t.get("team") and t.get("shirt"):
                out[t["team"]] = t["shirt"]
    for y in {year, year + 1}:
        try:
            h = fx.get(f"teams.php?year={y}&filter=Filter&s=worldtour", use_cache=False)
        except FetchError as e:
            log("lista de equipas falhou", y, e)
            continue
        for slug, src in re.findall(r'href="team/([^"]+)"><img src="(images/shirts/[^"]+)"', h):
            out[slug] = BASE + src
    return out


def sync_shirts(fx, root, log, budget_until=None):
    """Camisolas das equipas em data/shirts/{slug}.png (o símbolo com que se reconhecem as equipas)."""
    import time
    root = Path(root)
    sdir = root / "shirts"
    idx_path = sdir / "index.json"
    idx = json.loads(idx_path.read_text()) if idx_path.exists() else {}
    shirts = team_shirts(fx, root, log, datetime.now(timezone.utc).year)
    done = 0
    for slug, url in sorted(shirts.items()):
        if budget_until and time.time() > budget_until:
            break
        if idx.get(slug) == url and (sdir / f"{slug}.png").exists():
            continue
        try:
            _save_png(fx.get_bytes(url, referer=f"{BASE}team/{quote(slug)}"), sdir / f"{slug}.png")
            idx[slug] = url
            done += 1
        except (FetchError, OSError) as e:
            log("camisola falhou", slug, e)
    sdir.mkdir(parents=True, exist_ok=True)
    idx_path.write_text(json.dumps(idx, separators=(",", ":"), sort_keys=True))
    log(f"camisolas: {done} novas; {len(idx)} no total")
    return done
