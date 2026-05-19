"""
svg_cleaner_v2.py
Convierte imagen a SVG limpio con capas CSS editables.
Auto-detecta paleta real de la imagen.

pip install opencv-python Pillow numpy svgwrite scikit-learn
"""

import cv2
import numpy as np
import svgwrite
import sys
from pathlib import Path
from sklearn.cluster import KMeans

OUTPUT_DIR = Path("svg_output")
OUTPUT_DIR.mkdir(exist_ok=True)

# ── Colores a IGNORAR (fondo negro y similares) ────────────────────────────────
IGNORE_DARK_THRESHOLD = 40   # píxeles con R+G+B < este*3 se omiten


def load_image(path: str) -> np.ndarray:
    img = cv2.imread(path)
    if img is None:
        sys.exit(f"No se pudo cargar: {path}")
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def detect_palette(img: np.ndarray, n_colors: int = 8) -> list[np.ndarray]:
    """K-means sobre píxeles no-oscuros para detectar colores dominantes."""
    pixels = img.reshape(-1, 3).astype(np.float32)

    # Filtrar píxeles muy oscuros (fondo negro)
    brightness = pixels.sum(axis=1)
    pixels = pixels[brightness > IGNORE_DARK_THRESHOLD * 3]

    if len(pixels) < n_colors:
        sys.exit("Imagen demasiado oscura o muy pequeña.")

    km = KMeans(n_clusters=n_colors, n_init=10, random_state=42)
    km.fit(pixels)
    centers = km.cluster_centers_.astype(np.uint8)
    return centers


def color_to_hex(rgb: np.ndarray) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def mask_for_center(img: np.ndarray, center: np.ndarray, tolerance: int = 35) -> np.ndarray:
    """Máscara binaria para todos los píxeles cercanos a un color central."""
    low  = np.clip(center.astype(int) - tolerance, 0, 255).astype(np.uint8)
    high = np.clip(center.astype(int) + tolerance, 0, 255).astype(np.uint8)
    return cv2.inRange(img, low, high)


def mask_to_paths(mask: np.ndarray, min_area: int = 150, simplify: float = 0.002) -> list[str]:
    """Máscara binaria → lista de strings 'd' para SVG path."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4))
    clean  = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    clean  = cv2.morphologyEx(clean, cv2.MORPH_OPEN,  kernel)

    contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)

    paths = []
    for cnt in contours:
        if cv2.contourArea(cnt) < min_area:
            continue
        eps    = simplify * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, eps, True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2)
        d   = f"M {pts[0][0]},{pts[0][1]} " + " ".join(f"L {p[0]},{p[1]}" for p in pts[1:]) + " Z"
        paths.append(d)
    return paths


def build_svg(img: np.ndarray, palette: list[np.ndarray], output_path: str):
    h, w = img.shape[:2]
    dwg  = svgwrite.Drawing(output_path, size=(w, h), profile="full")

    # ── CSS con variables por color detectado ─────────────────────────────────
    css_vars = "\n".join(
        f"    --color-{i}: {color_to_hex(c)};"
        for i, c in enumerate(palette)
    )
    css_classes = "\n".join(
        f"    .c{i} {{ fill: var(--color-{i}); }}"
        for i in range(len(palette))
    )
    dwg.defs.add(dwg.style(f":root {{\n{css_vars}\n}}\n{css_classes}"))

    # ── Fondo blanco explícito (reemplaza el negro) ───────────────────────────
    dwg.add(dwg.rect(insert=(0, 0), size=(w, h), fill="white", id="background"))

    # ── Capa por cada color detectado ────────────────────────────────────────
    for i, center in enumerate(palette):
        mask  = mask_for_center(img, center)
        paths = mask_to_paths(mask)
        if not paths:
            continue
        grp = dwg.g(id=f"layer-{i}", class_=f"c{i}")
        for d in paths:
            grp.add(dwg.path(d=d))
        dwg.add(grp)
        print(f"  Color {i}: {color_to_hex(center)} → {len(paths)} formas")

    dwg.save(pretty=True)
    print(f"\n✅ SVG guardado: {output_path}")
    print(f"   Edita los colores en :root {{ --color-0: ...; --color-1: ...; }}")


def process(input_path: str, n_colors: int = 8):
    print(f"🔍 Procesando: {input_path}")
    img     = load_image(input_path)
    print(f"   Tamaño: {img.shape[1]}×{img.shape[0]}px")

    print(f"🎨 Detectando {n_colors} colores dominantes...")
    palette = detect_palette(img, n_colors)
    for i, c in enumerate(palette):
        print(f"   {i}: {color_to_hex(c)}  RGB{tuple(c)}")

    out = str(OUTPUT_DIR / (Path(input_path).stem + "_clean.svg"))
    print(f"✏️  Generando SVG...")
    build_svg(img, palette, out)
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:  python svg_cleaner_v2.py imagen.png")
        print("      python svg_cleaner_v2.py imagen.png 10   ← más colores")
        sys.exit(0)

    n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    process(sys.argv[1], n_colors=n)