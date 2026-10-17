"""Análise do perfil altimétrico: inclinações por km e dados de cada subida.

O PCS dá o perfil como pontos [km, altitude] e, nas classificações do dia, os prémios
de montanha (nome, categoria, km do topo) e as metas volantes (nome, km). Daqui
calculamos comprimento, desnível e inclinação média/máxima de cada subida.
"""


def ele_at(points, km):
    if not points:
        return None
    if km <= points[0][0]:
        return points[0][1]
    for (k1, e1), (k2, e2) in zip(points, points[1:]):
        if k1 <= km <= k2:
            return e1 if k2 == k1 else e1 + (e2 - e1) * (km - k1) / (k2 - k1)
    return points[-1][1]


def gradients_per_km(points, step=1.0):
    """Lista de [km_inicial, inclinação %] em troços de `step` km."""
    if not points:
        return []
    total = points[-1][0]
    out, km = [], 0.0
    while km < total - 1e-6:
        end = min(km + step, total)
        a, b = ele_at(points, km), ele_at(points, end)
        out.append([round(km, 1), round((b - a) / ((end - km) * 1000) * 100, 1)])
        km = end
    return out


def climb_from_top(points, km_top, max_back_km=40, tolerance_m=35):
    """Recua a partir do topo até ao vale onde a subida começa."""
    if not points:
        return None
    # ajustar o topo ao ponto mais alto num raio de 1,5 km
    near = [p for p in points if abs(p[0] - km_top) <= 1.5]
    if not near:
        return None
    top = max(near, key=lambda p: p[1])
    idx = points.index(top)
    low, low_i = top[1], idx
    for i in range(idx - 1, -1, -1):
        k, e = points[i]
        if top[0] - k > max_back_km:
            break
        if e < low:
            low, low_i = e, i
        elif e > low + tolerance_m:
            break
    # cortar a aproximação plana: a subida começa quando o km seguinte passa os 2 %
    while low_i < idx and top[0] - points[low_i][0] > 0.5:
        k, e = points[low_i]
        if (ele_at(points, min(k + 1.0, top[0])) - e) / (min(1.0, top[0] - k) * 10) >= 2.0:
            break
        low_i += 1
    start = points[low_i]
    length = top[0] - start[0]
    if length < 0.3:
        return None
    gain = top[1] - start[1]
    seg = [p for p in points if start[0] <= p[0] <= top[0]]
    win = min(1.0, length)
    max_g = 0.0
    for p in seg:
        end = p[0] + win
        if end > top[0] + 1e-6:
            break
        max_g = max(max_g, (ele_at(points, end) - p[1]) / (win * 10.0))
    return {
        "start_km": round(start[0], 1), "top_km": round(top[0], 1), "length_km": round(length, 1),
        "start_m": round(start[1]), "top_m": round(top[1]), "gain_m": round(gain),
        "avg_gradient": round(gain / (length * 1000) * 100, 1), "max_gradient_1km": round(max_g, 1),
    }


def detect_climbs(points, min_gain=60, min_avg=3.0):
    """Sem prémios de montanha oficiais (ex.: clássicas), deteta as subidas relevantes no perfil."""
    found = []
    for i in range(1, len(points) - 1):
        k, e = points[i]
        window = [p[1] for p in points if abs(p[0] - k) <= 1.0]
        if e < max(window):
            continue
        c = climb_from_top(points, k, max_back_km=25, tolerance_m=20)
        if not c or c["gain_m"] < min_gain or c["avg_gradient"] < min_avg:
            continue
        if found and c["start_km"] < found[-1]["top_km"]:
            if c["gain_m"] > found[-1]["gain_m"]:
                found[-1] = c
            continue
        found.append(c)
    for c in found:
        c["detected"] = True
    return found


def analyse(profile, intermediate, official_km=None):
    """Junta perfil + metas volantes/prémios de montanha num resumo pronto para o gráfico."""
    points = (profile or {}).get("points") or []
    plen = (profile or {}).get("distance_km") or (points[-1][0] if points else None)
    scale = (plen / official_km) if (plen and official_km) else 1.0
    climbs, sprints = [], []
    for item in intermediate or []:
        km = item.get("km")
        if item.get("type") == "kom":
            c = {"name": item.get("name"), "category": item.get("category"), "km": km}
            if points and km is not None:
                c.update(climb_from_top(points, km * scale) or {})
            climbs.append({k: v for k, v in c.items() if v is not None})
        elif item.get("type") == "sprint":
            s = {"name": item.get("name"), "km": km}
            if points and km is not None:
                e = ele_at(points, km * scale)
                s["elevation_m"] = round(e) if e is not None else None
            sprints.append({k: v for k, v in s.items() if v is not None})
    if points and not climbs:
        climbs = detect_climbs(points)
    out = {"climbs": climbs, "sprints": sprints}
    if points:
        out["gradients"] = gradients_per_km(points)
        out["scale"] = round(scale, 4)
    return out
