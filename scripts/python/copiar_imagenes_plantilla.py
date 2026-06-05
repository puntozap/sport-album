"""
Copia las imágenes locales de la plantilla a la carpeta de cromos del álbum.
Lee imagen_local de cada sticker en albumData.json y las copia como:
  public/empresas/{slug}/cromos/{entity_id}/00.{ext}, 01.{ext}, ...

USO:
  python scripts/python/copiar_imagenes_plantilla.py
  python scripts/python/copiar_imagenes_plantilla.py futve tachira "C:/laragon/www/football"
"""

import json
import os
import sys
import shutil
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stdin.reconfigure(encoding='utf-8')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stdin  = io.TextIOWrapper(sys.stdin.buffer,  encoding='utf-8')

G   = '\033[92m'
Y   = '\033[93m'
B   = '\033[94m'
C   = '\033[96m'
R   = '\033[91m'
DIM = '\033[2m'
W   = '\033[0m'
LINE = '-' * 58

def ok(msg):   print('  ' + G + 'OK  ' + W + msg)
def warn(msg): print('  ' + Y + 'WARN ' + W + msg)
def tip(msg):  print('  ' + DIM + msg + W)
def h1(msg):   print('\n' + B + LINE + W + '\n' + B + '  ' + msg + W + '\n' + B + LINE + W)
def err(msg):  print('  ' + R + 'ERROR: ' + W + msg)

ROOT         = Path(__file__).resolve().parent.parent.parent
EMPRESAS_DIR = ROOT / 'public' / 'empresas'


def listar_empresas():
    return [
        d for d in sorted(os.listdir(EMPRESAS_DIR))
        if not d.startswith('_') and
        (EMPRESAS_DIR / d / 'albumData.json').exists()
    ]


def elegir_empresa():
    empresas = listar_empresas()
    print()
    for i, e in enumerate(empresas, 1):
        print(f'  {Y}{i}{W}) {e}')
    print()
    val = input(f'  {Y}Empresa (número o slug):{W} ').strip()
    if val.isdigit():
        idx = int(val) - 1
        if 0 <= idx < len(empresas):
            return empresas[idx]
    if val in empresas:
        return val
    err(f'Empresa "{val}" no encontrada.')
    sys.exit(1)


def elegir_entidad(album):
    entidades = []
    for g in album.get('groups', []):
        for e in g.get('entities', []):
            entidades.append((g['id'], e))
    print()
    for i, (gid, e) in enumerate(entidades, 1):
        filled = sum(1 for s in e.get('stickers', []) if s.get('imagen_local') or s.get('image_url'))
        print(f'  {Y}{i}{W}) [{gid}] {e["name"]}  ({filled} imágenes en stickers)')
    print()
    val = input(f'  {Y}Entidad (número o id):{W} ').strip()
    if val.isdigit():
        idx = int(val) - 1
        if 0 <= idx < len(entidades):
            return entidades[idx][1]
    for _, e in entidades:
        if e['id'] == val:
            return e
    err(f'Entidad "{val}" no encontrada.')
    sys.exit(1)


def elegir_base_dir():
    print()
    tip('Directorio base donde están las imágenes locales.')
    tip('Ejemplo: C:/laragon/www/football')
    ruta = input(f'  {Y}Directorio base:{W} ').strip().strip('"').strip("'")
    p = Path(ruta)
    if not p.exists():
        err(f'No encontré el directorio: {p}')
        sys.exit(1)
    return p


def resolver_imagen(imagen_local: str, base_dir: Path) -> Path | None:
    """Resuelve la ruta completa de imagen_local usando base_dir como raíz."""
    # Normalizar separadores
    rel = Path(imagen_local.replace('\\', os.sep).replace('/', os.sep))
    # Probar directamente
    full = base_dir / rel
    if full.exists():
        return full
    # A veces la ruta empieza con el nombre del equipo que ya está en base_dir
    # Intentar sin el primer componente
    parts = rel.parts
    if len(parts) > 1:
        full2 = base_dir / Path(*parts[1:])
        if full2.exists():
            return full2
    return None


def generar_manifest(dst_folder: Path, sticker_count: int) -> dict:
    manifest = {}
    for i in range(sticker_count):
        base = dst_folder / f'{i:02d}'
        for ext in ['.webp', '.jpg', '.jpeg', '.png', '.avif']:
            if (base.parent / (base.name + ext)).exists():
                manifest[str(i)] = f'{i:02d}{ext}'
                break
    return manifest


