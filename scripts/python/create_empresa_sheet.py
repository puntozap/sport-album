"""
Crea un Google Spreadsheet configurado para una empresa del álbum.
El sheet sirve como fuente de verdad para grupos, países, slots e imágenes.

USO:
  python scripts/python/create_empresa_sheet.py
  python scripts/python/create_empresa_sheet.py mi-empresa "Mi Empresa S.A."

SETUP (solo la primera vez):
  pip install google-auth google-auth-oauthlib google-api-python-client
  - Pon credentials.json en la raíz del proyecto

FLUJO:
  1. Crea el spreadsheet en Google Drive
  2. Configura 4 hojas: Config, Grupos, Paises, Slots
  3. Llena con datos de ejemplo
  4. Aplica formato (encabezados, colores, columnas anchas)
  5. Imprime la URL y las instrucciones para el Apps Script
"""

import os
import sys
import json
import re
from pathlib import Path

from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# ── Configuración ──────────────────────────────────────────────────────────────
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

ROOT             = Path(__file__).parent.parent.parent
CREDENTIALS_FILE = ROOT / "credentials.json"
TOKEN_FILE       = ROOT / "token_sheets.json"
EMPRESAS_DIR     = ROOT / "public" / "empresas"

# Colores de encabezado para cada hoja
HEADER_COLORS = {
    "Config":  {"red": 0.118, "green": 0.227, "blue": 0.541},   # #1e3a8a
    "Grupos":  {"red": 0.047, "green": 0.455, "blue": 0.565},   # #0e7490
    "Paises":  {"red": 0.302, "green": 0.149, "blue": 0.929},   # #4d26ed
    "Slots":   {"red": 0.094, "green": 0.416, "blue": 0.220},   # #186a38
}

# ── Auth ───────────────────────────────────────────────────────────────────────

def autenticar():
    creds = None
    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        except Exception:
            TOKEN_FILE.unlink(missing_ok=True)
            creds = None
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                print(f"\n❌ No encontré {CREDENTIALS_FILE}")
                print("   Descarga credentials.json desde Google Cloud Console")
                print("   (APIs & Services → Credentials → OAuth 2.0 Client ID → Desktop)")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


# ── Datos desde albumData.json existente ──────────────────────────────────────

def datos_desde_album(slug, nombre_empresa, server_url=""):
    """Lee config.json + albumData.json de la empresa y construye las filas del sheet."""
    album_path  = EMPRESAS_DIR / slug / "albumData.json"
    config_path = EMPRESAS_DIR / slug / "config.json"

    with open(album_path, encoding="utf-8") as f:
        album = json.load(f)

    cfg = {}
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            cfg = json.load(f)

    nombre      = cfg.get("name") or album.get("name") or nombre_empresa
    tagline     = cfg.get("tagline", "")
    primary     = cfg.get("primaryColor", "")
    whatsapp    = cfg.get("whatsapp") or ""
    website     = cfg.get("website") or ""
    server      = cfg.get("serverUrl") or server_url or "(URL base del servidor, ej: https://midominio.com)"
    token       = cfg.get("uploadToken") or "(token de subida del servidor)"
    sheets_url  = cfg.get("sheetsUrl") or "(pegar URL después de desplegar el Apps Script)"
    sticker_count = str(album.get("stickerCount", 12))

    config_rows = [
        ["albumId",         slug],
        ["name",            nombre],
        ["tagline",         tagline],
        ["primaryColor",    primary],
        ["stickerCount",    sticker_count],
        ["whatsapp",        whatsapp],
        ["website",         website],
        ["apps_script_url", sheets_url],
        ["server_url",      server],
        ["upload_token",    token],
        ["freePlay",        str(album.get("freePlay", "false")).lower()],
        ["shareUrl",        f"https://{slug.replace('_', '')}.figurita.lat/share"],
    ]

    grupos_rows = []
    paises_rows = []
    slots_rows  = []

    for group in album.get("groups", []):
        gc = group.get("colors", {})
        grupos_rows.append([
            group["id"],
            group.get("name", group["id"]),
            group.get("letter", ""),
            gc.get("primary",  "#1a56db"),
            gc.get("secondary","#ffffff"),
            gc.get("accent",   "#f59e0b"),
            gc.get("sticker",  "#e0e7ff"),
            gc.get("groupBox", "#1e3a8a"),
        ])

        for ent in group.get("entities", []):
            ec = ent.get("colors", {})
            paises_rows.append([
                group["id"],
                ent["id"],
                ent.get("name", ent["id"]),
                ent.get("code", ""),
                ec.get("primary",  ""),
                ec.get("secondary",""),
                ec.get("accent",   ""),
                ec.get("sticker",  ""),
                ec.get("groupBox", ""),
            ])

            base_path = f"/empresas/{slug}/cromos/{ent['id']}"
            server_base = (cfg.get("serverUrl") or server_url or "").rstrip("/")
            sc = ent.get("stickerCount") or album.get("stickerCount", 12)
            stickers_map = {s["slot"]: s for s in ent.get("stickers", [])}
            for i in range(sc):
                s     = stickers_map.get(i, {})
                name  = s.get("name", "") or ""
                stype = s.get("type", "")
                # Usar image_url guardada en el sticker, si no construir con server_base
                img_url = s.get("image_url") or s.get("imageUrl") or ""
                if not img_url:
                    img_url = f"{server_base}{base_path}/{i:02d}.webp" if server_base else f"{base_path}/{i:02d}.webp"
                slots_rows.append([
                    ent["id"],
                    str(i),
                    name,
                    img_url,
                    stype,
                ])

    return config_rows, grupos_rows, paises_rows, slots_rows


