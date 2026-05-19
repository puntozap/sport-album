import argparse
import glob
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent

INPUT_PREFIX = "paginas_png_sin_margen_"
OUTPUT_PREFIX = "cromos_extraidos_"


def discover_input_folders() -> list[Path]:
    return sorted([
        p for p in ROOT.iterdir()
        if p.is_dir() and p.name.startswith(INPUT_PREFIX)
    ])


def choose_folder_interactive(folders: list[Path]) -> Path:
    print(f"Base origen: {ROOT}")
    print(f"Carpetas encontradas: {len(folders)}\n")

    for i, f in enumerate(folders, 1):
        png_count = len(list(f.glob("*.png")))
        print(f"  {i:2d}) {f.name} ({png_count} PNG)")

    while True:
        raw = input("\nSelecciona una carpeta por número: ").strip()

        if raw == "":
            raise SystemExit("Cancelado.")

        if raw.isdigit():
            idx = int(raw)
            if 1 <= idx <= len(folders):
                return folders[idx - 1]

        print("Entrada inválida.")


def suffix_from_input_folder(folder: Path) -> str:
    name = folder.name
    return name[len(INPUT_PREFIX):] if name.startswith(INPUT_PREFIX) else name


def segments_from_mask(is_separator: np.ndarray) -> list[tuple[int, int]]:
    """
    Recibe un array booleano donde True = separador blanco.
    Devuelve segmentos de contenido.
    """
    segments = []
    n = len(is_separator)
    i = 0

    while i < n:
        while i < n and is_separator[i]:
            i += 1

        if i >= n:
            break

        start = i

        while i < n and not is_separator[i]:
            i += 1

        end = i

        if end - start > 5:
            segments.append((start, end))

    return segments


def merge_close_segments(
    segments: list[tuple[int, int]],
    max_gap: int = 8,
) -> list[tuple[int, int]]:
    if not segments:
        return []

    merged = [segments[0]]

    for start, end in segments[1:]:
        prev_start, prev_end = merged[-1]

        if start - prev_end <= max_gap:
            merged[-1] = (prev_start, end)
        else:
            merged.append((start, end))

    return merged


def remove_tiny_segments(
    segments: list[tuple[int, int]],
    min_size: int,
) -> list[tuple[int, int]]:
    return [
        (a, b)
        for a, b in segments
        if (b - a) >= min_size
    ]


def fallback_columns(width: int, cols: int = 4) -> list[tuple[int, int]]:
    step = width / cols
    return [
        (round(i * step), round((i + 1) * step))
        for i in range(cols)
    ]


def fallback_rows(height: int, rows: int) -> list[tuple[int, int]]:
    step = height / rows
    return [
        (round(i * step), round((i + 1) * step))
        for i in range(rows)
    ]


def estimate_rows_by_ratio(width: int, height: int, expected_cols: int = 4) -> int:
    """
    Estima cuántas filas tiene la página según proporción aproximada del cromo.
    """
    col_width = width / expected_cols

    # Ajuste aproximado para cromos verticales.
    estimated_row_height = col_width * 1.34

    estimated_rows = round(height / estimated_row_height)

    return max(1, min(4, estimated_rows))


def detect_grid_adaptive(
    img: Image.Image,
    expected_cols: int = 4,
    white_threshold: int = 245,
    sep_threshold: float = 0.985,
) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """
    Modo auto.

    Columnas:
    - intenta detectar separadores verticales blancos
    - si falla, usa columnas uniformes

    Filas:
    - se estiman por proporción
    - evita que páginas completas se corten como 2 filas falsas
    """
    img = img.convert("RGB")
    arr = np.array(img)

    h, w, _ = arr.shape

    white_mask = np.all(arr >= white_threshold, axis=2)

    col_white_ratio = white_mask.mean(axis=0)
    is_sep_col = col_white_ratio >= sep_threshold

    x_segments = segments_from_mask(is_sep_col)
    x_segments = merge_close_segments(x_segments, max_gap=6)

    min_col_width = max(20, int(w * 0.08))
    x_segments = remove_tiny_segments(x_segments, min_col_width)

    if len(x_segments) != expected_cols:
        x_segments = fallback_columns(w, expected_cols)

    estimated_rows = estimate_rows_by_ratio(w, h, expected_cols)
    y_segments = fallback_rows(h, estimated_rows)

    return x_segments, y_segments


