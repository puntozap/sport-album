"""
Renombra las imagenes YA EXISTENTES en una carpeta de cromos al formato correcto.

USO:
  python scripts/python/renombrar_cromos_existentes.py

Toma las imagenes que ya estan en public/empresas/{slug}/cromos/{entity-id}/
y las renombra a 00.webp, 01.webp, 02.webp ... en orden alfabetico.

El slot 0 siempre sera la primera imagen (holograma).
"""

import json
import os
import sys
import shutil

# Forzar UTF-8 en terminal Windows
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
LINE = '-' * 52

def ok(msg):  print('  ' + G + 'OK ' + W + msg)
def tip(msg): print('  ' + DIM + msg + W)
def h1(msg):  print('\n' + B + LINE + W + '\n' + B + msg + W + '\n' + B + LINE + W)
def h2(msg):  print('\n' + C + '> ' + msg + W)
def err(msg): print('  ' + R + 'ERROR: ' + W + msg)
def warn(msg): print('  ' + Y + 'AVISO: ' + W + msg)

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
EMPRESAS_DIR = os.path.join(PROJECT_ROOT, 'public', 'empresas')

IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

def ask(prompt, default=None, required=False):
    hint = f' [{default}]' if default is not None else ''
    while True:
        val = input(f'  {Y}{prompt}{hint}:{W} ').strip()
        if not val and default is not None:
            return default
        if not val and required:
            print(f'  {R}Campo obligatorio.{W}')
            continue
        return val or ''

def list_empresas():
    return [
        d for d in sorted(os.listdir(EMPRESAS_DIR))
        if not d.startswith('_') and
        os.path.isfile(os.path.join(EMPRESAS_DIR, d, 'albumData.json'))
    ]

def load_album(slug):
    path = os.path.join(EMPRESAS_DIR, slug, 'albumData.json')
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def list_images(folder):
    """Retorna imagenes de la carpeta ordenadas alfabeticamente."""
    if not os.path.isdir(folder):
        return []
    files = [
        f for f in sorted(os.listdir(folder))
        if os.path.splitext(f)[1].lower() in IMG_EXTS
    ]
    return files

def slot_status(slug, entity_id, slot_idx):
    """Retorna (tiene_imagen, ruta_actual) para un slot."""
    base = os.path.join(EMPRESAS_DIR, slug, 'cromos', entity_id,
                        str(slot_idx).zfill(2))
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        path = base + ext
        if os.path.isfile(path):
            return True, path
    return False, None

# ── Paso 1: elegir empresa ────────────────────────────────────────────────────
def step_empresa():
    h1('PASO 1 - Empresa')
    empresas = list_empresas()
    if not empresas:
        err('No hay empresas configuradas.')
        sys.exit(1)

    print()
    for i, slug in enumerate(empresas, 1):
        print(f'  {Y}{i}{W}) {slug}')
    print()

    val = ask('Elige una empresa (numero o slug)', required=True)
    if val.isdigit():
        idx = int(val) - 1
        if 0 <= idx < len(empresas):
            return empresas[idx]
        err('Numero fuera de rango.')
        sys.exit(1)
    if val in empresas:
        return val
    err(f'Empresa "{val}" no encontrada.')
    sys.exit(1)

# ── Paso 2: elegir entidad ────────────────────────────────────────────────────
def step_entidad(slug, album):
    h1('PASO 2 - Entidad')
    entities = []
    for group in album.get('groups', []):
        for ent in group.get('entities', []):
            entities.append((group['name'], ent))

    if not entities:
        err('No hay entidades en este album.')
        sys.exit(1)

    print()
    for i, (group_name, ent) in enumerate(entities, 1):
        count  = ent.get('stickerCount') or album.get('stickerCount', 15)
        filled = sum(1 for j in range(count) if slot_status(slug, ent['id'], j)[0])
        bar    = G + str(filled) + W + DIM + '/' + W + str(count)
        print(f'  {Y}{i}{W}) [{group_name}] {ent["name"]}  ({bar} imagenes)')
    print()

    val = ask('Elige una entidad (numero o id)', required=True)
    if val.isdigit():
        idx = int(val) - 1
        if 0 <= idx < len(entities):
            return entities[idx][1]
        err('Numero fuera de rango.')
        sys.exit(1)
    for _, ent in entities:
        if ent['id'] == val:
            return ent
    err(f'Entidad "{val}" no encontrada.')
    sys.exit(1)

