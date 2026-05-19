import argparse
import os
from pathlib import Path
import unicodedata

import fitz  # PyMuPDF
import numpy as np
from PIL import Image


# =========================
# CONFIGURACIÓN
# =========================

ROOT = Path(__file__).resolve().parent
PDF_DIR = ROOT / "pdf"

zoom = 3
matrix = fitz.Matrix(zoom, zoom)

# 255 = solo blanco exacto
# 250 = recomendado para blanco/casi blanco
white_threshold = 250

# 0 = corte exacto
padding = 0

# Densidad mínima de píxeles no blancos por fila/columna
min_nonwhite_ratio = 0.002


def list_pdfs(pdf_dir: Path) -> list[Path]:
    if not pdf_dir.exists():
        return []

    return sorted([
        p for p in pdf_dir.iterdir()
        if p.is_file() and p.suffix.lower() == ".pdf"
    ])


def _canon(s: str) -> str:
    """
    Normaliza nombres:
    - maneja acentos
    - baja a minúsculas
    - quita diacríticos
    """
    s = unicodedata.normalize("NFKD", s).casefold()
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s


def resolve_pdf_arg(arg: str, pdf_dir: Path) -> Path:
    candidate = Path(arg)

    if candidate.is_absolute() and candidate.exists():
        return candidate

    direct = candidate if candidate.is_absolute() else (pdf_dir / candidate)

    if direct.exists():
        return direct

    wanted = _canon(candidate.name)

    matches = [
        p for p in list_pdfs(pdf_dir)
        if _canon(p.name) == wanted
    ]

    if len(matches) == 1:
        return matches[0]

    partial = [
        p for p in list_pdfs(pdf_dir)
        if wanted in _canon(p.name)
    ]

    if len(partial) == 1:
        return partial[0]

    suggestions = matches or partial

    if suggestions:
        opts = "\n".join(f"  - {p.name}" for p in suggestions[:12])
        raise SystemExit(
            f"No existe el PDF: {direct}\n"
            f"Quizás quisiste decir:\n{opts}"
        )

    raise SystemExit(f"No existe el PDF: {direct}")


def choose_pdf_interactive(pdfs: list[Path]) -> Path:
    print(f"\nCarpeta PDFs origen: {PDF_DIR}")
    print(f"PDFs encontrados: {len(pdfs)}\n")

    for i, pdf in enumerate(pdfs, 1):
        size_mb = pdf.stat().st_size / (1024 * 1024)
        print(f"  {i:2d}) {pdf.name} ({size_mb:.2f} MB)")

    while True:
        raw = input("\nSelecciona un PDF por número: ").strip()

        if raw == "":
            raise SystemExit("Cancelado.")

        if raw.isdigit():
            idx = int(raw)

            if 1 <= idx <= len(pdfs):
                return pdfs[idx - 1]

        print("Entrada inválida. Intenta de nuevo.")


def output_folder_for(pdf_path: Path) -> Path:
    return ROOT / f"paginas_png_sin_margen_{pdf_path.stem}"


def remove_white_margin(
    img: Image.Image,
    white_threshold: int = 250,
    padding: int = 0,
    min_nonwhite_ratio: float = 0.002,
) -> Image.Image:
    """
    Recorta automáticamente el margen blanco de una imagen:
    arriba, abajo, izquierda y derecha.
    """

    img = img.convert("RGB")
    arr = np.array(img)

    # Un píxel se considera NO blanco si cualquier canal está por debajo del umbral
    non_white_mask = np.any(arr < white_threshold, axis=2)

    h, w = non_white_mask.shape

    min_row_pixels = max(1, int(w * float(min_nonwhite_ratio)))
    min_col_pixels = max(1, int(h * float(min_nonwhite_ratio)))

    row_counts = non_white_mask.sum(axis=1)
    col_counts = non_white_mask.sum(axis=0)

    rows = np.where(row_counts >= min_row_pixels)[0]
    cols = np.where(col_counts >= min_col_pixels)[0]

    # Si no detecta nada usando densidad, cae al método bruto
    if rows.size == 0 or cols.size == 0:
        coords = np.argwhere(non_white_mask)

        if coords.size == 0:
            return img

        y_min, x_min = coords.min(axis=0)
        y_max, x_max = coords.max(axis=0)
    else:
        y_min = int(rows[0])
        y_max = int(rows[-1])
        x_min = int(cols[0])
        x_max = int(cols[-1])

    x_min = max(x_min - padding, 0)
    y_min = max(y_min - padding, 0)
    x_max = min(x_max + padding, img.width - 1)
    y_max = min(y_max + padding, img.height - 1)

    return img.crop((x_min, y_min, x_max + 1, y_max + 1))


