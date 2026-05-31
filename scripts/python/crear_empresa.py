"""
Wizard interactivo para crear un álbum empresarial.

USO:
  python scripts/python/crear_empresa.py

Crea automáticamente:
  public/empresas/{slug}/config.json
  public/empresas/{slug}/albumData.json
  public/empresas/{slug}/cromos/{entity-id}/   (carpetas vacías para las imágenes)

No requiere dependencias externas.
"""

import json
import os
import sys

# Forzar UTF-8 en el terminal Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stdin.reconfigure(encoding='utf-8')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stdin  = io.TextIOWrapper(sys.stdin.buffer,  encoding='utf-8')

# ── Colores ANSI ──────────────────────────────────────────────────────────────
G  = '\033[92m'   # verde
Y  = '\033[93m'   # amarillo
B  = '\033[94m'   # azul
C  = '\033[96m'   # cyan
R  = '\033[91m'   # rojo
DIM= '\033[2m'    # tenue
W  = '\033[0m'    # reset

LINE = '-' * 50

def ok(msg):  print('  ' + G + 'OK ' + W + msg)
def tip(msg): print('  ' + DIM + msg + W)
def h1(msg):  print('\n' + B + LINE + W + '\n' + B + msg + W + '\n' + B + LINE + W)
def h2(msg):  print('\n' + C + '> ' + msg + W)

# ── Helpers de entrada ────────────────────────────────────────────────────────
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

def ask_color(prompt, default='#1a56db'):
    paleta = [
        ('#1a56db', 'azul'),
        ('#0e7490', 'teal'),
        ('#7c3aed', 'violeta'),
        ('#dc2626', 'rojo'),
        ('#16a34a', 'verde'),
        ('#d97706', 'naranja'),
        ('#db2777', 'rosa'),
        ('#374151', 'gris oscuro'),
    ]
    tip('Paleta rápida:')
    for i, (hex_, name) in enumerate(paleta, 1):
        print(f'    {DIM}{i}) {hex_}  {name}{W}')
    val = input(f'  {Y}{prompt} [{default}]:{W} ').strip()
    if not val:
        return default
    # Si escriben un número de la paleta
    if val.isdigit():
        idx = int(val) - 1
        if 0 <= idx < len(paleta):
            return paleta[idx][0]
    # Si no empieza con #, agregarlo
    if not val.startswith('#'):
        val = '#' + val
    return val

def ask_yn(prompt, default='s'):
    hint = 'S/n' if default == 's' else 's/N'
    val = input(f'  {Y}{prompt} [{hint}]:{W} ').strip().lower()
    if not val:
        return default == 's'
    return val in ('s', 'si', 'sí', 'y', 'yes')

def to_slug(text):
    import unicodedata, re
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
EMPRESAS_DIR = os.path.join(PROJECT_ROOT, 'public', 'empresas')

def empresa_dir(slug): return os.path.join(EMPRESAS_DIR, slug)
def cromos_dir(slug, entity_id): return os.path.join(empresa_dir(slug), 'cromos', entity_id)

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def read_json(path):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return None

