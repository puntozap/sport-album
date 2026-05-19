"""
Organiza cromos por grupo/orden del álbum.

Contexto (ya existente en este repo):
- `cutter.py` extrae cromos por página a `cromos_extraidos/pagina_XX/...`
- luego se han venido agrupando cromos en `cromos_extraidos/grupos/<letra>/<1..4>/...`

Este script crea la estructura solicitada:
  cromos_extraidos/grupo/<LETRA>/<1..4>/

Y copia (o mueve) el contenido desde `cromos_extraidos/grupos/`.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


DEFAULT_SRC = Path("cromos_extraidos") / "grupos"
DEFAULT_DST = Path("cromos_extraidos") / "grupos"


def iter_png_files(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    return sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".png"])


def copy_or_move_file(src: Path, dst: Path, mode: str) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if mode == "copy":
        shutil.copy2(src, dst)
    elif mode == "move":
        shutil.move(str(src), str(dst))
    else:
        raise ValueError(f"Unknown mode: {mode}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Crea cromos_extraidos/grupo/<LETRA>/<1..4> copiando desde cromos_extraidos/grupos/."
    )
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC, help="Carpeta origen (default: cromos_extraidos/grupos)")
    parser.add_argument("--dst", type=Path, default=DEFAULT_DST, help="Carpeta destino (default: cromos_extraidos/grupo)")
    parser.add_argument(
        "--mode",
        choices=["copy", "move"],
        default="copy",
        help="Acción sobre los archivos (default: copy)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Si existe un archivo destino, lo reemplaza (default: no)",
    )
    args = parser.parse_args()

    src_base: Path = args.src
    dst_base: Path = args.dst

    if not src_base.exists():
        raise SystemExit(f"No existe la carpeta origen: {src_base}")

    dst_base.mkdir(parents=True, exist_ok=True)

    group_dirs = sorted([p for p in src_base.iterdir() if p.is_dir()])
    if not group_dirs:
        print(f"No se encontraron grupos en: {src_base}")
        return 0

    total = 0
    for group_dir in group_dirs:
        group_letter = group_dir.name.strip().upper()
        if not group_letter:
            continue

        # Esperado: 1..4 (pero no asumimos; copiamos todas las carpetas numéricas)
        team_folders = sorted([p for p in group_dir.iterdir() if p.is_dir()], key=lambda p: p.name)

        for team_folder in team_folders:
            slot_name = team_folder.name.strip()
            if not slot_name:
                continue

            dst_folder = dst_base / group_letter / slot_name
            dst_folder.mkdir(parents=True, exist_ok=True)

            for png in iter_png_files(team_folder):
                dst_file = dst_folder / png.name
                if dst_file.exists() and not args.overwrite:
                    continue
                if dst_file.exists() and args.overwrite:
                    dst_file.unlink()
                copy_or_move_file(png, dst_file, args.mode)
                total += 1

    print(f"OK. Archivos procesados: {total}")
    print(f"Origen:  {src_base}")
    print(f"Destino: {dst_base}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