def remove_footer_artifacts(
    img: Image.Image,
    white_threshold: int = 245,
    min_gap: int = 45,
    min_content_ratio: float = 0.01,
) -> Image.Image:
    """
    Elimina marcas o líneas sobrantes debajo de la grilla.

    Sirve para casos como:
    - barras azules abajo
    - texto @maggieaksjs
    - líneas o restos debajo de los cromos

    Busca un espacio blanco grande después de la grilla.
    Si después de ese espacio aparece contenido suelto, lo corta.
    """

    img = img.convert("RGB")
    arr = np.array(img)

    h, w, _ = arr.shape

    non_white_mask = np.any(arr < white_threshold, axis=2)

    row_counts = non_white_mask.sum(axis=1)

    min_row_pixels = max(1, int(w * min_content_ratio))
    row_has_content = row_counts >= min_row_pixels

    gaps = []
    i = 0

    while i < h:
        if not row_has_content[i]:
            start = i

            while i < h and not row_has_content[i]:
                i += 1

            end = i
            gap_size = end - start

            if gap_size >= min_gap:
                gaps.append((start, end, gap_size))
        else:
            i += 1

    if not gaps:
        return img

    for start, end, gap_size in gaps:
        # Evita cortar separadores internos muy arriba
        if start < int(h * 0.35):
            continue

        # Si después del gap hay contenido, probablemente es basura inferior
        content_after = row_has_content[end:].sum()

        if content_after > 0:
            return img.crop((0, 0, w, start))

    return img


def remove_white_margin_twice(
    img: Image.Image,
    white_threshold: int = 250,
    padding: int = 0,
    min_nonwhite_ratio: float = 0.002,
) -> Image.Image:
    """
    Limpieza completa:
    1. Quita margen blanco general.
    2. Elimina basura inferior.
    3. Vuelve a quitar margen blanco por si quedó espacio.
    """

    img = remove_white_margin(
        img,
        white_threshold=white_threshold,
        padding=padding,
        min_nonwhite_ratio=min_nonwhite_ratio,
    )

    img = remove_footer_artifacts(
        img,
        white_threshold=white_threshold,
        min_gap=45,
        min_content_ratio=0.01,
    )

    img = remove_white_margin(
        img,
        white_threshold=white_threshold,
        padding=padding,
        min_nonwhite_ratio=min_nonwhite_ratio,
    )

    return img


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convierte un PDF a PNGs sin margen blanco, sin usar página de referencia."
    )

    parser.add_argument(
        "--pdf",
        dest="pdf",
        default="",
        help="Nombre del PDF dentro de la carpeta /pdf o ruta absoluta/relativa.",
    )

    parser.add_argument(
        "--threshold",
        type=int,
        default=white_threshold,
        help="Blanco: 255 estricto, 250 recomendado.",
    )

    parser.add_argument(
        "--min-ratio",
        type=float,
        default=min_nonwhite_ratio,
        help="Densidad mínima de píxeles no blancos por fila/columna.",
    )

    parser.add_argument(
        "--padding",
        type=int,
        default=padding,
        help="Padding extra luego de recortar.",
    )

    parser.add_argument(
        "--no-footer-clean",
        action="store_true",
        help="No intenta eliminar barras/textos sobrantes inferiores.",
    )

    args = parser.parse_args()

    pdfs = list_pdfs(PDF_DIR)

    if not pdfs and not args.pdf:
        raise SystemExit(f"No hay PDFs en: {PDF_DIR}")

    if args.pdf:
        pdf_path = resolve_pdf_arg(args.pdf, PDF_DIR)
    else:
        pdf_path = choose_pdf_interactive(pdfs)

    output_folder = output_folder_for(pdf_path)
    os.makedirs(output_folder, exist_ok=True)

    print(f"\nPDF seleccionado: {pdf_path.name}")
    print(f"Carpeta de salida: {output_folder}")
    print("")

    pdf = fitz.open(str(pdf_path))

    for page_index in range(len(pdf)):
        page_number = page_index + 1
        page = pdf[page_index]

        pix = page.get_pixmap(
            matrix=matrix,
            alpha=False
        )

        img = Image.frombytes(
            "RGB",
            (pix.width, pix.height),
            pix.samples
        )

        print(f"Página {page_number:02d} original: {img.width}x{img.height}")

        if args.no_footer_clean:
            final_img = remove_white_margin(
                img,
                white_threshold=int(args.threshold),
                padding=int(args.padding),
                min_nonwhite_ratio=float(args.min_ratio),
            )
        else:
            final_img = remove_white_margin_twice(
                img,
                white_threshold=int(args.threshold),
                padding=int(args.padding),
                min_nonwhite_ratio=float(args.min_ratio),
            )

        print(f"Página {page_number:02d} final: {final_img.width}x{final_img.height}")

        output_path = output_folder / f"pagina_{page_number:02d}.png"
        final_img.save(output_path)

        print(f"Guardado: {output_path}\n")

    pdf.close()

    print("Proceso terminado.")


if __name__ == "__main__":
    main()