# ── Paso 1: empresa ───────────────────────────────────────────────────────────
def step_empresa():
    h1('PASO 1 — Empresa')
    tip('El slug se usa en la URL: /{slug}/{entidad}')

    name  = ask('Nombre de la empresa', required=True)
    slug  = ask('Slug (URL)', default=to_slug(name), required=True)

    # Revisar si ya existe
    album_path = os.path.join(empresa_dir(slug), 'albumData.json')
    if os.path.exists(album_path):
        print(f'\n  {Y}⚠ Ya existe un álbum para "{slug}".{W}')
        if not ask_yn('¿Continuar y editarlo?', default='s'):
            sys.exit(0)

    tagline = ask('Tagline / slogan', default='')
    color   = ask_color('Color primario (hex o número)')
    whatsapp= ask('WhatsApp (opcional)', default='')
    website = ask('Sitio web (opcional)', default='')

    config = {
        'name':         name,
        'tagline':      tagline,
        'primaryColor': color,
        'whatsapp':     whatsapp or None,
        'website':      website or None,
        'stamp': {
            'corner': 'bottom-right', 'logoHeight': 68,
            'padding': '0px 0px', 'borderRadius': '10px',
            'offsetV': -40, 'offsetH': 2, 'rotate': -2
        },
        'albumBadge': {'show': False, 'logoHeight': 20, 'padding': '4px 9px', 'borderRadius': '20px'},
        'albumLogo':  {'show': True,  'logoHeight': 90, 'left': '51%', 'top': '50%', 'opacity': 0.28, 'blendMode': 'luminosity'},
        'curtain':    {'logoHeight': 90, 'padding': '3px 10px'},
        'splash':     {'logoHeight': 30, 'padding': '8px 20px'},
        'modal':      {'logoHeight': 50}
    }

    config_path = os.path.join(empresa_dir(slug), 'config.json')
    write_json(config_path, config)
    ok(f'Creado: public/empresas/{slug}/config.json')
    tip(f'Pon el logo de la empresa en: public/empresas/{slug}/logo.png')

    return slug, name, color

# ── Paso 2: estructura del álbum ──────────────────────────────────────────────
def step_estructura(album_data):
    h1('PASO 2 — Estructura del album')

    existing_groups = album_data.get('groups', []) if album_data else []
    num_default = len(existing_groups) if existing_groups else 1

    val = ask('Cuantos grupos va a tener el album', default=str(num_default))
    try:
        num_grupos = max(1, int(val))
    except ValueError:
        num_grupos = 1

    tip(f'{num_grupos} grupo(s) configurados.')
    return num_grupos

# ── Paso 3: grupos y entidades ────────────────────────────────────────────────
def step_grupos(slug, num_grupos, album_data):
    h1('PASO 3 — Grupos y entidades')
    tip('Slot 0 = holograma. Slots 1-N = empleados/personas.')

    groups = album_data.get('groups', []) if album_data else []
    letras_usadas = {g.get('letter', '') for g in groups}
    letra_default = chr(ord('A') + len(groups))

    for n in range(1, num_grupos + 1):
        h2(f'Grupo {n} de {num_grupos}')
        nombre_grupo = ask('Nombre del grupo', required=True)

        letter = ask('Letra del grupo', default=letra_default).upper()
        while letter in letras_usadas:
            letter = ask(f'La letra "{letter}" ya se usa, elige otra', default=chr(ord(letter)+1)).upper()
        letras_usadas.add(letter)
        letra_default = chr(ord(letter) + 1)

        color_grupo = ask_color('Color del grupo')
        group_colors = {
            'primary': color_grupo, 'secondary': '#ffffff',
            'accent': '#f59e0b', 'sticker': '#e0e7ff', 'groupBox': color_grupo
        }

        existing_group = next((g for g in groups if g.get('id') == to_slug(nombre_grupo)), None)
        if existing_group:
            group = existing_group
            group['name']   = nombre_grupo
            group['letter'] = letter
            group['colors'] = group_colors
        else:
            group = {
                'id':       to_slug(nombre_grupo),
                'name':     nombre_grupo,
                'letter':   letter,
                'colors':   group_colors,
                'entities': []
            }
            groups.append(group)

        step_entidades(slug, group)

    return groups