# ── Datos de ejemplo (fallback sin albumData.json) ─────────────────────────────

def datos_ejemplo(slug, nombre_empresa, server_url=""):
    """Devuelve filas de ejemplo para las 4 hojas."""

    config_rows = [
        ["albumId",         slug],
        ["name",            nombre_empresa],
        ["stickerCount",    "12"],
        ["apps_script_url", "(pegar URL después de desplegar el Apps Script)"],
        ["server_url",      server_url or "(URL base del servidor, ej: https://midominio.com)"],
        ["upload_token",    "(token de subida del servidor)"],
        ["freePlay",        "false"],
        ["shareUrl",        f"https://{slug.replace('_', '')}.figurita.lat/share"],
    ]

    grupos_rows = [
        ["grupo-a", "Grupo A", "A", "#1a56db", "#ffffff", "#f59e0b", "#e0e7ff", "#1e3a8a"],
        ["grupo-b", "Grupo B", "B", "#7c3aed", "#ffffff", "#fbbf24", "#ede9fe", "#4c1d95"],
    ]

    paises_rows = [
        ["grupo-a", "equipo-alpha", "Equipo Alpha", "ALP", "", "", "", "", ""],
        ["grupo-a", "equipo-beta",  "Equipo Beta",  "BET", "#0e7490", "#ffffff", "#fbbf24", "#cffafe", "#164e63"],
        ["grupo-b", "equipo-gamma", "Equipo Gamma", "GAM", "", "", "", "", ""],
    ]

    slots_rows = []
    for country_id in ["equipo-alpha", "equipo-beta", "equipo-gamma"]:
        base_path = f"/empresas/{slug}/cromos/{country_id}"
        slots_rows.append([country_id, "0", "Logo del equipo",
                           f"{base_path}/00.webp", "holograma"])
        nombres = ["Ana García", "Luis Pérez", "María López", "Carlos Ruiz",
                   "Laura Díaz", "Jorge Mora", "Sofia Vega", "Pablo Cruz",
                   "Valeria Ríos", "Marcos Leal", "Diana Soto"]
        for i, nombre in enumerate(nombres, 1):
            slots_rows.append([country_id, str(i), nombre,
                               f"{base_path}/{i:02d}.webp", ""])

    return config_rows, grupos_rows, paises_rows, slots_rows


# ── Crear spreadsheet ──────────────────────────────────────────────────────────

