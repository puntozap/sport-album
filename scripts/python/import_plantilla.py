"""
Importa una plantilla de jugadores (plantilla_{equipo}.json) al albumData.json de una empresa.

USO:
  python scripts/python/import_plantilla.py
  python scripts/python/import_plantilla.py futve tachira C:/laragon/www/football/tachira/plantilla_tachira.json

El JSON de plantilla debe tener objetos con:
  - nombre        → nombre completo del jugador
  - numero        → dorsal
  - posicion      → Portero / Defensa / Mediocampo / Delantero
  - imagen        → URL pública de la foto
  - imagen_local  → ruta local de la foto (opcional)
"""

import json
import sys
import os
from pathlib import Path

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
LINE = '-' * 56

def ok(msg):  print('  ' + G + 'OK  ' + W + msg)
def tip(msg): print('  ' + DIM + msg + W)
def h1(msg):  print('\n' + B + LINE + W + '\n' + B + '  ' + msg + W + '\n' + B + LINE + W)
def err(msg): print('  ' + R + 'ERROR: ' + W + msg)

ROOT         = Path(__file__).resolve().parent.parent.parent
EMPRESAS_DIR = ROOT / 'public' / 'empresas'

GRUPOS_IGNORADOS = {
    'temporada 2026', 'plantilla de jugadores',
    'portero', 'defensa', 'mediocampo', 'delantero',
    'cuerpo técnico', 'cuerpo tecnico',
}


def cargar_plantilla(ruta: Path) -> list:
    """Lee el JSON y devuelve jugadores únicos (deduplicados por nombre+numero)."""
    with open(ruta, encoding='utf-8') as f:
        data = json.load(f)

    vistos = {}
    for j in data:
        grupo = (j.get('posicion_grupo') or '').strip().lower()
        # Priorizar el grupo "PLANTILLA DE JUGADORES"
        key = f"{(j.get('nombre') or '').strip()}|{(j.get('numero') or '').strip()}"
        if key not in vistos:
            vistos[key] = j
        elif grupo == 'plantilla de jugadores':
            vistos[key] = j  # reemplazar con la versión de plantilla completa

    jugadores = list(vistos.values())
    # Ordenar por número de dorsal
    def parse_num(j):
        try: return int(j.get('numero') or 999)
        except: return 999
    jugadores.sort(key=parse_num)
    return jugadores


def listar_empresas():
    return [
        d for d in sorted(os.listdir(EMPRESAS_DIR))
        if not d.startswith('_') and
        os.path.isfile(EMPRESAS_DIR / d / 'albumData.json')
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
        print(f'  {Y}{i}{W}) [{gid}] {e["name"]}  (id: {e["id"]})')
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


def elegir_plantilla():
    print()
    tip('Ruta al archivo plantilla_{equipo}.json')
    ruta = input(f'  {Y}Ruta:{W} ').strip().strip('"').strip("'")
    ruta = Path(ruta)
    if not ruta.is_absolute():
        ruta = ROOT / ruta
    if not ruta.exists():
        err(f'No encontré el archivo: {ruta}')
        sys.exit(1)
    return ruta


def main():
    h1('IMPORTAR PLANTILLA → albumData.json')

    # Argumentos por CLI
    if len(sys.argv) == 4:
        slug         = sys.argv[1]
        entity_id    = sys.argv[2]
        plantilla_path = Path(sys.argv[3])
    else:
        slug           = elegir_empresa()
        album_path     = EMPRESAS_DIR / slug / 'albumData.json'
        with open(album_path, encoding='utf-8') as f:
            album = json.load(f)
        entidad        = elegir_entidad(album)
        entity_id      = entidad['id']
        plantilla_path = elegir_plantilla()

    # Leer albumData
    album_path = EMPRESAS_DIR / slug / 'albumData.json'
    with open(album_path, encoding='utf-8') as f:
        album = json.load(f)

    # Encontrar la entidad
    entidad = None
    for g in album.get('groups', []):
        for e in g.get('entities', []):
            if e['id'] == entity_id:
                entidad = e
                break

    if not entidad:
        err(f'Entidad "{entity_id}" no encontrada en albumData.json')
        sys.exit(1)

    # Cargar y deduplicar jugadores
    jugadores = cargar_plantilla(plantilla_path)
    sticker_count = entidad.get('stickerCount') or album.get('stickerCount', 12)

    print(f'\n  Empresa   : {C}{slug}{W}')
    print(f'  Entidad   : {C}{entidad["name"]}{W}')
    print(f'  Slots     : {sticker_count} (slot 0 = holograma, slots 1-{sticker_count-1} = jugadores)')
    print(f'  Jugadores : {len(jugadores)} encontrados en el JSON\n')

    # Mostrar preview
    print(f'  {DIM}{"SLOT":<6} {"#":<5} {"NOMBRE":<35} {"POSICIÓN"}{W}')
    print(f'  {DIM}{"-"*65}{W}')
    print(f'  {"0":<6} {"--":<5} {"(holograma / logo)":<35}')

    asignados = jugadores[:sticker_count - 1]
    for i, j in enumerate(asignados, 1):
        print(f'  {i:<6} {j.get("numero",""):<5} {j.get("nombre",""):<35} {j.get("posicion","")}')

    sobrantes = len(jugadores) - len(asignados)
    if sobrantes > 0:
        tip(f'{sobrantes} jugadores no caben en {sticker_count} slots y serán ignorados.')

    print()
    confirmar = input(f'  {Y}Guardar en albumData.json? [S/n]:{W} ').strip().lower()
    if confirmar in ('n', 'no'):
        print(f'  {Y}Cancelado.{W}')
        return

    # Construir nuevos stickers
    nuevos_stickers = [{
        'slot': 0,
        'name': entidad['name'],
        'type': 'holograma',
    }]
    for i, j in enumerate(asignados, 1):
        sticker = {
            'slot':     i,
            'name':     j.get('nombre', ''),
            'numero':   j.get('numero', ''),
            'posicion': j.get('posicion', ''),
        }
        if j.get('imagen'):
            sticker['image_url'] = j['imagen']
        if j.get('imagen_local'):
            sticker['imagen_local'] = j['imagen_local']
        nuevos_stickers.append(sticker)

    entidad['stickers'] = nuevos_stickers
    entidad['stickerCount'] = sticker_count

    with open(album_path, 'w', encoding='utf-8') as f:
        json.dump(album, f, ensure_ascii=False, indent=2)

    ok(f'albumData.json actualizado con {len(asignados)} jugadores en "{entity_id}".')
    print(f'\n  {DIM}Próximo paso: python scripts/python/create_empresa_sheet.py {slug}{W}\n')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n\n  {Y}Cancelado.{W}\n')
        sys.exit(0)
