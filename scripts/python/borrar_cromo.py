"""
Borra cromos del servidor via el endpoint manage-cromo.php.

Lista los grupos/equipos disponibles, te deja elegir uno,
muestra los .png que hay y te pregunta cuál(es) borrar.

USO:
  python scripts/borrar_cromo.py

SETUP:
  pip install requests   (si no lo tienes)
"""

import json
import requests

# ── Configuración ──────────────────────────────────────────────────
BASE_URL     = "https://sportalbum.chanzia.com/api/manage-cromo"
UPLOAD_TOKEN = "xK9#mP2$qR7nL4vT8wY1"
# ──────────────────────────────────────────────────────────────────

HEADERS = {"X-Upload-Token": UPLOAD_TOKEN}


def post(action: str, extra: dict = {}) -> dict:
    resp = requests.post(BASE_URL, headers=HEADERS,
                         data={"action": action, **extra}, timeout=15)
    resp.raise_for_status()
    return resp.json()


def elegir_grupo_numero(groups: dict) -> tuple[str, str]:
    # Aplanar en lista: [("a","1"), ("a","2"), ("b","1"), ...]
    opciones = []
    for letra in sorted(groups):
        for num in sorted(groups[letra], key=int):
            opciones.append((letra, num))

    print(f"\n  {'#':>3}  Grupo / Equipo")
    print(f"  {'─'*3}  {'─'*14}")
    for i, (g, n) in enumerate(opciones, 1):
        print(f"  {i:>3}  {g.upper()} / {n}")
    print()

    while True:
        raw = input("  Elige un número: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(opciones):
            return opciones[int(raw) - 1]
        print("  Número inválido, intenta de nuevo.")


def main():
    print("═" * 55)
    print("  Borrador de cromos — servidor")
    print("═" * 55)

    # 1. Listar grupos disponibles
    print("\n  Conectando al servidor...", end="", flush=True)
    data = post("list-groups")
    groups = data.get("groups", {})
    print("  ✓")

    if not groups:
        print("❌ No se encontraron grupos en el servidor.")
        return

    # 2. Elegir grupo/equipo
    grupo, numero = elegir_grupo_numero(groups)

    # 3. Listar archivos en esa carpeta
    data = post("list-files", {"grupo": grupo, "numero": numero})
    files = data.get("files", [])
    path  = data.get("path", f"grupos/{grupo}/{numero}")

    print(f"\n  📂 {path}")
    if files:
        print(f"  Archivos actuales ({len(files)}):")
        for f in files:
            print(f"    • {f}")
    else:
        print("  (carpeta vacía o sin .png)")

    # 4. Pedir qué borrar
    print()
    print("  Escribe el nombre(s) a borrar (sin .png o con él).")
    print("  Separa con espacios para borrar varios. Enter vacío = cancelar.")
    print()
    raw = input("  Archivo(s): ").strip()
    if not raw:
        print("\n  Cancelado.")
        return

    # Normalizar: agregar .png si no lo tienen
    nombres = []
    for parte in raw.split():
        nombre = parte if parte.lower().endswith(".png") else parte + ".png"
        nombres.append(nombre)

    # 5. Confirmar
    print()
    print(f"  Se van a borrar de  {path}:")
    for n in nombres:
        print(f"    ✗  {n}")
    print()
    confirm = input("  ¿Confirmar? (s/n): ").strip().lower()
    if confirm != "s":
        print("  Cancelado.")
        return

    # 6. Borrar
    result  = post("delete", {
        "grupo":  grupo,
        "numero": numero,
        "files":  json.dumps(nombres),
    })

    deleted = result.get("deleted", [])
    failed  = result.get("failed",  [])

    print()
    for d in deleted:
        print(f"  ✓  {d}  borrado")
    for f in failed:
        print(f"  ✗  {f['file']}  → {f['reason']}")

    print(f"\n{'═'*55}")
    print(f"  Resultado: {len(deleted)} borrado(s)  |  {len(failed)} fallido(s)")
    print(f"{'═'*55}\n")


if __name__ == "__main__":
    main()
