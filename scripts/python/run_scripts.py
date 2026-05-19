"""
Launcher interactivo para ejecutar scripts del proyecto.

- Lista scripts ejecutables (root/*.py y scripts/*.py).
- Permite seleccionar uno por número.
- (Opcional) Permite pasar argumentos.
"""

from __future__ import annotations

import os
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class ScriptItem:
    path: Path
    title: str


def _read_title(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return path.name

    # Prefer docstring/module comment early in file
    lines = [ln.rstrip() for ln in text.splitlines()[:40]]
    # Find first non-empty content line that is not an import
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        if s.startswith(("import ", "from ")):
            continue
        # Strip quotes for one-liners
        s = s.strip('"\''" ")
        if len(s) > 80:
            s = s[:77] + "..."
        return s
    return path.name


def discover_scripts() -> list[ScriptItem]:
    items: list[ScriptItem] = []

    # 1) scripts/*.py
    scripts_dir = ROOT / "scripts"
    if scripts_dir.exists():
        for p in sorted(scripts_dir.glob("*.py")):
            if p.name.startswith("_"):
                continue
            items.append(ScriptItem(path=p, title=_read_title(p)))

    # 2) root/*.py (herramientas sueltas)
    for p in sorted(ROOT.glob("*.py")):
        if p.name == Path(__file__).name:
            continue
        if p.name.startswith("_"):
            continue
        items.append(ScriptItem(path=p, title=_read_title(p)))

    # De-dup por path real
    seen = set()
    dedup: list[ScriptItem] = []
    for it in items:
        key = str(it.path.resolve())
        if key in seen:
            continue
        seen.add(key)
        dedup.append(it)

    return dedup


def prompt_index(max_n: int) -> int:
    while True:
        raw = input("\nElige un script por número (Enter para cancelar): ").strip()
        if raw == "":
            raise SystemExit("Cancelado.")
        if raw.isdigit():
            idx = int(raw)
            if 1 <= idx <= max_n:
                return idx - 1
        print("Entrada inválida.")


def main() -> None:
    items = discover_scripts()
    if not items:
        raise SystemExit("No encontré scripts .py en root/ ni scripts/.")

    print(f"Base (origen): {ROOT}")
    print(f"Scripts encontrados: {len(items)}\n")

    for i, it in enumerate(items, 1):
        rel = it.path.relative_to(ROOT)
        print(f"{i:2d}) {rel}  —  {it.title}")

    choice = items[prompt_index(len(items))]

    rel = choice.path.relative_to(ROOT)
    print(f"\n▶ Ejecutando: {rel}")

    args_line = input("Argumentos (opcional, Enter = ninguno): ").strip()
    extra_args = shlex.split(args_line, posix=os.name != "nt") if args_line else []

    cmd = [sys.executable, str(choice.path), *extra_args]
    print(f"Comando: {' '.join(shlex.quote(c) for c in cmd)}\n")

    # Ejecutar en la raíz del proyecto
    proc = subprocess.run(cmd, cwd=str(ROOT))
    raise SystemExit(proc.returncode)


if __name__ == "__main__":
    main()

