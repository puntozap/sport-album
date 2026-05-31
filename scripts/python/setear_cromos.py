"""
Asigna imagenes a los slots de una entidad empresarial.

Toma las fotos de una carpeta en orden alfabetico y las copia/renombra
al path correcto: public/empresas/{slug}/cromos/{entity-id}/00.jpg, 01.jpg ...

USO:
  python scripts/python/setear_cromos.py

No requiere dependencias externas.
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

def slot_status(slug, entity_id, slot_idx, sticker_count):
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
        err('No hay empresas configuradas. Crea una primero con crear_empresa.py')
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
        count     = ent.get('stickerCount') or album.get('stickerCount', 15)
        filled    = sum(1 for j in range(count) if slot_status(slug, ent['id'], j, count)[0])
        bar       = G + str(filled) + W + DIM + '/' + W + str(count)
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

# ── Paso 3: carpeta de imagenes ───────────────────────────────────────────────
def step_carpeta():
    h1('PASO 3 - Carpeta de imagenes')
    tip('Escribe la ruta de la carpeta donde estan las fotos.')
    tip('Las imagenes se ordenaran alfabeticamente y se asignaran en ese orden.')

    while True:
        ruta = ask('Ruta de la carpeta', required=True)
        # Expandir rutas relativas y ~
        ruta = os.path.expanduser(ruta.strip('"').strip("'"))
        if not os.path.isabs(ruta):
            ruta = os.path.join(PROJECT_ROOT, ruta)
        if os.path.isdir(ruta):
            return ruta
        err(f'Carpeta no encontrada: {ruta}')

# ── Detectar si las imágenes ya están nombradas con número de slot ────────────
def images_ya_numeradas(images):
    """Retorna True si los archivos ya empiezan con 00, 01, 02..."""
    import re
    return all(re.match(r'^\d{2}', f) for f in images)

# ── Paso 4: previsualizar y confirmar ─────────────────────────────────────────
def step_preview(slug, entity, carpeta, album):
    h1('PASO 4 - Revision')

    sticker_count = entity.get('stickerCount') or album.get('stickerCount', 15)
    stickers      = {s['slot']: s for s in entity.get('stickers', [])}
    images        = list_images(carpeta)

    if not images:
        err(f'No se encontraron imagenes en: {carpeta}')
        sys.exit(1)

    ya_numeradas = images_ya_numeradas(images)

    print(f'\n  Entidad   : {C}{entity["name"]}{W}')
    print(f'  Slots     : {sticker_count}')
    print(f'  Imagenes  : {len(images)} encontradas')
    if ya_numeradas:
        print(f'  Modo      : {G}numeradas (00, 01...) - asignacion directa{W}\n')
    else:
        print(f'  Modo      : orden alfabetico\n')

    plan = []  # lista de (slot_idx, src_path, dst_path)

    if ya_numeradas:
        # Mapear por numero de slot en el nombre del archivo
        import re
        img_map = {}
        for f in images:
            m = re.match(r'^(\d{2})', f)
            if m:
                img_map[int(m.group(1))] = f

        print(f'  {DIM}{"SLOT":<6} {"NOMBRE DEL EMPLEADO":<24} {"IMAGEN":<30} {"ESTADO"}{W}')
        print(f'  {DIM}{"-"*74}{W}')

        for i in range(sticker_count):
            sticker  = stickers.get(i, {})
            nombre   = sticker.get('name', f'Slot {i}')
            tipo     = '(holograma)' if i == 0 else ''
            has_img, _ = slot_status(slug, entity['id'], i, sticker_count)
            img_file = img_map.get(i)

            if img_file:
                src    = os.path.join(carpeta, img_file)
                ext    = os.path.splitext(img_file)[1].lower()
                dst    = os.path.join(EMPRESAS_DIR, slug, 'cromos', entity['id'],
                                      str(i).zfill(2) + ext)
                estado = G + 'ASIGNAR' + W if not has_img else Y + 'REEMPLAZAR' + W
                plan.append((i, src, dst))
            else:
                img_file = '(sin imagen)'
                estado   = R + 'FALTA' + W

            slot_label = f'{i} {tipo}'
            print(f'  {slot_label:<6} {nombre:<24} {str(img_file):<30} {estado}')

    else:
        # Orden alfabético: imagen[i] -> slot i
        print(f'  {DIM}{"SLOT":<6} {"NOMBRE DEL EMPLEADO":<24} {"IMAGEN A ASIGNAR":<30} {"ESTADO"}{W}')
        print(f'  {DIM}{"-"*74}{W}')

        for i in range(sticker_count):
            sticker  = stickers.get(i, {})
            nombre   = sticker.get('name', f'Slot {i}')
            tipo     = '(holograma)' if i == 0 else ''
            has_img, _ = slot_status(slug, entity['id'], i, sticker_count)
            img_file = images[i] if i < len(images) else None

            if img_file:
                src    = os.path.join(carpeta, img_file)
                ext    = os.path.splitext(img_file)[1].lower()
                dst    = os.path.join(EMPRESAS_DIR, slug, 'cromos', entity['id'],
                                      str(i).zfill(2) + ext)
                estado = G + 'ASIGNAR' + W if not has_img else Y + 'REEMPLAZAR' + W
                plan.append((i, src, dst))
            else:
                img_file = '(sin imagen)'
                estado   = R + 'FALTA' + W

            slot_label = f'{i} {tipo}'
            print(f'  {slot_label:<6} {nombre:<24} {str(img_file):<30} {estado}')

    print()
    if len(images) > sticker_count:
        tip(f'Atencion: hay {len(images)} imagenes pero solo {sticker_count} slots.')
    if len(images) < sticker_count:
        tip(f'Atencion: faltan {sticker_count - len(images)} imagenes para completar todos los slots.')

    return plan

# ── Paso 5: copiar ────────────────────────────────────────────────────────────
def step_copiar(plan, slug, entity_id):
    if not plan:
        err('No hay nada que copiar.')
        return

    confirmar = input(f'\n  {Y}Copiar {len(plan)} imagen(es)? [S/n]:{W} ').strip().lower()
    if confirmar in ('n', 'no'):
        print(f'  {Y}Cancelado.{W}')
        return

    dst_folder = os.path.join(EMPRESAS_DIR, slug, 'cromos', entity_id)
    os.makedirs(dst_folder, exist_ok=True)

    print()
    for slot_idx, src, dst in plan:
        # Borrar versiones previas con otra extension
        base = os.path.join(dst_folder, str(slot_idx).zfill(2))
        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
            old = base + ext
            if os.path.isfile(old) and old != dst:
                os.remove(old)
        shutil.copy2(src, dst)
        ok(f'Slot {slot_idx:02d} -> {os.path.basename(dst)}')

    # Generar manifest.json
    manifest = {}
    for i in range(sticker_count):
        slot_file = str(i).zfill(2)
        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
            path = os.path.join(dst_folder, slot_file + ext)
            if os.path.isfile(path):
                manifest[str(i)] = slot_file + ext
                break
    manifest_path = os.path.join(dst_folder, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    ok(f'Manifest generado: {manifest_path}')

    print(f'\n  {G}Listo! {len(plan)} cromos asignados a "{entity_id}".{W}\n')

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print('\n' + B + '=' * 52 + W)
    print(B + '   SETEAR CROMOS - ASIGNACION DE IMAGENES       ' + W)
    print(B + '=' * 52 + W)
    tip('Las imagenes se ordenan alfabeticamente.')
    tip('Nombra tus fotos con prefijo numerico para controlar el orden:')
    tip('  01_juan.jpg, 02_maria.jpg, 03_carlos.jpg ...')

    slug    = step_empresa()
    album   = load_album(slug)
    entity  = step_entidad(slug, album)
    carpeta = step_carpeta()
    plan    = step_preview(slug, entity, carpeta, album)
    step_copiar(plan, slug, entity['id'])

    # Opcion: asignar otra entidad
    while True:
        otro = input(f'  {Y}Asignar imagenes a otra entidad? [s/N]:{W} ').strip().lower()
        if otro not in ('s', 'si', 'y', 'yes'):
            break
        entity  = step_entidad(slug, album)
        carpeta = step_carpeta()
        plan    = step_preview(slug, entity, carpeta, album)
        step_copiar(plan, slug, entity['id'])

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n\n  {Y}Cancelado.{W}\n')
        sys.exit(0)