def main():
    h1('COPIAR IMÁGENES DE PLANTILLA → CROMOS')

    if len(sys.argv) == 4:
        slug       = sys.argv[1]
        entity_id  = sys.argv[2]
        base_dir   = Path(sys.argv[3])
        album_path = EMPRESAS_DIR / slug / 'albumData.json'
        with open(album_path, encoding='utf-8') as f:
            album = json.load(f)
        entidad = None
        for g in album.get('groups', []):
            for e in g.get('entities', []):
                if e['id'] == entity_id:
                    entidad = e
    else:
        slug       = elegir_empresa()
        album_path = EMPRESAS_DIR / slug / 'albumData.json'
        with open(album_path, encoding='utf-8') as f:
            album = json.load(f)
        entidad   = elegir_entidad(album)
        entity_id = entidad['id']
        base_dir  = elegir_base_dir()

    if not entidad:
        err(f'Entidad "{entity_id}" no encontrada.')
        sys.exit(1)

    stickers      = entidad.get('stickers', [])
    sticker_count = entidad.get('stickerCount') or album.get('stickerCount', 12)
    dst_folder    = EMPRESAS_DIR / slug / 'cromos' / entity_id

    print(f'\n  Empresa   : {C}{slug}{W}')
    print(f'  Entidad   : {C}{entidad["name"]}{W}')
    print(f'  Destino   : {C}{dst_folder.relative_to(ROOT)}{W}')
    print(f'  Base imgs : {C}{base_dir}{W}\n')

    # Construir plan de copia
    plan = []  # (slot, src, dst, nombre)
    sin_imagen = []

    for s in stickers:
        slot = s.get('slot', 0)
        nombre = s.get('name', f'Slot {slot}')

        if s.get('imagen_local'):
            src = resolver_imagen(s['imagen_local'], base_dir)
            if src:
                ext = src.suffix.lower()
                dst = dst_folder / f'{slot:02d}{ext}'
                plan.append((slot, src, dst, nombre))
            else:
                sin_imagen.append((slot, nombre, s['imagen_local']))
        else:
            sin_imagen.append((slot, nombre, '(sin imagen_local)'))

    # Preview
    print(f'  {DIM}{"SLOT":<6} {"NOMBRE":<32} {"ARCHIVO ORIGEN"}{W}')
    print(f'  {DIM}{"-"*72}{W}')
    for slot, src, dst, nombre in sorted(plan, key=lambda x: x[0]):
        print(f'  {slot:<6} {nombre:<32} {src.name}')

    if sin_imagen:
        print()
        warn(f'{len(sin_imagen)} slots sin imagen local:')
        for slot, nombre, path in sin_imagen:
            tip(f'  slot {slot:02d} — {nombre}  [{path}]')

    if not plan:
        err('No hay imágenes para copiar.')
        sys.exit(1)

    print()
    confirmar = input(f'  {Y}Copiar {len(plan)} imagen(es)? [S/n]:{W} ').strip().lower()
    if confirmar in ('n', 'no'):
        print(f'  {Y}Cancelado.{W}')
        return

    dst_folder.mkdir(parents=True, exist_ok=True)

    for slot, src, dst, nombre in sorted(plan, key=lambda x: x[0]):
        # Borrar versiones previas con otra extensión
        for ext in ['.webp', '.jpg', '.jpeg', '.png', '.avif']:
            old = dst_folder / f'{slot:02d}{ext}'
            if old.exists() and old != dst:
                old.unlink()
        shutil.copy2(src, dst)
        ok(f'slot {slot:02d} → {dst.name}  ({nombre})')

    # Generar manifest.json
    manifest = generar_manifest(dst_folder, sticker_count)
    manifest_path = dst_folder / 'manifest.json'
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    ok(f'manifest.json generado ({len(manifest)} entradas)')

    print(f'\n  {G}Listo. {len(plan)} imágenes copiadas a "{entity_id}".{W}\n')
    tip('Próximo paso: npm run build  o subir al servidor con upload_empresa_cromos.py')
    print()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n\n  {Y}Cancelado.{W}\n')
        sys.exit(0)
