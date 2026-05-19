from PIL import Image
import os
from dotenv import load_dotenv

# Cargar variables del archivo .env
load_dotenv()

# ------------------------------------------------------------------
# Leer configuracion global desde .env (con valores por defecto)
# ------------------------------------------------------------------
input_dir = os.getenv("INPUT_DIR", "cromos")
output_base_dir = os.getenv("OUTPUT_DIR", "salida")
output_all_dir = os.getenv("OUTPUT_ALL_DIR", "todos_juntos")

global_cols = int(os.getenv("COLS", "4"))
global_rows = int(os.getenv("ROWS", "4"))

global_usable_width = int(os.getenv("USABLE_WIDTH", "0"))
global_usable_height = int(os.getenv("USABLE_HEIGHT", "0"))

global_offset_x = int(os.getenv("OFFSET_X", "0"))
global_offset_y = int(os.getenv("OFFSET_Y", "0"))

global_sticker_width = os.getenv("STICKER_WIDTH")
global_sticker_height = os.getenv("STICKER_HEIGHT")

if global_sticker_width is not None and global_sticker_width.strip() != "":
    global_sticker_width = int(global_sticker_width)
else:
    global_sticker_width = None

if global_sticker_height is not None and global_sticker_height.strip() != "":
    global_sticker_height = int(global_sticker_height)
else:
    global_sticker_height = None

# ------------------------------------------------------------------
# Funcion para leer overrides especificos de una imagen
# ------------------------------------------------------------------
def get_override(name, param, default_value):
    """Busca OVERRIDE_<NAME>_<PARAM> en el entorno. Si no existe, devuelve default."""
    env_key = f"OVERRIDE_{name}_{param}"
    val = os.getenv(env_key)
    if val is not None and val.strip() != "":
        if isinstance(default_value, int):
            return int(val)
        return val
    return default_value

# ------------------------------------------------------------------
os.makedirs(output_base_dir, exist_ok=True)
os.makedirs(output_all_dir, exist_ok=True)

# Obtener todas las imagenes de la carpeta de entrada
image_files = sorted([
    f for f in os.listdir(input_dir)
    if f.lower().endswith((".png", ".jpg", ".jpeg"))
])

if not image_files:
    print(f"No se encontraron imagenes en '{input_dir}'.")
    exit(1)

print(f"Se encontraron {len(image_files)} imagenes para procesar.\n")

for filename in image_files:
    input_path = os.path.join(input_dir, filename)

    # Nombre de la carpeta = nombre del archivo sin extension
    name_without_ext = os.path.splitext(filename)[0]
    output_dir = os.path.join(output_base_dir, name_without_ext)
    os.makedirs(output_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # Leer overrides especificos para esta imagen (si existen)
    # ------------------------------------------------------------------
    cols = get_override(name_without_ext, "COLS", global_cols)
    rows = get_override(name_without_ext, "ROWS", global_rows)

    usable_width = get_override(name_without_ext, "USABLE_WIDTH", global_usable_width)
    usable_height = get_override(name_without_ext, "USABLE_HEIGHT", global_usable_height)

    offset_x = get_override(name_without_ext, "OFFSET_X", global_offset_x)
    offset_y = get_override(name_without_ext, "OFFSET_Y", global_offset_y)

    sticker_width = get_override(name_without_ext, "STICKER_WIDTH", global_sticker_width)
    sticker_height = get_override(name_without_ext, "STICKER_HEIGHT", global_sticker_height)

    # Si el override devolvio string vacio, convertir a None
    if sticker_width == "" or sticker_width is None:
        sticker_width = None
    if sticker_height == "" or sticker_height is None:
        sticker_height = None

    # Abrir imagen
    img = Image.open(input_path)
    width, height = img.size

    # Determinar area util
    uw = usable_width if usable_width > 0 else width
    uh = usable_height if usable_height > 0 else height

    # Calcular bordes de corte
    if sticker_width is not None and sticker_height is not None:
        # Modo: tamaño fijo de sticker + offset
        x_edges = [offset_x + round(i * sticker_width) for i in range(cols + 1)]
        y_edges = [offset_y + round(i * sticker_height) for i in range(rows + 1)]
    else:
        # Modo: area util dividida proporcionalmente
        x_edges = [offset_x + round(i * uw / cols) for i in range(cols + 1)]
        y_edges = [offset_y + round(i * uh / rows) for i in range(rows + 1)]

    # Verificar si se aplicaron overrides
    has_override = any([
        get_override(name_without_ext, "COLS", None) is not None,
        get_override(name_without_ext, "ROWS", None) is not None,
        get_override(name_without_ext, "USABLE_WIDTH", None) is not None,
        get_override(name_without_ext, "USABLE_HEIGHT", None) is not None,
        get_override(name_without_ext, "OFFSET_X", None) is not None,
        get_override(name_without_ext, "OFFSET_Y", None) is not None,
        get_override(name_without_ext, "STICKER_WIDTH", None) is not None,
        get_override(name_without_ext, "STICKER_HEIGHT", None) is not None,
    ])

    if has_override:
        print(f"[INFO] Aplicando overrides para '{filename}'")
        print(f"       cols={cols}, rows={rows}, usable={uw}x{uh}, offset=({offset_x},{offset_y})")
        if sticker_width and sticker_height:
            print(f"       sticker_size={sticker_width}x{sticker_height}")
        print()

    counter = 1

    for row in range(rows):
        for col in range(cols):
            left = x_edges[col]
            upper = y_edges[row]
            right = x_edges[col + 1]
            lower = y_edges[row + 1]

            sticker = img.crop((left, upper, right, lower))

            sticker_filename = f"sticker_{counter:02d}.png"
            output_path = os.path.join(output_dir, sticker_filename)

            sticker.save(output_path)

            # Guardar tambien en la carpeta "todos juntos" con nombre unico
            all_filename = f"{name_without_ext}_{sticker_filename}"
            all_output_path = os.path.join(output_all_dir, all_filename)
            sticker.save(all_output_path)

            print(f"[{name_without_ext}] {sticker_filename}: x={left}, y={upper}, w={right-left}, h={lower-upper}")

            counter += 1

    sw = x_edges[1] - x_edges[0]
    sh = y_edges[1] - y_edges[0]
    print(f"-> Guardados en: {output_dir} | Dimensiones por sticker: {sw}x{sh}\n")

print("Proceso completado.")
