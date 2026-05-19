"""
organizar_por_grupo.py
======================
Copia las carpetas pagina_XX que ya existen en cromos_extraidos
hacia la estructura:

    cromos_extraidos/grupo/<LETRA>/<ORDEN>/<pagina_XX>/

  <LETRA>  = letra del grupo (A … L)
  <ORDEN>  = 1-4 según el orden del equipo en el álbum
  <pagina_XX> = la carpeta original, conservada con su nombre

Ejemplo:
    cromos_extraidos/grupo/A/1/pagina_35/   ← México (página 35 del PDF)
    cromos_extraidos/grupo/A/1/pagina_36/   ← México (página 36 del PDF)
    cromos_extraidos/grupo/A/2/pagina_48/   ← Sudáfrica
    ...

Uso:
    python organizar_por_grupo.py              # copia (conserva originales)
    python organizar_por_grupo.py --mode move  # mueve (libera espacio)
    python organizar_por_grupo.py --overwrite  # reemplaza si ya existe
    python organizar_por_grupo.py --dry-run    # sólo muestra, no toca nada
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


# ══════════════════════════════════════════════════════════════════
#  MAPEO: grupo / orden en álbum / equipo / páginas del PDF
# ══════════════════════════════════════════════════════════════════

MAPPING: list[dict] = [
    # GRUPO A
    {"group": "A", "order": 1, "team": "Mexico",          "stickerPages": [35, 36]},
    {"group": "A", "order": 2, "team": "South Africa",    "stickerPages": [48]},
    {"group": "A", "order": 3, "team": "Korea Republic",  "stickerPages": [16]},
    {"group": "A", "order": 4, "team": "Czechia",         "stickerPages": [46, 40, 41]},
    # GRUPO B
    {"group": "B", "order": 1, "team": "Canada",          "stickerPages": [13, 5]},
    {"group": "B", "order": 2, "team": "Bosnia",          "stickerPages": [9]},
    {"group": "B", "order": 3, "team": "Qatar",           "stickerPages": [44]},
    {"group": "B", "order": 4, "team": "Switzerland",     "stickerPages": [50, 32]},
    # GRUPO C
    {"group": "C", "order": 1, "team": "Brazil",          "stickerPages": [10, 11]},
    {"group": "C", "order": 2, "team": "Morocco",         "stickerPages": [34]},
    {"group": "C", "order": 3, "team": "Haiti",           "stickerPages": [28]},
    {"group": "C", "order": 4, "team": "Scotland",        "stickerPages": [22]},
    # GRUPO D
    {"group": "D", "order": 1, "team": "USA",             "stickerPages": [25, 5, 10]},
    {"group": "D", "order": 2, "team": "Paraguay",        "stickerPages": [41]},
    {"group": "D", "order": 3, "team": "Australia",       "stickerPages": [6]},
    {"group": "D", "order": 4, "team": "Turkiye",         "stickerPages": [52, 21]},
    # GRUPO E
    {"group": "E", "order": 1, "team": "Germany",         "stickerPages": [1]},
    {"group": "E", "order": 2, "team": "Curacao",         "stickerPages": [19]},
    {"group": "E", "order": 3, "team": "Cote d Ivoire",   "stickerPages": [17, 5]},
    {"group": "E", "order": 4, "team": "Ecuador",         "stickerPages": [20, 10]},
    # GRUPO F
    {"group": "F", "order": 1, "team": "Netherlands",     "stickerPages": [36, 39]},
    {"group": "F", "order": 2, "team": "Japan",           "stickerPages": [32]},
    {"group": "F", "order": 3, "team": "Sweden",          "stickerPages": [49]},
    {"group": "F", "order": 4, "team": "Tunisia",         "stickerPages": [51, 47]},
    # GRUPO G
    {"group": "G", "order": 1, "team": "Belgium",         "stickerPages": [8]},
    {"group": "G", "order": 2, "team": "Egypt",           "stickerPages": [21, 18]},
    {"group": "G", "order": 3, "team": "Iran",            "stickerPages": [30]},
    {"group": "G", "order": 4, "team": "New Zealand",     "stickerPages": [38]},
    # GRUPO H
    {"group": "H", "order": 1, "team": "Spain",           "stickerPages": [23, 24]},
    {"group": "H", "order": 2, "team": "Cabo Verde",      "stickerPages": [12]},
    {"group": "H", "order": 3, "team": "Saudi Arabia",    "stickerPages": [2]},
    {"group": "H", "order": 4, "team": "Uruguay",         "stickerPages": [53]},
    # GRUPO I
    {"group": "I", "order": 1, "team": "France",          "stickerPages": [24, 26]},
    {"group": "I", "order": 2, "team": "Senegal",         "stickerPages": [47]},
    {"group": "I", "order": 3, "team": "Iraq",            "stickerPages": [31]},
    {"group": "I", "order": 4, "team": "Norway",          "stickerPages": [37]},
    # GRUPO J
    {"group": "J", "order": 1, "team": "Argentina",       "stickerPages": [4, 5]},
    {"group": "J", "order": 2, "team": "Algeria",         "stickerPages": [3]},
    {"group": "J", "order": 3, "team": "Austria",         "stickerPages": [7]},
    {"group": "J", "order": 4, "team": "Jordan",          "stickerPages": [33, 21]},
    # GRUPO K
    {"group": "K", "order": 1, "team": "Portugal",        "stickerPages": [42, 43]},
    {"group": "K", "order": 2, "team": "Congo DR",        "stickerPages": [45]},
    {"group": "K", "order": 3, "team": "Uzbekistan",      "stickerPages": [54]},
    {"group": "K", "order": 4, "team": "Colombia",        "stickerPages": [15]},
    # GRUPO L
    {"group": "L", "order": 1, "team": "England",         "stickerPages": [29, 18]},
    {"group": "L", "order": 2, "team": "Croatia",         "stickerPages": [18]},
    {"group": "L", "order": 3, "team": "Ghana",           "stickerPages": [27, 18]},
    {"group": "L", "order": 4, "team": "Panama",          "stickerPages": [40]},
]


# ══════════════════════════════════════════════════════════════════
#  LÓGICA
# ══════════════════════════════════════════════════════════════════

def copy_folder(src: Path, dst: Path, overwrite: bool, dry: bool) -> int:
    """Copia el contenido de src dentro de dst/src.name. Devuelve nº de archivos copiados."""
    dst_folder = dst / src.name

    if dst_folder.exists() and not overwrite:
        print(f"    ↷ ya existe {dst_folder.name} — omitido (usa --overwrite)")
        return 0

    if dry:
        pngs = [p for p in src.iterdir() if p.is_file() and p.suffix.lower() == ".png"]
        print(f"    [dry] {src.name}/ → {dst_folder}  ({len(pngs)} archivos)")
        return len(pngs)

    if dst_folder.exists() and overwrite:
        shutil.rmtree(dst_folder)

    shutil.copytree(src, dst_folder)
    count = sum(1 for p in dst_folder.rglob("*.png"))
    print(f"    ✓ {src.name}/  ({count} archivos)")
    return count


def move_folder(src: Path, dst: Path, overwrite: bool, dry: bool) -> int:
    dst_folder = dst / src.name

    if dst_folder.exists() and not overwrite:
        print(f"    ↷ ya existe {dst_folder.name} — omitido (usa --overwrite)")
        return 0

    if dry:
        pngs = [p for p in src.iterdir() if p.is_file() and p.suffix.lower() == ".png"]
        print(f"    [dry] MOVER {src.name}/ → {dst_folder}  ({len(pngs)} archivos)")
        return len(pngs)

    if dst_folder.exists() and overwrite:
        shutil.rmtree(dst_folder)

    dst.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), dst_folder)
    count = sum(1 for p in dst_folder.rglob("*.png"))
    print(f"    ✓ MOVIDO {src.name}/  ({count} archivos)")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Organiza pagina_XX → cromos_extraidos/grupo/<LETRA>/<1-4>/pagina_XX/",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--src", type=Path, default=Path("cromos_extraidos"),
                        help="Carpeta raíz con las subcarpetas pagina_XX (default: cromos_extraidos)")
    parser.add_argument("--dst", type=Path, default=Path("cromos_extraidos") / "grupos",
                        help="Destino base (default: cromos_extraidos/grupos)")
    parser.add_argument("--mode", choices=["copy", "move"], default="copy",
                        help="'copy' conserva los originales (default), 'move' los desplaza")
    parser.add_argument("--overwrite", action="store_true",
                        help="Reemplaza carpetas destino si ya existen")
    parser.add_argument("--dry-run", action="store_true",
                        help="Muestra lo que haría sin modificar nada")
    args = parser.parse_args()

    src_base: Path  = args.src
    dst_base: Path  = args.dst
    mode: str       = args.mode
    overwrite: bool = args.overwrite
    dry: bool       = args.dry_run

    if not src_base.exists():
        raise SystemExit(f"✗ Carpeta origen no encontrada: {src_base}")

    if dry:
        print("═" * 60)
        print("  DRY-RUN — no se modificará nada")
        print("═" * 60)

    total_files   = 0
    total_missing = 0

    for entry in MAPPING:
        group = entry["group"]
        order = entry["order"]
        team  = entry["team"]
        pages = entry["stickerPages"]

        dst_team = dst_base / group / str(order)
        print(f"\nGrupo {group} · {order}/4 · {team}")

        for page_num in pages:
            src_folder = src_base / f"pagina_{page_num:02d}"

            if not src_folder.exists():
                print(f"  ⚠  {src_folder.name} — no encontrada")
                total_missing += 1
                continue

            if not dry:
                dst_team.mkdir(parents=True, exist_ok=True)

            if mode == "copy":
                n = copy_folder(src_folder, dst_team, overwrite, dry)
            else:
                n = move_folder(src_folder, dst_team, overwrite, dry)

            total_files += n

    print("\n" + "═" * 60)
    print(f"  Archivos procesados : {total_files}")
    print(f"  Carpetas no halladas: {total_missing}")
    print(f"  Destino             : {dst_base}")
    if dry:
        print("  (dry-run — no se tocó nada)")
    print("═" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
