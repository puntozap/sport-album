"""
Sube imágenes de cromos para una empresa al servidor.

Lee la configuración desde public/empresas/{slug}/config.json:
  - serverUrl   → URL base del servidor
  - uploadToken → token de autorización
  - albumId     → slug de la empresa

Las imágenes locales deben estar en:
  public/empresas/{slug}/cromos/{country_id}/00.webp, 01.webp, etc.

Las rutas de destino se toman del albumData.json o del Google Sheet (image_url).

USO:
  python scripts/python/upload_empresa_cromos.py
  python scripts/python/upload_empresa_cromos.py nueva-empresa
  python scripts/python/upload_empresa_cromos.py nueva-empresa equipo-alpha

SETUP (solo la primera vez):
  pip install requests
"""

import os
import sys
import json
import warnings
import requests
from pathlib import Path

# Suprimir warning de SSL cuando verify=False
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

# ── Rutas base ─────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent.parent
EMPRESAS_DIR = ROOT / "public" / "empresas"

IMG_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg"]

UPLOAD_ENDPOINT = "/api/upload-cromo.php"


# ── Leer configuración de empresa ─────────────────────────────────────────────

def cargar_config(slug):
    config_path = EMPRESAS_DIR / slug / "config.json"
    if not config_path.exists():
        print(f"\n❌ No encontré: {config_path}")
        print(f"   Ejecuta primero: python scripts/python/create_empresa_sheet.py {slug}")
        sys.exit(1)

    with open(config_path, encoding="utf-8") as f:
        cfg = json.load(f)

    server_url   = cfg.get("serverUrl", "").rstrip("/")
    upload_token = cfg.get("uploadToken", "")
    sheets_url   = cfg.get("sheetsUrl", "")

    if not server_url or server_url.startswith("("):
        print(f"\n⚠️  serverUrl no configurado en {config_path}")
        server_url = input("   URL del servidor (ej: https://midominio.com): ").strip().rstrip("/")
        if not server_url:
            sys.exit(1)

    if not upload_token or upload_token.startswith("("):
        print(f"\n⚠️  uploadToken no configurado en {config_path}")
        upload_token = input("   Token de subida: ").strip()
        if not upload_token:
            sys.exit(1)

    return server_url, upload_token, sheets_url


# ── Leer entidades desde el Google Sheet (Apps Script) ────────────────────────

