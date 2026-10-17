"""Escreve race=yes se alguma prova seguida decorre hoje (só biblioteca padrão, corre antes de instalar dependências)."""
import json
from datetime import datetime, timezone
from pathlib import Path

today = datetime.now(timezone.utc).date().isoformat()
cal = Path(__file__).resolve().parent.parent / "data" / "calendar" / f"{today[:4]}.json"
races = json.loads(cal.read_text()).get("races", []) if cal.exists() else []
on = [r["slug"] for r in races if (r.get("start") or "9") <= today <= (r.get("end") or r.get("start") or "")]
print(f"race={'yes' if on else 'no'}")
print(f"slugs={','.join(on)}")