def crear_spreadsheet(sheets_svc, nombre_empresa):
    """Crea el spreadsheet con las 4 hojas."""
    body = {
        "properties": {"title": f"Album - {nombre_empresa}"},
        "sheets": [
            {"properties": {"title": "Config",  "index": 0, "sheetId": 0}},
            {"properties": {"title": "Grupos",  "index": 1, "sheetId": 1}},
            {"properties": {"title": "Paises",  "index": 2, "sheetId": 2}},
            {"properties": {"title": "Slots",   "index": 3, "sheetId": 3}},
        ]
    }
    result = sheets_svc.spreadsheets().create(body=body, fields="spreadsheetId").execute()
    return result["spreadsheetId"]


# ── Escribir datos ─────────────────────────────────────────────────────────────

HEADERS = {
    "Config": [["Clave", "Valor"]],
    "Grupos": [["group_id", "name", "letter", "color_primary", "color_secondary",
                "color_accent", "color_sticker", "color_groupBox"]],
    "Paises": [["group_id", "country_id", "name", "code", "color_primary",
                "color_secondary", "color_accent", "color_sticker", "color_groupBox"]],
    "Slots":  [["country_id", "slot", "player_name", "image_url", "type"]],
}

def escribir_datos(sheets_svc, ss_id, config_rows, grupos_rows, paises_rows, slots_rows):
    data = [
        {"range": "Config!A1",  "values": HEADERS["Config"]  + config_rows},
        {"range": "Grupos!A1",  "values": HEADERS["Grupos"]  + grupos_rows},
        {"range": "Paises!A1",  "values": HEADERS["Paises"]  + paises_rows},
        {"range": "Slots!A1",   "values": HEADERS["Slots"]   + slots_rows},
    ]
    sheets_svc.spreadsheets().values().batchUpdate(
        spreadsheetId=ss_id,
        body={"valueInputOption": "RAW", "data": data}
    ).execute()


# ── Aplicar formato ────────────────────────────────────────────────────────────

def hex_to_rgb(hex_color):
    h = hex_color.lstrip("#")
    return {
        "red":   int(h[0:2], 16) / 255,
        "green": int(h[2:4], 16) / 255,
        "blue":  int(h[4:6], 16) / 255,
    }

def formato_encabezado(sheet_id, color_bg, num_cols):
    """Formato bold + fondo de color + texto blanco para fila 1."""
    return {
        "repeatCell": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": 0,
                "endRowIndex": 1,
                "startColumnIndex": 0,
                "endColumnIndex": num_cols,
            },
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": color_bg,
                    "textFormat": {
                        "bold": True,
                        "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                        "fontSize": 10,
                    },
                    "horizontalAlignment": "CENTER",
                    "verticalAlignment": "MIDDLE",
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        }
    }

def congelar_fila(sheet_id):
    return {
        "updateSheetProperties": {
            "properties": {
                "sheetId": sheet_id,
                "gridProperties": {"frozenRowCount": 1},
            },
            "fields": "gridProperties.frozenRowCount",
        }
    }

def ancho_columna(sheet_id, col_idx, pixels):
    return {
        "updateDimensionProperties": {
            "range": {
                "sheetId": sheet_id,
                "dimension": "COLUMNS",
                "startIndex": col_idx,
                "endIndex": col_idx + 1,
            },
            "properties": {"pixelSize": pixels},
            "fields": "pixelSize",
        }
    }

def formato_alternado(sheet_id, num_filas):
    """Filas alternas con fondo muy claro."""
    return {
        "addBanding": {
            "bandedRange": {
                "bandedRangeId": sheet_id * 10,
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": 1,
                    "endRowIndex": num_filas + 1,
                },
                "rowProperties": {
                    "headerColor": {"red": 0.9, "green": 0.9, "blue": 0.95},
                    "firstBandColor": {"red": 1, "green": 1, "blue": 1},
                    "secondBandColor": {"red": 0.95, "green": 0.96, "blue": 0.99},
                },
            }
        }
    }


