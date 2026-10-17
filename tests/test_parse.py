"""Testes dos parsers com páginas reais do PCS guardadas em tests/fixtures (outubro de 2026)."""
import gzip
from pathlib import Path

from collector import parse as P
from collector import profile as PR

FIX = Path(__file__).parent / "fixtures"


def page(name):
    return gzip.decompress((FIX / f"{name}.html.gz").read_bytes()).decode()


def test_calendar():
    races = P.parse_calendar(page("cal"), 2026)
    assert len(races) == 36
    tdu = races[0]
    assert tdu["slug"] == "tour-down-under" and tdu["start"] == "2026-01-20" and tdu["end"] == "2026-01-25"
    assert tdu["stage_race"] and tdu["class"] == "2.UWT" and tdu["country"] == "au"


def test_stage_page_all_classifications():
    s = P.parse_result_page(page("s12"))
    assert s["name"] == "Tour de France" and s["year"] == 2025
    info = s["info"]
    assert info["date"] == "2025-07-17" and info["distance_km"] == 180.6 and info["vertical_m"] == 3794
    assert info["departure"] == "Auch" and info["arrival"] == "Hautacam" and info["parcours_code"] == 5
    c = s["classifications"]
    for key in ("stage", "gc", "points", "kom", "youth", "teams", "youth_day", "teams_day"):
        assert c[key], key
    assert c["stage"][0]["rider"] == "tadej-pogacar" and c["stage"][0]["secs"] == 15679
    assert c["points"][0]["rider"] == "jonathan-milan" and c["points"][0]["points"] == 231
    assert c["teams"][0]["team"] == "team-visma-lease-a-bike-2025"
    koms = [i for i in s["intermediate"] if i["type"] == "kom"]
    assert [k["category"] for k in koms] == ["4", "1", "2", "HC"]
    assert koms[-1]["name"] == "Hautacam" and koms[-1]["km"] == 180.6
    sprint = next(i for i in s["intermediate"] if i["type"] == "sprint")
    assert sprint["name"] == "Bénéjacq" and sprint["results"][0]["rider"] == "laurenz-rex"
    assert [c["slug"] for c in s["climbs"]][-1] == "hautacam"


def test_one_day_race():
    o = P.parse_result_page(page("one"))
    assert o["info"]["distance_km"] == 298
    assert o["classifications"]["stage"][0]["rider"] == "tadej-pogacar"


def test_stages_list():
    st = P.parse_stages(page("tdf26st"))
    assert len(st) == 21 and st[0]["id"] == "stage-1" and st[0]["type"] == "TTT"
    assert st[2]["route"] == "Granollers - Les Angles" and st[2]["winner"]["slug"] == "tadej-pogacar"


def test_startlist_with_abandons():
    sl = P.parse_startlist(page("start"))
    assert len(sl) == 23 and sum(len(t["riders"]) for t in sl) == 184
    almeida = next(r for t in sl for r in t["riders"] if r["rider"] == "joao-almeida")
    assert almeida["status"] == "DNF" and almeida["status_stage"] == 9


def test_history():
    h = P.parse_history(page("hist"))
    assert h[-1]["year"] == 1903 and h[-1]["podium"][0]["slug"] == "maurice-garin"


def test_live_profile_and_climbs():
    lv = P.parse_live(page("l3"))
    prof = lv["profile"]
    assert abs(prof["distance_km"] - 196.05) < 0.01 and prof["min_m"] == 144 and prof["max_m"] == 1838
    assert prof["points"][0][0] == 0 and abs(prof["points"][-1][1] - 1801) < 5
    assert lv["timeline"]
    found = PR.detect_climbs(prof["points"])
    assert any(c["top_m"] > 1700 for c in found)


def test_rider_and_team():
    r = P.parse_rider(page("rider"))
    assert r["birthdate"] == "1998-09-21" and r["nation"] == "si" and r["weight_kg"] == 66
    assert r["teams"][-1]["season"] == "2015" and r["specialties"]["climber"] > 0
    t = P.parse_team(page("team"))
    assert t["name"] == "UAE Team Emirates - XRG" and t["level"] == "WT"
    assert any(x["rider"] == "joao-almeida" for x in t["riders"])


def test_gradients():
    pts = [[0, 100], [1, 150], [2, 200], [3, 200]]
    g = PR.gradients_per_km(pts)
    assert g == [[0.0, 5.0], [1.0, 5.0], [2.0, 0.0]]
    c = PR.climb_from_top(pts, 2)
    assert c["gain_m"] == 100 and c["avg_gradient"] == 5.0
