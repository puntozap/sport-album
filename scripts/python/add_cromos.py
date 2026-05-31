from pathlib import Path
import re

BASE_DIR = Path(r"C:\laragon\www\album-panini\cromos_extraidos\grupos")

NUM_RE = re.compile(r"^\d+$")        # nombre = solo números (sin extensión)
GRUPO_RE = re.compile(r"^([a-zA-Z])(\d+)$")  # a1, B12, etc.


def carpeta_de_grupo(grupo: str) -> Path | None:
    m = GRUPO_RE.match(grupo.strip())
    if not m:
        return None
    letra, numero = m.group(1).lower(), m.group(2)
    return BASE_DIR / letra / numero


def es_nombre_numerico(path: Path) -> bool:
    return bool(NUM_RE.match(path.stem))


def obtener_max_numero(carpeta: Path) -> int:
    max_n = -1
    for p in carpeta.iterdir():
        if p.is_file() and es_nombre_numerico(p):
            n = int(p.stem)
            if n > max_n:
                max_n = n
    return max_n


def renombrar_no_numericos(carpeta: Path):
    if not carpeta.exists():
        print(f"ERROR: La carpeta no existe:\n   {carpeta}")
        return

    archivos = [p for p in carpeta.iterdir() if p.is_file()]
    numericos = [p for p in archivos if es_nombre_numerico(p)]
    no_numericos = [p for p in archivos if not es_nombre_numerico(p)]

    if not no_numericos:
        print("OK: No hay archivos para renombrar (todos ya son numericos).")
        return

    max_actual = obtener_max_numero(carpeta)
    siguiente = max_actual + 1

    no_numericos.sort(key=lambda p: p.name.lower())

    cambios = []
    numeros_asignados = []
    for p in no_numericos:
        destino = carpeta / f"{siguiente}{p.suffix.lower()}"
        cambios.append((p, destino))
        numeros_asignados.append(str(siguiente))
        siguiente += 1

    print("\nCarpeta seleccionada:")
    print(f"   {carpeta}")
    print("\nArchivos que se van a renombrar:\n")
    for src, dst in cambios:
        print(f"  {src.name}  →  {dst.name}")

    confirmar = input("\n¿Deseas continuar? escribe SI para renombrar: ").strip().upper()
    if confirmar != "SI":
        print("Cancelado.")
        return

    temporales = []
    for i, (src, dst) in enumerate(cambios, start=1):
        tmp = carpeta / f"__tmp__{i:04d}{src.suffix.lower()}"
        if tmp.exists():
            tmp.unlink()
        src.rename(tmp)
        temporales.append((tmp, dst))

    for tmp, dst in temporales:
        if dst.exists():
            dst.unlink()
        tmp.rename(dst)

    print("\nOK: Renombrado completado correctamente.")
    print(",".join(numeros_asignados))


def main():
    print("════════════════════════════════════════════")
    print("  Renombrar archivos NO numéricos por orden")
    print("════════════════════════════════════════════")

    grupo = input("\nIngresa el nombre del grupo (ej: a1): ").strip()
    carpeta = carpeta_de_grupo(grupo)

    if carpeta is None:
        print("ERROR: Formato invalido. Usa por ejemplo: a1, b12, c3")
        return

    renombrar_no_numericos(carpeta)


if __name__ == "__main__":
    main()