SHEET_IDS   = {"Config": 0, "Grupos": 1, "Paises": 2, "Slots": 3}
SHEET_COLS  = {"Config": 2, "Grupos": 8, "Paises": 9, "Slots": 5}
COL_WIDTHS  = {
    # (sheet_id, col_index): pixels
    (0, 0): 200, (0, 1): 400,                               # Config
    (1, 0): 130, (1, 1): 140, (1, 2): 70,                   # Grupos - id,name,letter
    (1, 3): 120, (1, 4): 120, (1, 5): 110, (1, 6): 110, (1, 7): 120,  # colores
    (2, 0): 120, (2, 1): 150, (2, 2): 170, (2, 3): 70,     # Paises
    (3, 0): 150, (3, 1): 55,  (3, 2): 220, (3, 3): 380, (3, 4): 90,  # Slots
}

def aplicar_formato(sheets_svc, ss_id, config_rows, grupos_rows, paises_rows, slots_rows):
    requests = []

    for nombre, sheet_id in SHEET_IDS.items():
        color = HEADER_COLORS[nombre]
        requests.append(formato_encabezado(sheet_id, color, SHEET_COLS[nombre]))
        requests.append(congelar_fila(sheet_id))

    row_counts = {
        "Config": len(config_rows),
        "Grupos": len(grupos_rows),
        "Paises": len(paises_rows),
        "Slots":  len(slots_rows),
    }
    for nombre, sheet_id in SHEET_IDS.items():
        n = row_counts[nombre]
        if n > 0:
            requests.append(formato_alternado(sheet_id, n))

    for (sheet_id, col_idx), pixels in COL_WIDTHS.items():
        requests.append(ancho_columna(sheet_id, col_idx, pixels))

    sheets_svc.spreadsheets().batchUpdate(
        spreadsheetId=ss_id,
        body={"requests": requests}
    ).execute()


# ── Crear directorio de empresa (si no existe) ─────────────────────────────────

def actualizar_empresa_slug(slug):
    """Actualiza el meta tag empresa-slug en index.html."""
    import re
    html_path = ROOT / "index.html"
    if not html_path.exists():
        print(f"  ⚠️  No encontré index.html en {ROOT}")
        return
    content = html_path.read_text(encoding="utf-8")
    updated = re.sub(
        r'(<meta name="empresa-slug" content=")[^"]*(")',
        rf'\g<1>{slug}\g<2>',
        content
    )
    if updated == content:
        print(f"  ⚠️  No se encontró el meta tag empresa-slug en index.html")
    else:
        html_path.write_text(updated, encoding="utf-8")
        print(f"  ✓ index.html → empresa-slug = {slug}")


def crear_directorio_empresa(slug, nombre_empresa, ss_id):
    empresa_dir = EMPRESAS_DIR / slug
    empresa_dir.mkdir(parents=True, exist_ok=True)

    config_path = empresa_dir / "config.json"
    if not config_path.exists():
        config = {
            "albumId": slug,
            "name": nombre_empresa,
            "primaryColor": "#1a56db",
            "logoUrl": "",
            "sheetsUrl": "(pegar URL del Apps Script después del deploy)",
            "serverUrl": "(URL base del servidor, ej: https://midominio.com)",
            "uploadToken": "(token de subida — debe coincidir con el PHP)",
            "stamp": {"corner": "bottom-right", "logoHeight": 32, "padding": 8},
        }
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Creado: {config_path.relative_to(ROOT)}")
    else:
        print(f"  ℹ  Ya existe: {config_path.relative_to(ROOT)}")

    sheet_ref = empresa_dir / "_sheet_id.txt"
    with open(sheet_ref, "w") as f:
        f.write(ss_id)
    print(f"  ✓ ID guardado: {sheet_ref.relative_to(ROOT)}")


# ── Instrucciones finales ──────────────────────────────────────────────────────