def is_cell_empty(
    img: Image.Image,
    white_threshold: int = 245,
    min_content_ratio: float = 0.03,
) -> bool:
    """
    Determina si una celda está vacía o casi vacía.
    """
    arr = np.array(img.convert("RGB"))

    non_white = np.any(arr < white_threshold, axis=2)
    ratio = non_white.mean()

    return ratio < min_content_ratio


def trim_white_margin(
    img: Image.Image,
    white_threshold: int = 245,
    min_nonwhite_ratio: float = 0.002,
    padding: int = 0,
) -> Image.Image:
    """
    Recorta margen blanco interno del cromo.
    """
    img = img.convert("RGB")
    arr = np.array(img)

    non_white = np.any(arr < white_threshold, axis=2)

    h, w = non_white.shape

    min_row_pixels = max(1, int(w * min_nonwhite_ratio))
    min_col_pixels = max(1, int(h * min_nonwhite_ratio))

    row_counts = non_white.sum(axis=1)
    col_counts = non_white.sum(axis=0)

    rows = np.where(row_counts >= min_row_pixels)[0]
    cols = np.where(col_counts >= min_col_pixels)[0]

    if rows.size == 0 or cols.size == 0:
        return img

    y1 = max(int(rows[0]) - padding, 0)
    y2 = min(int(rows[-1]) + padding, img.height - 1)
    x1 = max(int(cols[0]) - padding, 0)
    x2 = min(int(cols[-1]) + padding, img.width - 1)

    return img.crop((x1, y1, x2 + 1, y2 + 1))


def save_debug_grid(
    img: Image.Image,
    x_segments: list[tuple[int, int]],
    y_segments: list[tuple[int, int]],
    output_path: Path,
) -> None:
    overlay = img.copy().convert("RGB")
    draw = ImageDraw.Draw(overlay)

    w, h = overlay.size

    for x1, x2 in x_segments:
        draw.line([(x1, 0), (x1, h)], fill=(255, 0, 0), width=3)
        draw.line([(x2, 0), (x2, h)], fill=(255, 0, 0), width=3)

    for y1, y2 in y_segments:
        draw.line([(0, y1), (w, y1)], fill=(0, 255, 0), width=3)
        draw.line([(0, y2), (w, y2)], fill=(0, 255, 0), width=3)

    for y1, y2 in y_segments:
        for x1, x2 in x_segments:
            draw.rectangle([x1, y1, x2, y2], outline=(255, 255, 0), width=2)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    overlay.save(output_path)


def resolve_page_filter(images: list[str], page_arg: str) -> list[str]:
    """
    Permite:
    --page 6
    --page 06
    --page pagina_06
    --page pagina_06.png
    """
    page_arg = str(page_arg).strip()

    if not page_arg:
        return images

    if page_arg.isdigit():
        page_arg = f"pagina_{int(page_arg):02d}.png"

    if not page_arg.lower().endswith(".png"):
        page_arg = page_arg + ".png"

    selected = [
        img_path for img_path in images
        if Path(img_path).name.lower() == page_arg.lower()
    ]

    if not selected:
        disponibles = "\n".join(Path(p).name for p in images[:30])
        raise SystemExit(
            f"No encontré la página: {page_arg}\n\n"
            f"Primeras páginas disponibles:\n{disponibles}"
        )

    return selected


def extract_page_number(image_path: str, fallback: int) -> int:
    page_name = Path(image_path).stem

    try:
        return int(page_name.split("_")[1])
    except Exception:
        return fallback


def safe_crop_area(
    img: Image.Image,
    left: int,
    top: int,
    right: int,
    bottom: int,
) -> Image.Image:
    img_w, img_h = img.size

    left = max(0, min(left, img_w - 1))
    top = max(0, min(top, img_h - 1))

    if right <= 0:
        right = img_w

    if bottom <= 0:
        bottom = img_h

    right = max(left + 1, min(right, img_w))
    bottom = max(top + 1, min(bottom, img_h))

    return img.crop((left, top, right, bottom))


def get_insets(args) -> tuple[int, int, int, int]:
    """
    Devuelve:
    left, top, right, bottom

    --inset aplica a todos.
    Los individuales reemplazan el general.
    """
    base = int(args.inset)

    inset_left = base if args.inset_left is None else int(args.inset_left)
    inset_top = base if args.inset_top is None else int(args.inset_top)
    inset_right = base if args.inset_right is None else int(args.inset_right)
    inset_bottom = base if args.inset_bottom is None else int(args.inset_bottom)

    return inset_left, inset_top, inset_right, inset_bottom