def cargar_entidades_desde_sheet(sheets_url):
    """Llama al Apps Script y extrae las entidades con sus slots."""
    print(f"  Leyendo estructura desde Google Sheet...", end="", flush=True)
    try:
        resp = requests.get(sheets_url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  ✗\n❌ Error al leer el Sheet: {e}")
        sys.exit(1)

    if "error" in data:
        print(f"  ✗\n❌ El Sheet devolvió error: {data['error']}")
        sys.exit(1)

    print("  ✓")

    default_count = int(data.get("stickerCount", 12))
    entities = []
    for group in data.get("groups", []):
        for entity in group.get("entities", []):
            count = int(entity.get("stickerCount", default_count))
            # Leer slots definidos en el sheet
            stickers = entity.get("stickers", [])
            slot_nums = sorted(s["slot"] for s in stickers) if stickers else list(range(count))
            entities.append({
                "id":            entity["id"],
                "name":          entity.get("name", entity["id"]),
                "sticker_count": count,
                "slots":         slot_nums,
            })
    return entities


# ── Fallback: leer entidades del albumData.json local ─────────────────────────

def cargar_entidades_local(slug):
    album_path = EMPRESAS_DIR / slug / "albumData.json"
    if not album_path.exists():
        return None

    with open(album_path, encoding="utf-8") as f:
        data = json.load(f)

    default_count = int(data.get("stickerCount", 12))
    entities = []
    for group in data.get("groups", []):
        for entity in group.get("entities", []):
            count = int(entity.get("stickerCount", default_count))
            slots = sorted(s["slot"] for s in entity.get("stickers", []))
            entities.append({
                "id":            entity["id"],
                "name":          entity.get("name", entity["id"]),
                "sticker_count": count,
                "slots":         slots or list(range(count)),
            })
    return entities


def cargar_entidades(slug, sheets_url):
    """Intenta leer del Sheet; fallback a albumData.json local."""
    if sheets_url and sheets_url.startswith("https://script.google.com"):
        return cargar_entidades_desde_sheet(sheets_url)

    print("  ⚠️  No hay sheetsUrl — leyendo albumData.json local...")
    entities = cargar_entidades_local(slug)
    if not entities:
        print(f"\n❌ No encontré albumData.json en public/empresas/{slug}/")
        print(f"   Configura sheetsUrl en config.json o crea albumData.json")
        sys.exit(1)
    return entities


# ── Encontrar imagen local para un slot ───────────────────────────────────────

def buscar_imagen(slug, country_id, slot_idx):
    """Busca el archivo de imagen para un slot en el filesystem local."""
    base_dir  = EMPRESAS_DIR / slug / "cromos" / country_id
    filename  = f"{slot_idx:02d}"

    for ext in IMG_EXTENSIONS:
        path = base_dir / f"{filename}{ext}"
        if path.exists():
            return path

    return None


# ── Subir imagen al servidor ───────────────────────────────────────────────────

def subir_imagen(server_url, upload_token, local_path, server_path):
    """
    POST al endpoint upload-cromo.php.
    server_path: ruta relativa en el servidor, ej: /empresas/slug/cromos/equipo/00.webp
    """
    url = f"{server_url}{UPLOAD_ENDPOINT}"

    with open(local_path, "rb") as f:
        mime = "image/webp"
        ext  = local_path.suffix.lower()
        if ext == ".png":  mime = "image/png"
        if ext in (".jpg", ".jpeg"): mime = "image/jpeg"

        resp = requests.post(
            url,
            headers={"X-Upload-Token": upload_token},
            data={
                "action":     "upload",
                "serverPath": server_path,  # ruta destino en servidor
            },
            files={"file": (local_path.name, f, mime)},
            timeout=30,
            verify=False,
        )

    if resp.status_code == 200:
        try:
            return True, resp.json()
        except Exception:
            return True, {}
    else:
        try:
            return False, resp.json()
        except Exception:
            return False, {"error": f"HTTP {resp.status_code} — {resp.text[:200]}"}


# ── Main ───────────────────────────────────────────────────────────────────────

def elegir_slug():
    empresas = [d.name for d in EMPRESAS_DIR.iterdir()
                if d.is_dir() and not d.name.startswith("_")]
    if not empresas:
        print("❌ No hay empresas en public/empresas/")
        sys.exit(1)

    print("\n  Empresas disponibles:")
    for i, e in enumerate(empresas, 1):
        print(f"    {i}. {e}")
    print()
    raw = input("  Elige número o escribe el slug: ").strip()

    if raw.isdigit() and 1 <= int(raw) <= len(empresas):
        return empresas[int(raw) - 1]
    if raw in empresas:
        return raw
    print(f"❌ '{raw}' no encontrado.")
    sys.exit(1)


def main():
    print("═" * 60)
    print("  Uploader de cromos empresa → Servidor")
    print("═" * 60)

    # Argumentos CLI
    slug        = sys.argv[1].strip() if len(sys.argv) > 1 else None
    filter_team = sys.argv[2].strip() if len(sys.argv) > 2 else None

    if not slug:
        slug = elegir_slug()

    server_url, upload_token, sheets_url = cargar_config(slug)
    entities = cargar_entidades(slug, sheets_url)

    if filter_team:
        entities = [e for e in entities if e["id"] == filter_team]
        if not entities:
            print(f"❌ Entidad '{filter_team}' no encontrada.")
            sys.exit(1)

    print(f"\n  Empresa  : {slug}")
    print(f"  Servidor : {server_url}")
    print(f"  Entidades: {len(entities)}")
    print()

    total_ok   = 0
    total_fail = 0
    total_skip = 0

    for entity in entities:
        count = entity["sticker_count"]
        print(f"  📁 {entity['name']} ({entity['id']}) — {count} slots")

        for slot_idx in range(count):
            local_path = buscar_imagen(slug, entity["id"], slot_idx)
            server_path = f"/empresas/{slug}/cromos/{entity['id']}/{slot_idx:02d}.webp"

            label = f"    [{slot_idx:02d}]"

            if not local_path:
                print(f"  {label}  ⚪ Sin imagen local")
                total_skip += 1
                continue

            print(f"  {label}  ↑ {local_path.name}", end="", flush=True)

            ok, body = subir_imagen(server_url, upload_token, local_path, server_path)

            if ok:
                print(f"  → ✓  {server_path}")
                total_ok += 1
            else:
                print(f"  → ✗  {json.dumps(body, ensure_ascii=False)}")
                total_fail += 1

        print()

    print("═" * 60)
    print(f"  ✓ Subidos  : {total_ok}")
    print(f"  ✗ Fallidos : {total_fail}")
    print(f"  ⚪ Sin imagen: {total_skip}")
    print("═" * 60)

    if total_ok > 0:
        print()
        print("  Las rutas de imagen en el servidor quedan en:")
        print(f"  /empresas/{slug}/cromos/{{equipo}}/{{slot:02d}}.webp")
        print()
        print("  Si usas Google Sheet, actualiza image_url con esas rutas")
        print("  (ya están pre-rellenadas si creaste el sheet con create_empresa_sheet.py)")


if __name__ == "__main__":
    main()
