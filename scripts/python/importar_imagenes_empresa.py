"""
Copia imágenes extraídas de un PDF (pagina_01.png...) al formato
que espera el álbum empresa: 00.png, 01.png, ... dentro de cada entidad.

USO:
  python scripts/python/importar_imagenes_empresa.py

O pasando argumentos directamente:
  python scripts/python/importar_imagenes_empresa.py tachira dapta-a:12 dapta-b:7 C:\\ruta\\imagenes
"""

import sys
import shutil
from pathlib import Path

ROOT         = Path(__file__).parent.parent.parent
EMPRESAS_DIR = ROOT / "public" / "empresas"

# ── Colores ANSI ───────────────────────────────────────────────────────────────
G   = '\033[92m'
Y   = '\033[93m'
R   = '\033[91m'
DIM = '\033[2m'
W   = '\033[0m'

def ok(msg):  print(f"  {G}✓{W} {msg}")
def err(msg): print(f"  {R}✗{W} {msg}")
def tip(msg): print(f"  {DIM}{msg}{W}")


def pedir_datos():
    print(f"\n{Y}{'─'*50}{W}")
    print(f"{Y}  Importador de imágenes al álbum empresa{W}")
    print(f"{Y}{'─'*50}{W}\n")

    slug = input(f"  Slug de la empresa (ej: tachira): ").strip()
    if not slug:
        err("Slug vacío."); sys.exit(1)

    src_default = r"C:\laragon\www\dapta\imagenes_extraidas"
    src_raw = input(f"  Carpeta de imágenes [{src_default}]: ").strip()
    src = Path(src_raw or src_default)

    if not src.exists():
        err(f"No existe: {src}"); sys.exit(1)

    # Detectar imágenes pagina_XX.png
    imagenes = sorted(src.glob("pagina_*.png"))
    if not imagenes:
        err(f"No se encontraron archivos pagina_XX.png en {src}"); sys.exit(1)

    tip(f"Se encontraron {len(imagenes)} imágenes: {imagenes[0].name} … {imagenes[-1].name}")
    print()

    # Leer entidades del albumData.json si existe
    album_path = EMPRESAS_DIR / slug / "albumData.json"
    entidades_sugeridas = []
    if album_path.exists():
        import json
        with open(album_path, encoding="utf-8") as f:
            album = json.load(f)
        for g in album.get("groups", []):
            for e in g.get("entities", []):
                entidades_sugeridas.append((e["id"], e.get("stickerCount", 12)))
        if entidades_sugeridas:
            tip(f"Entidades en albumData.json: " +
                ", ".join(f"{eid}({n})" for eid, n in entidades_sugeridas))
            print()

    print("  Configura las entidades y cuántas imágenes van a cada una.")
    tip(f"  Total disponible: {len(imagenes)} imágenes (pagina_01 … pagina_{len(imagenes):02d})")
    print()

    entidades = []
    restantes = len(imagenes)
    idx_img = 0

    n = 1
    while restantes > 0:
        sugerido_id = entidades_sugeridas[n-1][0] if n-1 < len(entidades_sugeridas) else f"entidad-{n}"
        sugerido_n  = entidades_sugeridas[n-1][1] if n-1 < len(entidades_sugeridas) else restantes

        entity_id = input(f"  Entidad {n} — ID [{sugerido_id}]: ").strip() or sugerido_id
        cantidad  = input(f"  Entidad {n} — cuántos cromos [{sugerido_n}]: ").strip()
        try:
            cantidad = int(cantidad) if cantidad else sugerido_n
        except ValueError:
            cantidad = sugerido_n

        cantidad = min(cantidad, restantes)
        entidades.append((entity_id, idx_img, idx_img + cantidad))
        idx_img  += cantidad
        restantes -= cantidad
        n += 1

        if restantes > 0:
            otro = input(f"\n  Quedan {restantes} imágenes. ¿Agregar otra entidad? [S/n]: ").strip().lower()
            if otro in ('n', 'no'):
                tip(f"Se ignorarán las {restantes} imágenes restantes.")
                break

    return slug, src, imagenes, entidades


def copiar(slug, src, imagenes, entidades):
    print()
    for entity_id, desde, hasta in entidades:
        dest = EMPRESAS_DIR / slug / "cromos" / entity_id
        dest.mkdir(parents=True, exist_ok=True)

        slot = 0
        for i in range(desde, hasta):
            if i >= len(imagenes):
                break
            src_file  = imagenes[i]
            dest_file = dest / f"{slot:02d}.png"
            shutil.copy2(src_file, dest_file)
            tip(f"{src_file.name}  →  empresas/{slug}/cromos/{entity_id}/{dest_file.name}")
            slot += 1

        ok(f"Entidad '{entity_id}': {slot} imágenes copiadas → public/empresas/{slug}/cromos/{entity_id}/")

    print()
    ok(f"Listo. Ahora recarga http://localhost:5173/{slug}")


def main():
    if len(sys.argv) >= 4:
        # Modo CLI: slug entidad1:n1 entidad2:n2 [carpeta]
        slug = sys.argv[1]
        src  = Path(sys.argv[-1]) if not sys.argv[-1].startswith(tuple('abcdefghijklmnopqrstuvwxyz')) or '\\' in sys.argv[-1] or '/' in sys.argv[-1] else Path(r"C:\laragon\www\dapta\imagenes_extraidas")

        if not src.exists():
            src = Path(r"C:\laragon\www\dapta\imagenes_extraidas")

        imagenes = sorted(src.glob("pagina_*.png"))
        entidades = []
        idx = 0
        import re
        for arg in sys.argv[2:]:
            # Solo procesar args con formato entidad:numero (no rutas como C:\...)
            if not re.match(r'^[\w\-\.]+:\d+$', arg):
                continue
            eid, n = arg.split(':', 1)
            n = int(n)
            entidades.append((eid, idx, idx + n))
            idx += n
        copiar(slug, src, imagenes, entidades)
    else:
        slug, src, imagenes, entidades = pedir_datos()
        copiar(slug, src, imagenes, entidades)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n  {Y}Cancelado.{W}\n")
        sys.exit(0)
