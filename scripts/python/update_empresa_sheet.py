"""
Actualiza un Google Spreadsheet existente con los datos actuales de albumData.json + config.json.
Lee el ID del sheet desde public/empresas/{slug}/_sheet_id.txt

USO:
  python scripts/python/update_empresa_sheet.py
  python scripts/python/update_empresa_sheet.py futve
"""

import sys
import os
from pathlib import Path

# Reutilizar toda la lógica de create_empresa_sheet.py
sys.path.insert(0, str(Path(__file__).parent))
from create_empresa_sheet import (
    autenticar, datos_desde_album, datos_ejemplo,
    escribir_datos, aplicar_formato,
    EMPRESAS_DIR, SCOPES,
)
from googleapiclient.discovery import build

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stdin.reconfigure(encoding='utf-8')
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stdin  = io.TextIOWrapper(sys.stdin.buffer,  encoding='utf-8')

G = '\033[92m'; Y = '\033[93m'; B = '\033[94m'; R = '\033[91m'; DIM = '\033[2m'; W = '\033[0m'
LINE = '-' * 56

def ok(msg):  print('  ' + G + 'OK  ' + W + msg)
def err(msg): print('  ' + R + 'ERROR: ' + W + msg)
def h1(msg):  print('\n' + B + LINE + W + '\n' + B + '  ' + msg + W + '\n' + B + LINE + W)


def listar_empresas():
    return [
        d for d in sorted(os.listdir(EMPRESAS_DIR))
        if not d.startswith('_') and
        (EMPRESAS_DIR / d / '_sheet_id.txt').exists()
    ]


def elegir_empresa():
    empresas = listar_empresas()
    if not empresas:
        err('No hay empresas con sheet creado.')
        sys.exit(1)
    print()
    for i, e in enumerate(empresas, 1):
        sid = (EMPRESAS_DIR / e / '_sheet_id.txt').read_text().strip()
        print(f'  {Y}{i}{W}) {e}  {DIM}({sid[:20]}...){W}')
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


def limpiar_hoja(sheets_svc, ss_id, sheet_name):
    """Borra el contenido de una hoja (mantiene formato)."""
    sheets_svc.spreadsheets().values().clear(
        spreadsheetId=ss_id,
        range=f'{sheet_name}!A1:Z10000',
    ).execute()


def main():
    h1('ACTUALIZAR SPREADSHEET EXISTENTE')

    slug = sys.argv[1] if len(sys.argv) >= 2 else elegir_empresa()

    sheet_id_path = EMPRESAS_DIR / slug / '_sheet_id.txt'
    if not sheet_id_path.exists():
        err(f'No encontré _sheet_id.txt para "{slug}". Usa create_empresa_sheet.py primero.')
        sys.exit(1)

    ss_id = sheet_id_path.read_text().strip()
    url   = f'https://docs.google.com/spreadsheets/d/{ss_id}'

    print(f'\n  Empresa : {slug}')
    print(f'  Sheet   : {url}\n')

    print('  Autenticando con Google...')
    creds      = autenticar()
    sheets_svc = build('sheets', 'v4', credentials=creds)
    print('  OK autenticado\n')

    album_path = EMPRESAS_DIR / slug / 'albumData.json'
    if album_path.exists():
        print('  Cargando datos desde albumData.json...')
        config_rows, grupos_rows, paises_rows, slots_rows = datos_desde_album(slug, slug)
    else:
        print('  Usando datos de ejemplo...')
        config_rows, grupos_rows, paises_rows, slots_rows = datos_ejemplo(slug, slug)

    total = len(config_rows) + len(grupos_rows) + len(paises_rows) + len(slots_rows)
    print(f'  Filas: Config={len(config_rows)}, Grupos={len(grupos_rows)}, '
          f'Paises={len(paises_rows)}, Slots={len(slots_rows)}  (total={total})\n')

    confirmar = input(f'  {Y}Actualizar el sheet? Esto sobreescribe el contenido. [S/n]:{W} ').strip().lower()
    if confirmar in ('n', 'no'):
        print(f'  {Y}Cancelado.{W}\n')
        return

    print('  Limpiando hojas...')
    for hoja in ['Config', 'Grupos', 'Paises', 'Slots']:
        limpiar_hoja(sheets_svc, ss_id, hoja)
    ok('Hojas limpiadas')

    print('  Escribiendo datos...')
    escribir_datos(sheets_svc, ss_id, config_rows, grupos_rows, paises_rows, slots_rows)
    ok('Datos escritos')

    print('  Aplicando formato...')
    try:
        aplicar_formato(sheets_svc, ss_id, config_rows, grupos_rows, paises_rows, slots_rows)
        ok('Formato aplicado')
    except Exception as e:
        print(f'  {DIM}Formato omitido (ya existe): {e}{W}')

    print(f'\n  {G}¡Listo! Sheet actualizado.{W}')
    print(f'  {url}\n')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n\n  {Y}Cancelado.{W}\n')
        sys.exit(0)