def imprimir_instrucciones(ss_id, slug):
    url = f"https://docs.google.com/spreadsheets/d/{ss_id}"
    print()
    print("═" * 65)
    print(f"  ✅  Spreadsheet creado")
    print(f"  📋  URL: {url}")
    print("═" * 65)
    print()
    print("  PRÓXIMOS PASOS:")
    print()
    print("  1. Abre el spreadsheet:")
    print(f"     {url}")
    print()
    print("  2. Extensiones → Apps Script")
    print("     Pega el código de:")
    print("     scripts/apps-script/album-config-apps-script.js")
    print()
    print("  3. Guarda (Ctrl+S) y despliega:")
    print("     Implementar → Nueva implementación")
    print("     Tipo: Aplicación web")
    print("     Ejecutar como: Yo")
    print("     Acceso: Cualquier persona")
    print()
    print("  4. Copia la URL del Apps Script y ponla en:")
    print(f"     public/empresas/{slug}/config.json → campo 'sheetsUrl'")
    print()
    print("  5. Llena el spreadsheet con los datos de tu empresa.")
    print()
    print("  COLUMNAS IMPORTANTES en la hoja Slots:")
    print("    - image_url: URL pública de la imagen del cromo")
    print("      Puede ser URL de tu servidor, Google Drive (público), etc.")
    print("      Ejemplo Drive: https://drive.google.com/uc?id=TU_FILE_ID")
    print()
    print(f"  ID del spreadsheet: {ss_id}")
    print("═" * 65)
    print()


# ── Main ───────────────────────────────────────────────────────────────────────

def pedir_datos():
    print()
    print("  Slug (identificador único, sin espacios, ej: mi-empresa):")
    slug = input("  > ").strip()

    if not slug or not re.match(r'^[a-z0-9][a-z0-9\-\.]*$', slug):
        print("  ❌ Slug inválido. Usa solo letras minúsculas, números y guiones.")
        sys.exit(1)

    print()
    print("  Nombre de la empresa (ej: Distribuidora Acme S.A.):")
    nombre = input("  > ").strip()

    if not nombre:
        nombre = slug.replace("-", " ").title()

    return slug, nombre


def main():
    print("═" * 65)
    print("  Creador de Spreadsheet para Álbum Empresa")
    print("═" * 65)

    # Argumentos opcionales desde CLI
    if len(sys.argv) >= 3:
        slug   = sys.argv[1].strip()
        nombre = sys.argv[2].strip()
    elif len(sys.argv) == 2:
        slug   = sys.argv[1].strip()
        nombre = slug.replace("-", " ").title()
    else:
        slug, nombre = pedir_datos()

    print()
    print(f"  Empresa : {nombre}")
    print(f"  Slug    : {slug}")
    print()

    print("  Autenticando con Google...")
    creds = autenticar()
    sheets_svc = build("sheets", "v4", credentials=creds)
    print("  ✓ Autenticado")

    print("  Creando spreadsheet...")
    ss_id = crear_spreadsheet(sheets_svc, nombre)
    print(f"  ✓ Creado (ID: {ss_id})")

    print()
    print("  URL del servidor (Enter para dejar en blanco):")
    server_url = input("  > ").strip().rstrip("/")

    album_path = EMPRESAS_DIR / slug / "albumData.json"
    if album_path.exists():
        print(f"  Cargando datos desde albumData.json de '{slug}'...")
        config_rows, grupos_rows, paises_rows, slots_rows = datos_desde_album(slug, nombre, server_url)
    else:
        print("  Preparando datos de ejemplo...")
        config_rows, grupos_rows, paises_rows, slots_rows = datos_ejemplo(slug, nombre, server_url)

    print("  Escribiendo datos...")
    escribir_datos(sheets_svc, ss_id, config_rows, grupos_rows, paises_rows, slots_rows)
    print("  ✓ Datos escritos")

    print("  Aplicando formato...")
    aplicar_formato(sheets_svc, ss_id, config_rows, grupos_rows, paises_rows, slots_rows)
    print("  ✓ Formato aplicado")

    print("  Creando directorio de empresa...")
    crear_directorio_empresa(slug, nombre, ss_id)
    actualizar_empresa_slug(slug)

    imprimir_instrucciones(ss_id, slug)


if __name__ == "__main__":
    main()
