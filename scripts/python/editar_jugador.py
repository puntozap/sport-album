"""
Edita y verifica nombres de jugadores via manage-players.php.

Busca la plantilla real en FIFA.com (transfermarkt como fallback).

USO:
  python scripts/editar_jugador.py

SETUP:
  pip install requests beautifulsoup4
"""

import json
import re
import sys
import msvcrt
import unicodedata
import difflib
import requests
from pathlib import Path
from bs4 import BeautifulSoup

# ── Configuración ──────────────────────────────────────────────────
BASE_URL     = "https://sportalbum.chanzia.com/api/manage-players"
UPLOAD_TOKEN = "xK9#mP2$qR7nL4vT8wY1"
# ──────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).parent.parent
TEAMS_FILE = ROOT / "src" / "data" / "teamsData.json"
HEADERS    = {"X-Upload-Token": UPLOAD_TOKEN}

BROWSER = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_cache: dict[str, list[str]] = {}


# ════════════════════════════════════════════════════════════════════
#  API del servidor
# ════════════════════════════════════════════════════════════════════

def post(action: str, extra: dict = {}) -> dict:
    r = requests.post(BASE_URL, headers=HEADERS,
                      data={"action": action, **extra}, timeout=15)
    r.raise_for_status()
    return r.json()


def cargar_equipos() -> list[dict]:
    with open(TEAMS_FILE, encoding="utf-8") as f:
        return json.load(f)["teams"]


# ════════════════════════════════════════════════════════════════════
#  SCRAPING FIFA.COM
# ════════════════════════════════════════════════════════════════════

# Mapa código FIFA → slug usado en la URL de FIFA.com
# (El slug suele ser el nombre en inglés en minúsculas con guiones)
FIFA_SLUG: dict[str, str] = {
    "MEX": "mexico", "BRA": "brazil", "ARG": "argentina",
    "FRA": "france", "GER": "germany", "ESP": "spain",
    "POR": "portugal", "ENG": "england", "NED": "netherlands",
    "BEL": "belgium", "USA": "united-states", "CAN": "canada",
    "URU": "uruguay", "COL": "colombia", "CHI": "chile",
    "PAR": "paraguay", "ECU": "ecuador", "PAN": "panama",
    "QAT": "qatar", "KSA": "saudi-arabia", "IRN": "iran",
    "IRQ": "iraq", "JOR": "jordan", "KOR": "korea-republic",
    "JPN": "japan", "AUS": "australia", "NZL": "new-zealand",
    "MAR": "morocco", "SEN": "senegal", "EGY": "egypt",
    "CIV": "cote-divoire", "GHA": "ghana", "ALG": "algeria",
    "COD": "dr-congo", "TUN": "tunisia", "RSA": "south-africa",
    "NOR": "norway", "SWE": "sweden", "SCO": "scotland",
    "TUR": "turkiye", "CRO": "croatia", "AUT": "austria",
    "SUI": "switzerland", "BIH": "bosnia-herzegovina",
    "HAI": "haiti", "CUW": "curacao", "CPV": "cape-verde",
    "UZB": "uzbekistan",
}


def _scrape_fifa(team_code: str, team_name: str) -> list[str]:
    slug = FIFA_SLUG.get(team_code, team_name.lower().replace(" ", "-"))
    url  = f"https://www.fifa.com/en/national-teams/{slug}/players"

    try:
        r = requests.get(url, headers=BROWSER, timeout=15)
        if not r.ok:
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        players = []
        seen = set()

        # FIFA renderiza nombres en etiquetas con clases que contienen "name" o "player"
        for tag in soup.find_all(["h2", "h3", "h4", "p", "span", "div"]):
            cls = " ".join(tag.get("class", []))
            if not re.search(r"(player|name|card)", cls, re.I):
                continue
            text = tag.get_text(strip=True)
            if _es_nombre_valido(text) and text not in seen:
                players.append(text)
                seen.add(text)

        # Fallback: buscar en cualquier elemento que tenga atributo data-player o similar
        if not players:
            for tag in soup.find_all(attrs={"data-player-name": True}):
                name = tag["data-player-name"].strip()
                if _es_nombre_valido(name) and name not in seen:
                    players.append(name)
                    seen.add(name)

        return players

    except Exception:
        return []