# ── Paso 3: mostrar y renombrar ───────────────────────────────────────────────
def step_renombrar(slug, entity, album):
    h1('PASO 3 - Renombrar imagenes existentes')

    sticker_count = entity.get('stickerCount') or album.get('stickerCount', 15)
    stickers      = {s['slot']: s for s in entity.get('stickers', [])}
    cromos_folder = os.path.join(EMPRESAS_DIR, slug, 'cromos', entity['id'])
    images        = list_images(cromos_folder)

    if not images:
        err(f'No se encontraron imagenes en: {cromos_folder}')
        sys.exit(1)

    print(f'\n  Entidad   : {C}{entity["name"]}{W}')
    print(f'  Slots     : {sticker_count}')
    print(f'  Imagenes  : {len(images)} encontradas')
    print(f'  Carpeta   : {DIM}{cromos_folder}{W}\n')

    # Verificar si ya estan numeradas
    import re
    ya_numeradas = all(re.match(r'^\d{2}\.', f) for f in images)
    if ya_numeradas:
        print(f'  {G}Las imagenes ya estan renombradas correctamente.{W}\n')
        return

    print(f'  {DIM}{"#":<4} {"IMAGEN ACTUAL":<50} {"-> SLOT"}{W}')
    print(f'  {DIM}{"-"*74}{W}')

    plan = []  # lista de (src_path, dst_path)

    for i, img_file in enumerate(images):
        if i >= sticker_count:
            break
        src = os.path.join(cromos_folder, img_file)
        ext = os.path.splitext(img_file)[1].lower()
        dst = os.path.join(cromos_folder, str(i).zfill(2) + ext)
        plan.append((src, dst, img_file, i))
        sticker = stickers.get(i, {})
        nombre  = sticker.get('name', f'Slot {i}')
        tipo    = '(holograma)' if i == 0 else ''
        print(f'  {i+1:<4} {img_file:<50} -> {i:02d}{ext} {nombre} {tipo}')

    if len(images) > sticker_count:
        warn(f'Hay {len(images)} imagenes pero solo {sticker_count} slots.')
        warn(f'Las sobrantes NO se renombraran:')
        for img_file in images[sticker_count:]:
            print(f'       {DIM}- {img_file}{W}')

    print()
    confirmar = input(f'  {Y}Renombrar {len(plan)} imagen(es)? [S/n]:{W} ').strip().lower()
    if confirmar in ('n', 'no'):
        print(f'  {Y}Cancelado.{W}')
        return

    print()
    renombrados = 0
    for src, dst, old_name, slot_idx in plan:
        # Si el destino ya existe y es diferente al origen, borrarlo
        if os.path.isfile(dst) and os.path.normpath(src) != os.path.normpath(dst):
            os.remove(dst)
        # Si origen y destino son iguales, ya esta bien
        if os.path.normpath(src) == os.path.normpath(dst):
            ok(f'Slot {slot_idx:02d} ya estaba correcto ({old_name})')
            renombrados += 1
            continue
        shutil.move(src, dst)
        ok(f'Slot {slot_idx:02d} <- {old_name}')
        renombrados += 1

    # Limpiar imagenes sobrantes que no entraron en ningun slot
    sobrantes = [f for f in os.listdir(cromos_folder)
                 if os.path.splitext(f)[1].lower() in IMG_EXTS
                 and not re.match(r'^\d{2}\.', f)]
    if sobrantes:
        print()
        warn(f'Imagenes sobrantes (no renombradas):')
        for s in sobrantes:
            print(f'       {DIM}- {s}{W}')

    # Generar manifest.json
    manifest = {}
    for i in range(sticker_count):
        slot_file = str(i).zfill(2)
        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
            path = os.path.join(cromos_folder, slot_file + ext)
            if os.path.isfile(path):
                manifest[str(i)] = slot_file + ext
                break
    manifest_path = os.path.join(cromos_folder, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    ok(f'Manifest generado: {manifest_path}')

    print(f'\n  {G}Listo! {renombrados} cromos renombrados en "{entity["id"]}".{W}\n')

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print('\n' + B + '=' * 52 + W)
    print(B + '   RENOMBRAR CROMOS EXISTENTES                  ' + W)
    print(B + '=' * 52 + W)
    tip('Este script renombra las imagenes que YA estan en la carpeta')
    tip('de cromos al formato correcto: 00.webp, 01.webp, 02.webp ...')

    slug    = step_empresa()
    album   = load_album(slug)
    entity  = step_entidad(slug, album)
    step_renombrar(slug, entity, album)

    # Opcion: otra entidad
    while True:
        otro = input(f'  {Y}Renombrar otra entidad? [s/N]:{W} ').strip().lower()
        if otro not in ('s', 'si', 'y', 'yes'):
            break
        entity  = step_entidad(slug, album)
        step_renombrar(slug, entity, album)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n\n  {Y}Cancelado.{W}\n')
        sys.exit(0)