def step_entidades(slug, group):
    tip(f'Entidades para el grupo "{group["name"]}"')

    while True:
        num = len(group['entities']) + 1
        h2(f'  Entidad {num} en "{group["name"]}"')
        nombre = ask('  Nombre  (Enter para terminar)', default='')
        if not nombre:
            if not group['entities']:
                print(f'  {R}El grupo necesita al menos una entidad.{W}')
                continue
            break

        id_default = to_slug(nombre)
        entity_id  = ask('  ID (carpeta de cromos)', default=id_default)
        code       = ask('  Código (3 letras para la navegación)', default=entity_id[:3].upper()).upper()
        color_ent  = ask_color('  Color de la entidad')

        # Cantidad de cromos específica para esta entidad
        val = ask('  Cantidad de cromos (holograma + empleados)', default='15')
        try:
            sticker_count = max(1, int(val))
        except ValueError:
            sticker_count = 15

        entity_colors = {
            'primary': color_ent, 'secondary': '#ffffff',
            'accent': '#f59e0b', 'sticker': '#e0e7ff', 'groupBox': color_ent
        }

        stickers = build_stickers(nombre, code, sticker_count)

        entity = {
            'id':           entity_id,
            'name':         nombre,
            'code':         code,
            'stickerCount': sticker_count,
            'colors':       entity_colors,
            'stickers':     stickers
        }

        group['entities'] = [e for e in group['entities'] if e['id'] != entity_id]
        group['entities'].append(entity)

        cdir = cromos_dir(slug, entity_id)
        os.makedirs(cdir, exist_ok=True)
        ok(f'Carpeta creada: public/empresas/{slug}/cromos/{entity_id}/')
        tip(f'Imagenes: 00.png (holograma), 01.png … {sticker_count-1:02d}.png')

def build_stickers(nombre_entidad, code, sticker_count):
    print(f'\n  {DIM}Nombres de los cromos (Enter = dejar en blanco para rellenar después):{W}')

    stickers = []
    for i in range(sticker_count):
        if i == 0:
            default = nombre_entidad
            label   = f'  Slot 0 — holograma'
        else:
            default = ''
            label   = f'  Slot {i}'
        name = input(f'  {Y}{label} [{default or "vacío"}]:{W} ').strip()
        entry = {'slot': i, 'name': name or default}
        if i == 0:
            entry['type'] = 'holograma'
        stickers.append(entry)

    return stickers

# ── Guardar albumData.json ────────────────────────────────────────────────────
def save_album(slug, name, groups):
    album = {
        'albumId': slug,
        'name':    f'Álbum {name}',
        'groups':  groups
    }
    path = os.path.join(empresa_dir(slug), 'albumData.json')
    write_json(path, album)
    ok(f'Guardado: public/empresas/{slug}/albumData.json')
    return album

# ── Resumen final ─────────────────────────────────────────────────────────────
def print_summary(slug, groups):
    h1('¡LISTO!')
    print(f'\n  {G}Álbum creado para: {slug}{W}\n')

    primera = None
    for group in groups:
        for entity in group.get('entities', []):
            url = f'http://localhost/{slug}/{entity["id"]}'
            if primera is None:
                primera = url
            print(f'  {DIM}{url}{W}')

    if primera:
        print(f'\n  {G}URL de inicio: {primera}{W}')

    print(f'\n  {Y}Pendiente:{W}')
    print(f'  {DIM}• Coloca logo.png en public/empresas/{slug}/{W}')
    print(f'  {DIM}• Agrega las imágenes PNG en cada carpeta cromos/{{entidad}}/{W}')
    print(f'  {DIM}• 00.png = holograma · 01.png … = cromos normales{W}')
    print()

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print('\n' + B + '=' * 50 + W)
    print(B + '   ALBUM EMPRESARIAL - WIZARD DE CONFIGURACION   ' + W)
    print(B + '=' * 50 + W)
    tip('Presiona Enter para aceptar el valor entre corchetes.')
    tip(f'Proyecto detectado en: {PROJECT_ROOT}')

    # Paso 1
    slug, name, color = step_empresa()

    # Cargar album existente si hay
    album_path = os.path.join(empresa_dir(slug), 'albumData.json')
    album_data = read_json(album_path)

    # Paso 2
    num_grupos = step_estructura(album_data)

    # Paso 3
    groups = step_grupos(slug, num_grupos, album_data)

    # Guardar
    save_album(slug, name, groups)

    # Resumen
    print_summary(slug, groups)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n\n  {Y}Cancelado.{W}\n')
        sys.exit(0)