# ════════════════════════════════════════════════════════════════════
#  SCRAPING TRANSFERMARKT (fallback)
# ════════════════════════════════════════════════════════════════════

TM_HEADERS = {**BROWSER, "Referer": "https://www.transfermarkt.com/"}


def _buscar_url_tm(team_name: str) -> str | None:
    """Busca el equipo en transfermarkt y devuelve la URL de su plantilla."""
    query = team_name.replace(" ", "+") + "+national+team"
    url   = f"https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query={query}"

    try:
        r    = requests.get(url, headers=TM_HEADERS, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")

        # Buscar el primer resultado de tipo "Verein" (club/selección nacional)
        for a in soup.select("table.items td.hauptlink a"):
            href = a.get("href", "")
            # Las selecciones nacionales tienen URLs como /mexiko/startseite/verein/5765
            if "/startseite/verein/" in href:
                # Convertir startseite → kader (plantilla)
                squad_url = href.replace("/startseite/", "/kader/")
                return "https://www.transfermarkt.com" + squad_url

    except Exception:
        pass
    return None


def _scrape_transfermarkt(team_name: str) -> list[str]:
    squad_url = _buscar_url_tm(team_name)
    if not squad_url:
        return []

    try:
        r    = requests.get(squad_url, headers=TM_HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")

        players = []
        seen    = set()

        # Tabla de plantilla: cada jugador está en un <td class="hauptlink">
        for td in soup.select("td.hauptlink"):
            a = td.find("a")
            if not a:
                continue
            name = a.get_text(strip=True)
            if _es_nombre_valido(name) and name not in seen:
                players.append(name)
                seen.add(name)

        return players

    except Exception:
        return []


# ════════════════════════════════════════════════════════════════════
#  ORQUESTADOR
# ════════════════════════════════════════════════════════════════════

SKIP = ["fc ", "united", "city", "real ", "club ", "athletic",
        "league", "cup", "fifa", "uefa", "association", "federation",
        "manager", "coach", "staff", "director", "trainer"]

POSICIONES = {"GK", "DF", "MF", "FW", "G", "D", "M", "F",
              "POR", "DEF", "MED", "DEL"}  # ES + EN


def _es_nombre_valido(text: str) -> bool:
    if not text or not (4 <= len(text) <= 42):
        return False
    words = text.split()
    if not (2 <= len(words) <= 5):
        return False
    tl = text.lower()
    return not any(s in tl for s in SKIP)


def _fila_tiene_posicion(row) -> bool:
    """Devuelve True si la fila de una tabla tiene una celda con código de posición."""
    for td in row.find_all("td"):
        txt = td.get_text(strip=True).upper()
        if txt in POSICIONES:
            return True
    return False


# ════════════════════════════════════════════════════════════════════
#  SCRAPING WIKIPEDIA — solo filas con posición (jugadores, no cuerpo técnico)
# ════════════════════════════════════════════════════════════════════

def _scrape_wikipedia(team_name: str) -> list[str]:
    try:
        api = "https://en.wikipedia.org/w/api.php"

        for query in [
            f"{team_name} 2026 FIFA World Cup squad",
            f"{team_name} at the 2026 FIFA World Cup",
            f"{team_name} national football team squad",
        ]:
            r = requests.get(api, params={
                "action": "query", "list": "search",
                "srsearch": query, "format": "json", "srlimit": 3,
            }, headers=BROWSER, timeout=10)
            results = r.json().get("query", {}).get("search", [])
            if results:
                break

        if not results:
            return []

        title    = results[0]["title"]
        page_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
        r        = requests.get(page_url, headers=BROWSER, timeout=12)
        soup     = BeautifulSoup(r.text, "html.parser")

        players = []
        seen    = set()

        for table in soup.find_all("table", class_=re.compile(r"wikitable")):
            for row in table.find_all("tr"):
                # Solo filas que tengan código de posición (GK, DF, MF, FW…)
                if not _fila_tiene_posicion(row):
                    continue
                for td in row.find_all("td"):
                    link = td.find("a", href=re.compile(r"^/wiki/[^:]+$"))
                    if not link:
                        continue
                    name = link.get_text(strip=True)
                    if _es_nombre_valido(name) and name not in seen:
                        players.append(name)
                        seen.add(name)

        return players

    except Exception:
        return []


# ════════════════════════════════════════════════════════════════════
#  SCRAPING FBREF.COM
# ════════════════════════════════════════════════════════════════════

def _scrape_fbref(team_name: str) -> list[str]:
    try:
        query = team_name.replace(" ", "+") + "+national+football+team"
        r = requests.get(
            f"https://fbref.com/search/search.fcgi?search={query}",
            headers=BROWSER, timeout=12, allow_redirects=True,
        )
        soup = BeautifulSoup(r.text, "html.parser")

        players = []
        seen    = set()

        # fbref usa tablas con id "stats_*"; las filas de jugadores tienen data-row-index
        for table in soup.find_all("table"):
            for row in table.find_all("tr", attrs={"data-row": True}):
                td = row.find("td", {"data-stat": "player"})
                if not td:
                    continue
                name = td.get_text(strip=True)
                if _es_nombre_valido(name) and name not in seen:
                    players.append(name)
                    seen.add(name)

        return players

    except Exception:
        return []


# ════════════════════════════════════════════════════════════════════
#  SCRAPING SOCCERWAY.COM
# ════════════════════════════════════════════════════════════════════

def _scrape_soccerway(team_name: str) -> list[str]:
    try:
        query = team_name.replace(" ", "+") + "+national+team"
        r = requests.get(
            f"https://int.soccerway.com/search/?q={query}",
            headers={**BROWSER, "Referer": "https://int.soccerway.com/"},
            timeout=12,
        )
        soup  = BeautifulSoup(r.text, "html.parser")

        players = []
        seen    = set()

        # Buscar tabla de squad si encontró la página del equipo
        for td in soup.select("td.name a"):
            name = td.get_text(strip=True)
            if _es_nombre_valido(name) and name not in seen:
                players.append(name)
                seen.add(name)

        return players

    except Exception:
        return []


# ════════════════════════════════════════════════════════════════════
#  ORQUESTADOR — FIFA + Transfermarkt + Wikipedia + FBRef + Soccerway
# ════════════════════════════════════════════════════════════════════

def buscar_plantilla(team_name: str, team_code: str) -> list[str]:
    if team_code in _cache:
        return _cache[team_code]

    combined = []
    seen     = set()

    def agregar(nuevos: list[str]):
        for n in nuevos:
            if n not in seen:
                combined.append(n)
                seen.add(n)

    fuentes = [
        ("FIFA.com",      lambda: _scrape_fifa(team_code, team_name)),
        ("Transfermarkt", lambda: _scrape_transfermarkt(team_name)),
        ("Wikipedia",     lambda: _scrape_wikipedia(team_name)),
        ("FBRef",         lambda: _scrape_fbref(team_name)),
        ("Soccerway",     lambda: _scrape_soccerway(team_name)),
    ]

    totales = []
    for nombre_fuente, fn in fuentes:
        print(f"  {nombre_fuente}...", end="", flush=True)
        try:
            resultado = fn()
        except Exception:
            resultado = []
        agregar(resultado)
        totales.append(f"{nombre_fuente}: {len(resultado)}")
        print(f" {len(resultado)}", end="  ")

    print()
    print(f"  Fuentes: {' | '.join(totales)}")
    if combined:
        print(f"  ✓  {len(combined)} jugadores únicos en total")
    else:
        print("  ⚠  Sin resultados en ninguna fuente")

    _cache[team_code] = combined
    return combined


# ════════════════════════════════════════════════════════════════════
#  VERIFICACIÓN Y SIMILITUD
# ════════════════════════════════════════════════════════════════════

def normalizar(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def verificar_exacto(nombre: str, plantilla: list[str]) -> str | None:
    """Devuelve el nombre de la plantilla que coincide exactamente (ignorando tildes)."""
    if not nombre or not plantilla:
        return None
    norm = normalizar(nombre)
    for p in plantilla:
        if normalizar(p) == norm:
            return p
    return None


def rankear_similares(nombre: str, plantilla: list[str], top: int = 8) -> list[tuple[str, float]]:
    """
    Devuelve hasta `top` jugadores de la plantilla ordenados por similitud
    con `nombre`. Combina dos señales:
      - ratio de difflib (similitud de cadena)
      - si alguna palabra del nombre aparece en el candidato
    """
    if not plantilla:
        return []

    norm_ref  = normalizar(nombre) if nombre else ""
    palabras  = set(norm_ref.split())
    scored    = []

    for p in plantilla:
        norm_p = normalizar(p)
        ratio  = difflib.SequenceMatcher(None, norm_ref, norm_p).ratio()

        # Bonus si comparten alguna palabra
        bonus = 0.15 * sum(1 for w in palabras if w and w in norm_p and len(w) > 2)
        scored.append((p, min(ratio + bonus, 1.0)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top]


# ════════════════════════════════════════════════════════════════════
#  UI
# ════════════════════════════════════════════════════════════════════

def elegir_equipo(teams: list[dict]) -> dict:
    print(f"\n  {'#':>3}  {'Cód':<5}  Equipo")
    print(f"  {'─'*3}  {'─'*5}  {'─'*25}")
    for i, t in enumerate(teams, 1):
        print(f"  {i:>3}  {t['code']:<5}  {t['name']}")
    print()
    while True:
        raw = input("  Elige el número del equipo: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(teams):
            return teams[int(raw) - 1]
        print("  Número inválido.")


def mostrar_jugadores(team: dict, overrides: dict) -> list[dict]:
    code    = team["code"]
    team_ov = overrides.get(code, {})
    orig_map = {p["slot"]: p.get("name") or "" for p in (team.get("players") or [])}

    slots = []
    for idx in range(12):
        orig = orig_map.get(idx, "")
        ov   = team_ov.get(str(idx))
        name = ov if ov else orig
        slots.append({"slot": idx, "name": name, "original": orig, "has_override": bool(ov)})

    print(f"\n  {'#':>3}  {'Slot':<4}  Nombre")
    print(f"  {'─'*3}  {'─'*4}  {'─'*32}")
    for i, s in enumerate(slots, 1):
        star   = "★" if s["has_override"] else " "
        nombre = s["name"] if s["name"] else "(vacío)"
        print(f"  {i:>3}  [{s['slot']:>2}]{star}  {nombre}")
    print()
    print("  ★ = editado  |  0 = volver")
    print()
    return slots


def mostrar_candidatos(nombre_actual: str, plantilla: list[str]) -> str | None:
    """
    Muestra primero los más similares al nombre actual (top 8),
    luego ofrece ver la lista completa. Devuelve el nombre elegido o None.
    """
    if not plantilla:
        print("  (no se encontraron jugadores en la plantilla online)")
        return None

    similares = rankear_similares(nombre_actual, plantilla, top=8)

    print(f"\n  Más similares a \"{nombre_actual or '(vacío)'}\":")
    print(f"  {'─'*3}  {'─'*35}  {'Sim':>5}")
    for i, (p, score) in enumerate(similares, 1):
        barra = "█" * int(score * 10) + "░" * (10 - int(score * 10))
        print(f"  {i:>3}  {p:<35}  {barra}  {score:.0%}")

    print()
    print(f"  [1-{len(similares)}] Elegir uno de arriba")
    print(f"  [v]  Ver lista completa ({len(plantilla)} jugadores)")
    print(f"  [0]  Cancelar")
    print()

    while True:
        raw = input("  → ").strip().lower()

        if raw == "0" or raw == "":
            return None

        if raw == "v":
            # Mostrar lista completa ordenada alfabéticamente
            ordenada = sorted(plantilla)
            print(f"\n  Lista completa — {len(ordenada)} jugadores:")
            print(f"  {'─'*3}  {'─'*35}")
            for i, p in enumerate(ordenada, 1):
                print(f"  {i:>3}  {p}")
            print()
            while True:
                raw2 = input("  Número (0 = volver): ").strip()
                if raw2 == "0" or raw2 == "":
                    break
                if raw2.isdigit() and 1 <= int(raw2) <= len(ordenada):
                    return ordenada[int(raw2) - 1]
                print("  Número inválido.")
            continue  # volver al menú de similares

        if raw.isdigit() and 1 <= int(raw) <= len(similares):
            return similares[int(raw) - 1][0]

        print("  Entrada inválida.")


def input_con_prefill(prompt: str, prefill: str) -> str | None:
    sys.stdout.write(prompt)
    sys.stdout.write(prefill)
    sys.stdout.flush()
    buf = list(prefill)
    while True:
        ch = msvcrt.getwch()
        if ch in ('\r', '\n'):
            print()
            return "".join(buf)
        elif ch == '\x1b':
            print("\n  (cancelado)")
            return None
        elif ch in ('\x08', '\x7f'):
            if buf:
                buf.pop()
                sys.stdout.write('\b \b')
                sys.stdout.flush()
        elif ch in ('\x00', '\xe0'):
            msvcrt.getwch()
        elif ch >= ' ':
            buf.append(ch)
            sys.stdout.write(ch)
            sys.stdout.flush()


def guardar(code: str, slot_idx: int, nuevo: str, overrides: dict) -> dict:
    if nuevo == "":
        result = post("reset-player", {"code": code, "slot": slot_idx})
        if result.get("success"):
            print(f"  ✓  Reseteado al nombre original")
    else:
        result = post("update-player", {"code": code, "slot": slot_idx, "name": nuevo})
        if result.get("success"):
            print(f"  ✓  Guardado: {nuevo}")
        else:
            print(f"  ✗  {result}")
    data = post("get-overrides")
    return data if isinstance(data, dict) else {}


# ════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════

def main():
    print("═" * 58)
    print("  Editor de jugadores — álbum FIFA 2026")
    print("═" * 58)

    teams = cargar_equipos()

    while True:
        print("\n  Cargando overrides del servidor...", end="", flush=True)
        overrides = post("get-overrides")
        if not isinstance(overrides, dict):
            overrides = {}
        print("  ✓")

        team = elegir_equipo(teams)

        # Buscar plantilla del equipo (se cachea para la sesión)
        plantilla = buscar_plantilla(team["name"], team["code"])

        while True:
            slots = mostrar_jugadores(team, overrides)

            raw = input("  Elige el número del jugador (0 = volver): ").strip()
            if raw == "0" or raw == "":
                break
            if not raw.isdigit() or not (1 <= int(raw) <= 12):
                print("  Número inválido.")
                continue

            slot_data     = slots[int(raw) - 1]
            slot_idx      = slot_data["slot"]
            nombre_actual = slot_data["name"]

            print(f"\n  Slot {slot_idx}  →  \"{nombre_actual or '(vacío)'}\"")

            # ── Verificar exacto primero ───────────────────────────
            match = verificar_exacto(nombre_actual, plantilla)

            if match:
                print(f"  ✓  Confirmado: {match}")
                if match != nombre_actual:
                    resp = input(f"  ¿Actualizar ortografía a \"{match}\"? (s/n): ").strip().lower()
                    if resp == "s":
                        overrides = guardar(team["code"], slot_idx, match, overrides)
                continue

            # ── No encontrado exacto → mostrar similares ───────────
            if plantilla:
                print(f"  ⚠  No encontrado exacto. Mostrando similares...")
                elegido = mostrar_candidatos(nombre_actual, plantilla)
                if elegido:
                    overrides = guardar(team["code"], slot_idx, elegido, overrides)
                    continue

            # ── Sin plantilla o usuario canceló → manual ───────────
            nuevo = input_con_prefill("  Escribir manualmente (Esc = saltar): ", nombre_actual)
            if nuevo is not None:
                nuevo = nuevo.strip()
                if nuevo and nuevo != nombre_actual:
                    overrides = guardar(team["code"], slot_idx, nuevo, overrides)
                elif nuevo == nombre_actual:
                    print("  Sin cambios.")


if __name__ == "__main__":
    main()
