"""
Despliega dist/ al servidor via FTP.
Sube todos los archivos del build EXCEPTO cromos_extraidos/ (esos los gestiona upload_cromos.py).

USO:
  python scripts/deploy.py

SETUP (solo la primera vez):
  Rellena FTP_HOST, FTP_USER, FTP_PASS y FTP_REMOTE_DIR abajo.
"""

import ftplib
import os
from pathlib import Path

# ── Configuración FTP ─────────────────────────────────────────────
FTP_HOST       = "sportalbum.chanzia.com"   # o la IP del servidor
FTP_USER       = ""                             # tu usuario FTP
FTP_PASS       = ""                             # tu contraseña FTP
FTP_REMOTE_DIR = "/public_html"                 # carpeta raíz en el servidor
FTP_PORT       = 21

# Carpetas que NO se suben (se gestionan por upload_cromos.py)
SKIP_DIRS = {"cromos_extraidos"}
SKIP_FILES = {
    # Estos JSON se modifican en runtime por PHP. Si los subes en cada deploy,
    # puedes sobreescribir datos y/o dejar permisos/ownership que impidan escribir.
    "api/matches-override.json",
    "api/players-override.json",
}

# ── Rutas locales ─────────────────────────────────────────────────
ROOT     = Path(__file__).parent.parent
DIST_DIR = ROOT / "dist"


def listar_archivos(base: Path) -> list[tuple[Path, str]]:
    """Devuelve lista de (ruta_local, ruta_relativa_unix) a subir."""
    resultado = []
    for path in sorted(base.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(base)
        rel_unix = rel.as_posix()
        partes = rel.parts
        # Saltar carpetas excluidas
        if any(p in SKIP_DIRS for p in partes):
            continue
        if rel_unix in SKIP_FILES:
            continue
        resultado.append((path, rel_unix))
    return resultado


def asegurar_directorio(ftp: ftplib.FTP, remoto: str):
    """Crea el directorio remoto si no existe (recursivo)."""
    partes = remoto.strip("/").split("/")
    acumulado = ""
    for parte in partes:
        acumulado += "/" + parte
        try:
            ftp.mkd(acumulado)
        except ftplib.error_perm:
            pass  # ya existe


def subir_archivo(ftp: ftplib.FTP, local: Path, remoto: str):
    directorio = remoto.rsplit("/", 1)[0] if "/" in remoto else ""
    if directorio:
        asegurar_directorio(ftp, f"{FTP_REMOTE_DIR}/{directorio}")
    with open(local, "rb") as f:
        ftp.storbinary(f"STOR {FTP_REMOTE_DIR}/{remoto}", f)


def main():
    if not FTP_USER or not FTP_PASS:
        print("❌ Rellena FTP_USER y FTP_PASS en scripts/deploy.py antes de ejecutar.")
        return

    archivos = listar_archivos(DIST_DIR)
    total = len(archivos)

    print("═" * 60)
    print(f"  Deploy: dist/ → {FTP_HOST}{FTP_REMOTE_DIR}")
    print(f"  Archivos a subir: {total}")
    print("═" * 60)

    ftp = ftplib.FTP()
    ftp.connect(FTP_HOST, FTP_PORT, timeout=30)
    ftp.login(FTP_USER, FTP_PASS)
    ftp.set_pasv(True)

    ok = 0
    fail = 0
    fallos = []

    for i, (local, remoto) in enumerate(archivos, 1):
        etiqueta = f"[{i}/{total}]"
        print(f"  {etiqueta:>10}  ↑ {remoto}", end="", flush=True)
        try:
            subir_archivo(ftp, local, remoto)
            print("  ✓")
            ok += 1
        except Exception as e:
            print(f"  ✗  {e}")
            fallos.append(remoto)
            fail += 1

    ftp.quit()

    print(f"\n{'═'*60}")
    print(f"  Resultado: {ok} subidos  |  {fail} fallidos")
    if fallos:
        print(f"\n  Fallidos:")
        for f in fallos:
            print(f"    - {f}")
    print("═" * 60)


if __name__ == "__main__":
    main()