def crop_cell_with_insets(
    area: Image.Image,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    inset_left: int,
    inset_top: int,
    inset_right: int,
    inset_bottom: int,
) -> Image.Image:
    area_w, area_h = area.size

    cx1 = max(x1 + inset_left, 0)
    cy1 = max(y1 + inset_top, 0)
    cx2 = min(x2 - inset_right, area_w)
    cy2 = min(y2 - inset_bottom, area_h)

    if cx2 <= cx1:
        cx2 = min(cx1 + 1, area_w)

    if cy2 <= cy1:
        cy2 = min(cy1 + 1, area_h)

    return area.crop((cx1, cy1, cx2, cy2))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Corta cromos desde páginas PNG, con modo auto o fixed."
    )

    parser.add_argument(
        "--input",
        default="",
        help=f"Carpeta de entrada. Por defecto busca '{INPUT_PREFIX}*'.",
    )

    parser.add_argument(
        "--page",
        default="",
        help="Procesa solo una página específica. Ej: pagina_06.png o 6.",
    )

    parser.add_argument(
        "--output",
        default="",
        help=f"Carpeta de salida. Por defecto crea '{OUTPUT_PREFIX}<sufijo>'.",
    )

    parser.add_argument(
        "--mode",
        default="auto",
        choices=["auto", "fixed"],
        help="Modo de corte: auto estima filas; fixed usa filas/columnas manuales.",
    )

    parser.add_argument(
        "--expected-cols",
        type=int,
        default=4,
        help="Columnas esperadas para modo auto.",
    )

    parser.add_argument(
        "--cols",
        type=int,
        default=4,
        help="Columnas manuales cuando usas --mode fixed.",
    )

    parser.add_argument(
        "--rows",
        type=int,
        default=0,
        help="Filas manuales cuando usas --mode fixed. Ej: 4, 2, 1. Si es 0, estima automático.",
    )

    parser.add_argument(
        "--left",
        type=int,
        default=0,
        help="Recorte manual izquierdo antes de cortar cromos.",
    )

    parser.add_argument(
        "--top",
        type=int,
        default=0,
        help="Recorte manual superior antes de cortar cromos.",
    )

    parser.add_argument(
        "--right",
        type=int,
        default=0,
        help="Recorte manual derecho. 0 usa el ancho completo.",
    )

    parser.add_argument(
        "--bottom",
        type=int,
        default=0,
        help="Recorte manual inferior. 0 usa el alto completo.",
    )

    parser.add_argument(
        "--inset",
        type=int,
        default=0,
        help="Recorte interno general de cada cromo. Aplica a todos los lados.",
    )

    parser.add_argument(
        "--inset-left",
        type=int,
        default=None,
        help="Recorte interno solo del lado izquierdo.",
    )

    parser.add_argument(
        "--inset-top",
        type=int,
        default=None,
        help="Recorte interno solo arriba.",
    )

    parser.add_argument(
        "--inset-right",
        type=int,
        default=None,
        help="Recorte interno solo del lado derecho.",
    )

    parser.add_argument(
        "--inset-bottom",
        type=int,
        default=None,
        help="Recorte interno solo abajo.",
    )

    parser.add_argument(
        "--white",
        type=int,
        default=245,
        help="Valor considerado blanco.",
    )

    parser.add_argument(
        "--sep-threshold",
        type=float,
        default=0.985,
        help="Umbral para separadores blancos.",
    )

    parser.add_argument(
        "--min-content",
        type=float,
        default=0.03,
        help="Mínimo de contenido para no descartar una celda.",
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Guarda imágenes con grilla detectada.",
    )

    parser.add_argument(
        "--debug-page",
        type=int,
        default=0,
        help="Debug de una página específica. 0 = todas.",
    )

    parser.add_argument(
        "--trim",
        action="store_true",
        help="Recorta margen blanco interno de cada cromo después del corte.",
    )

    args = parser.parse_args()

    # =========================
    # ENTRADA
    # =========================
    if args.input:
        input_folder = Path(args.input)

        if not input_folder.is_absolute():
            input_folder = ROOT / input_folder

        if not input_folder.exists():
            raise SystemExit(f"No existe la carpeta: {input_folder}")

        if not input_folder.is_dir():
            raise SystemExit(f"No es carpeta: {input_folder}")
    else:
        folders = discover_input_folders()

        if not folders:
            raise SystemExit(f"No encontré carpetas '{INPUT_PREFIX}*' en {ROOT}")

        input_folder = choose_folder_interactive(folders)

    # =========================
    # SALIDA
    # =========================
    suffix = suffix_from_input_folder(input_folder)

    output_folder = Path(args.output) if args.output else ROOT / f"{OUTPUT_PREFIX}{suffix}"

    if not output_folder.is_absolute():
        output_folder = ROOT / output_folder

    os.makedirs(output_folder, exist_ok=True)

    debug_folder = output_folder / "_debug"

    if args.debug:
        os.makedirs(debug_folder, exist_ok=True)

    # =========================
    # IMÁGENES
    # =========================
    images = sorted(glob.glob(str(input_folder / "*.png")))

    if not images:
        raise SystemExit(f"No hay PNGs en: {input_folder}")

    images = resolve_page_filter(images, args.page)

    print(f"\nEntrada: {input_folder}")
    print(f"Salida:  {output_folder}")
    print(f"Páginas a procesar: {len(images)}")
    print("")

    total_saved = 0

    # =========================
    # PROCESAR
    # =========================
    for loop_index, image_path in enumerate(images, start=1):
        page_index = extract_page_number(image_path, loop_index)

        img = Image.open(image_path).convert("RGB")

        print(f"Procesando página {page_index:02d}: {Path(image_path).name}")

        # =========================
        # ÁREA ÚTIL
        # =========================
        area = safe_crop_area(
            img,
            left=int(args.left),
            top=int(args.top),
            right=int(args.right),
            bottom=int(args.bottom),
        )

        area_w, area_h = area.size

        # =========================
        # GRILLA
        # =========================
        if args.mode == "fixed":
            cols = int(args.cols)

            if int(args.rows) > 0:
                rows = int(args.rows)
            else:
                rows = estimate_rows_by_ratio(area_w, area_h, cols)

            x_segments = fallback_columns(area_w, cols)
            y_segments = fallback_rows(area_h, rows)
        else:
            x_segments, y_segments = detect_grid_adaptive(
                area,
                expected_cols=int(args.expected_cols),
                white_threshold=int(args.white),
                sep_threshold=float(args.sep_threshold),
            )

        print(f"Área útil: {area_w}x{area_h}")
        print(f"Columnas detectadas: {len(x_segments)}")
        print(f"Filas detectadas:    {len(y_segments)}")

        if args.debug and args.debug_page in (0, page_index):
            debug_path = debug_folder / f"pagina_{page_index:02d}_grid.png"
            save_debug_grid(area, x_segments, y_segments, debug_path)
            print(f"Debug guardado: {debug_path}")

        page_folder = output_folder / f"pagina_{page_index:02d}"
        os.makedirs(page_folder, exist_ok=True)

        inset_left, inset_top, inset_right, inset_bottom = get_insets(args)

        print(
            f"Insets: left={inset_left}, top={inset_top}, "
            f"right={inset_right}, bottom={inset_bottom}"
        )

        counter = 1
        saved_this_page = 0

        for row_index, (y1, y2) in enumerate(y_segments, start=1):
            for col_index, (x1, x2) in enumerate(x_segments, start=1):
                cell = crop_cell_with_insets(
                    area,
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    inset_left=inset_left,
                    inset_top=inset_top,
                    inset_right=inset_right,
                    inset_bottom=inset_bottom,
                )

                if is_cell_empty(
                    cell,
                    white_threshold=int(args.white),
                    min_content_ratio=float(args.min_content),
                ):
                    continue

                if args.trim:
                    cell = trim_white_margin(
                        cell,
                        white_threshold=int(args.white),
                        min_nonwhite_ratio=0.002,
                        padding=0,
                    )

                output_path = page_folder / (
                    f"pagina_{page_index:02d}_cromo_{counter:02d}_fila_{row_index}_col_{col_index}.png"
                )

                cell.save(output_path)

                print(f"Guardado: {output_path}")

                counter += 1
                saved_this_page += 1
                total_saved += 1

        print(f"Cromos guardados en página {page_index:02d}: {saved_this_page}\n")

    print(f"Todos los cromos fueron extraídos. Total guardado: {total_saved}")


if __name__ == "__main__":
    main()