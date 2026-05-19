"""
Crea el Google Spreadsheet "Album FIFA 2026 - Jugadores" con:

  • 12 hojas (Grupo A … Grupo L): una fila por jugador
      code | team_name | slot | player_name
      MEX  | Mexico    |  1   | Luis Malagón
      MEX  | Mexico    |  2   | Johan Vásquez
      ...
      RSA  | South Africa | 1 | Ronwen Williams
      ...

  • Hoja "Partidos" (Hoja 0): una fila por partido del grupo
      group | home_code | home_name | away_code | away_name |
      home_score | away_score | date | status

USO:
  python scripts/init_players_sheet.py

SETUP (solo la primera vez):
  pip install google-auth google-auth-oauthlib google-api-python-client
  - Pon credentials.json en la raíz del proyecto
"""

import json
from pathlib import Path
from collections import defaultdict
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES            = ["https://www.googleapis.com/auth/spreadsheets"]
ROOT              = Path(__file__).parent.parent
TEAMS_FILE        = ROOT / "src" / "data" / "teamsData.json"
MATCHES_FILE      = ROOT / "src" / "data" / "world_cup_2026_matches.json"
CREDENTIALS_FILE  = ROOT / "credentials-sheet.json"
TOKEN_FILE        = ROOT / "token.json"
SPREADSHEET_TITLE = "Album FIFA 2026 - Jugadores"

GROUPS = [f"GROUP {chr(65+i)}" for i in range(12)]


def autenticar():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())
    return creds


def cargar_datos():
    data  = json.loads(TEAMS_FILE.read_text(encoding="utf-8"))
    teams = data["teams"]

    grupos = defaultdict(list)
    for t in teams:
        gname = t.get("groupName", "GROUP ?")
        players_by_slot = {p["slot"]: (p.get("name") or "") for p in (t.get("players") or [])}
        grupos[gname].append({
            "code": t["code"],
            "name": t["name"],
            "players": players_by_slot,
        })

    matches_data = json.loads(MATCHES_FILE.read_text(encoding="utf-8"))
    group_matches = [m for m in matches_data.get("matches", []) if m.get("stage") == "group"]

    return grupos, group_matches


def main():
    print("═" * 55)
    print("  Creando spreadsheet de jugadores + partidos")
    print("═" * 55)

    grupos, group_matches = cargar_datos()
    creds  = autenticar()
    service = build("sheets", "v4", credentials=creds)

    # ── 1. Crear spreadsheet: 12 hojas de grupos + 1 hoja Partidos ──
    sheets_spec = [{"properties": {"title": "Partidos"}}]  # índice 0
    for i in range(12):
        sheets_spec.append({"properties": {"title": f"Grupo {chr(65+i)}"}})

    print("\n  Creando spreadsheet...", end="", flush=True)
    spreadsheet = service.spreadsheets().create(body={
        "properties": {"title": SPREADSHEET_TITLE},
        "sheets": sheets_spec,
    }).execute()

    sid = spreadsheet["spreadsheetId"]
    url = f"https://docs.google.com/spreadsheets/d/{sid}"
    print("  ✓")
    print(f"\n  ID:  {sid}")
    print(f"  URL: {url}")

    sheet_ids = {
        s["properties"]["title"]: s["properties"]["sheetId"]
        for s in spreadsheet["sheets"]
    }

    data_updates = []

    # ── 2. Hojas de grupos (una fila por jugador) ────────────────
    player_header = ["code", "team_name", "slot", "player_name"]

    for i, group_key in enumerate(GROUPS):
        sheet_name = f"Grupo {chr(65+i)}"
        rows = [player_header]
        for team in grupos.get(group_key, []):
            for slot in range(1, 12):  # slot 0 es especial (foto del equipo), slots 1-11 son jugadores
                name = team["players"].get(slot, "")
                rows.append([team["code"], team["name"], slot, name])
        data_updates.append({"range": f"'{sheet_name}'!A1", "values": rows})

    # ── 3. Hoja "Partidos" (partidos reales del mundial) ────────
    # Usa los IDs numéricos del JSON para que coincidan con resultsStore del frontend
    match_header = [
        "match_id", "group", "matchday",
        "home", "away",
        "home_score", "away_score",
        "date", "timeET", "status"
    ]
    match_rows = [match_header]

    for m in group_matches:
        match_rows.append([
            m["id"],
            m.get("group", ""),
            m.get("matchday", ""),
            m.get("home", ""),
            m.get("away", ""),
            "",   # home_score  (el usuario lo llena en Sheets)
            "",   # away_score
            m.get("date", ""),
            m.get("timeET", ""),
            "pending",
        ])

    data_updates.append({"range": "'Partidos'!A1", "values": match_rows})

    print(f"\n  Escribiendo datos...", end="", flush=True)
    service.spreadsheets().values().batchUpdate(
        spreadsheetId=sid,
        body={"valueInputOption": "RAW", "data": data_updates},
    ).execute()
    print("  ✓")

    # ── 4. Cabeceras en negrita en todas las hojas ───────────────
    fmt_requests = []
    all_sheet_names = ["Partidos"] + [f"Grupo {chr(65+i)}" for i in range(12)]
    for sname in all_sheet_names:
        fmt_requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_ids[sname],
                    "startRowIndex": 0, "endRowIndex": 1,
                },
                "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
                "fields": "userEnteredFormat.textFormat.bold",
            }
        })

    service.spreadsheets().batchUpdate(
        spreadsheetId=sid,
        body={"requests": fmt_requests},
    ).execute()

    total_teams   = sum(len(v) for v in grupos.values())
    total_players = total_teams * 11
    total_matches = len(group_matches)

    print(f"\n  ✓  {total_teams} equipos · {total_players} jugadores · {total_matches} partidos")
    print(f"\n  ┌─────────────────────────────────────────────────────┐")
    print(f"  │  Guarda este ID para el workflow de n8n:            │")
    print(f"  │  {sid:<51} │")
    print(f"  └─────────────────────────────────────────────────────┘")
    print(f"\n  Abre el spreadsheet:")
    print(f"  {url}\n")

    (ROOT / "sheets_id.txt").write_text(sid)
    print("  ID guardado en sheets_id.txt")


if __name__ == "__main__":
    main()
