import os
import re
import json
import cv2
import easyocr
from pathlib import Path
from unidecode import unidecode


BASE_DIR = Path(__file__).resolve().parent.parent

IMAGES_DIR = BASE_DIR / "album-panini/paginas_png_sin_margen_Album-para-Figuras"
OUTPUT_DIR = BASE_DIR / "data"

OUTPUT_JSON =  "countries.grouped.json"
OUTPUT_JS =  "countries.generated.js"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# CONFIGURACIÓN BASE DEL LAYOUT
# ============================================================

SLOT_POSITIONS = [
    { "number": 0,  "type": "gold",   "left": 5.89,  "top": 38.37 },
    { "number": 1,  "type": "normal", "left": 19.58, "top": 38.37 },
    { "number": 2,  "type": "normal", "left": 33.40, "top": 38.37 },
    { "number": 3,  "type": "normal", "left": 19.58, "top": 70.89 },
    { "number": 4,  "type": "normal", "left": 33.40, "top": 70.89 },
    { "number": 5,  "type": "normal", "left": 55.49, "top": 6.06 },
    { "number": 6,  "type": "normal", "left": 69.43, "top": 6.06 },
    { "number": 7,  "type": "normal", "left": 83.12, "top": 6.06 },
    { "number": 8,  "type": "normal", "left": 55.49, "top": 38.37 },
    { "number": 9,  "type": "normal", "left": 69.43, "top": 38.37 },
    { "number": 10, "type": "normal", "left": 83.12, "top": 38.37 },
    { "number": 11, "type": "normal", "left": 83.12, "top": 70.89 },
]

# Tamaño aproximado de cada tarjeta de jugador en porcentaje
SLOT_WIDTH_PERCENT = 11.30
SLOT_HEIGHT_PERCENT = 25.00


# Zonas generales en porcentaje
ZONES = {
    "country_title":    { "x": 3,  "y": 2,  "w": 35, "h": 20 },
    "federation":      { "x": 12, "y": 18, "w": 32, "h": 18 },
    "group":           { "x": 54, "y": 64, "w": 35, "h": 34 },
}


FLAG_MAP = {
    "MEX": "mx",
    "RSA": "za",
    "KOR": "kr",
    "CZE": "cz",
    "BRA": "br",
    "ARG": "ar",
    "FRA": "fr",
    "GER": "de",
    "ESP": "es",
    "POR": "pt",
    "ENG": "gb-eng",
    "USA": "us",
    "CAN": "ca",
    "ITA": "it",
    "URU": "uy",
    "COL": "co",
    "JPN": "jp",
    "MAR": "ma",
    "CRO": "hr",
    "NED": "nl",
    "BEL": "be",
    "SUI": "ch",
    "SEN": "sn",
    "GHA": "gh",
}


COUNTRY_NAME_MAP = {
    "MEX": "México",
    "RSA": "Sudáfrica",
    "KOR": "Corea del Sur",
    "CZE": "República Checa",
    "BRA": "Brasil",
    "ARG": "Argentina",
    "FRA": "Francia",
    "GER": "Alemania",
    "ESP": "España",
    "POR": "Portugal",
    "ENG": "Inglaterra",
    "USA": "Estados Unidos",
    "CAN": "Canadá",
    "ITA": "Italia",
    "URU": "Uruguay",
    "COL": "Colombia",
    "JPN": "Japón",
    "MAR": "Marruecos",
    "CRO": "Croacia",
    "NED": "Países Bajos",
    "BEL": "Bélgica",
    "SUI": "Suiza",
    "SEN": "Senegal",
    "GHA": "Ghana",
}


# Correcciones manuales opcionales para nombres con acentos o errores comunes del OCR
TEXT_FIXES = {
    "MEXICO": "Mexico",
    "MÉXICO": "Mexico",

    "LUIS MALAGON": "Luis<br>Malagón",
    "LUIS MALAGÓN": "Luis<br>Malagón",
    "JOHAN VASQUEZ": "Johan<br>Vásquez",
    "JOHAN VÁSQUEZ": "Johan<br>Vásquez",
    "CESAR MONTES": "César<br>Montes",
    "CÉSAR MONTES": "César<br>Montes",
    "JESUS GALLARDO": "Jesús<br>Gallardo",
    "JESÚS GALLARDO": "Jesús<br>Gallardo",
    "ISRAEL REYES": "Israel<br>Reyes",
    "EDSON ALVAREZ": "Edson<br>Álvarez",
    "EDSON ÁLVAREZ": "Edson<br>Álvarez",
    "MARCEL RUIZ": "Marcel<br>Ruiz",
    "HIRVING LOZANO": "Hirving<br>Lozano",
    "RAUL JIMENEZ": "Raúl<br>Jiménez",
    "RAÚL JIMÉNEZ": "Raúl<br>Jiménez",
    "ALEXIS VEGA": "Alexis<br>Vega",
    "ROBERTO ALVARADO": "Roberto<br>Alvarado",
}


# ============================================================
# FUNCIONES BASE
# ============================================================

def crop_percent(image, x, y, w, h):
    img_h, img_w = image.shape[:2]

    x1 = int((x / 100) * img_w)
    y1 = int((y / 100) * img_h)
    x2 = int(((x + w) / 100) * img_w)
    y2 = int(((y + h) / 100) * img_h)

    return image[y1:y2, x1:x2]


def preprocess_for_ocr(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # Aumentar tamaño ayuda bastante al OCR
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Limpieza suave
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    return gray


def ocr_text(reader, image_crop):
    processed = preprocess_for_ocr(image_crop)

    results = reader.readtext(
        processed,
        detail=0,
        paragraph=False
    )

    cleaned = []

    for line in results:
        line = line.strip()
        line = re.sub(r"\s+", " ", line)

        if line:
            cleaned.append(line)

    return cleaned


def normalize_text(text):
    text = text.upper().strip()
    text = unidecode(text)
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def to_id(name):
    value = unidecode(name.lower())
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value


def format_player_name(raw_name):
    normalized = normalize_text(raw_name)

    if normalized in TEXT_FIXES:
        return TEXT_FIXES[normalized]

    parts = raw_name.strip().title().split()

    if len(parts) == 0:
        return "\u00A0"

    if len(parts) == 1:
        return parts[0]

    first = parts[0]
    last = " ".join(parts[1:])

    return f"{first}<br>{last}"


def extract_page_index(filename):
    match = re.search(r"pagina_(\d+)\.png", filename)

    if not match:
        return None

    return int(match.group(1))


# ============================================================
# EXTRACCIÓN DE SLOTS
# ============================================================

def extract_slot(reader, image, slot_config, country_code):
    left = slot_config["left"]
    top = slot_config["top"]

    slot_crop = crop_percent(
        image,
        left,
        top,
        SLOT_WIDTH_PERCENT,
        SLOT_HEIGHT_PERCENT
    )

    lines = ocr_text(reader, slot_crop)

    normalized_lines = [normalize_text(line) for line in lines]

    detected_number = slot_config["number"]

    # Quitamos código del país, número y basura OCR
    candidate_words = []

    for line in normalized_lines:
        line = line.replace(country_code, "")
        line = re.sub(r"\b\d+\b", "", line)
        line = re.sub(r"\s+", " ", line).strip()

        if line:
            candidate_words.append(line)

    raw_name = " ".join(candidate_words).strip()

    if detected_number == 0:
        player_name = "\u00A0"
    else:
        player_name = format_player_name(raw_name)

    return {
        "number": detected_number,
        "name": player_name,
        "type": slot_config["type"],
        "pos": {
            "left": f"{left:.2f}%",
            "top": f"{top:.2f}%"
        },
        "_ocr": lines
    }


# ============================================================
# EXTRACCIÓN DE PAÍS
# ============================================================

def extract_country_info(reader, image):
    title_zone = ZONES["country_title"]

    crop = crop_percent(
        image,
        title_zone["x"],
        title_zone["y"],
        title_zone["w"],
        title_zone["h"]
    )

    lines = ocr_text(reader, crop)
    normalized = [normalize_text(line) for line in lines]

    # Busca algo tipo WE ARE MEXICO
    country_name = None

    for line in normalized:
        line = line.replace("WE ARE", "").strip()

        if line and len(line) > 2:
            country_name = line.title()
            break

    if not country_name:
        country_name = "Unknown"

    country_id = to_id(country_name)

    return {
        "id": country_id,
        "name": country_name,
        "_ocr": lines
    }


def extract_country_code_from_slots(reader, image):
    # Usamos el primer slot normal para encontrar el código tipo MEX, BRA, ARG...
    test_slot = SLOT_POSITIONS[1]

    crop = crop_percent(
        image,
        test_slot["left"],
        test_slot["top"],
        SLOT_WIDTH_PERCENT,
        SLOT_HEIGHT_PERCENT
    )

    lines = ocr_text(reader, crop)

    joined = " ".join(lines).upper()

    match = re.search(r"\b[A-Z]{3}\b", joined)

    if match:
        return match.group(0)

    return "UNK"


# ============================================================
# FEDERACIÓN
# ============================================================

def extract_federation(reader, image):
    zone = ZONES["federation"]

    crop = crop_percent(
        image,
        zone["x"],
        zone["y"],
        zone["w"],
        zone["h"]
    )

    lines = ocr_text(reader, crop)

    clean_lines = []

    for line in lines:
        line = line.strip()

        if len(line) > 1:
            clean_lines.append(line)

    federation_name = "<br>".join(clean_lines)

    return {
        "name": federation_name,
        "_ocr": lines
    }


# ============================================================
# GRUPO
# ============================================================

def extract_group(reader, image):
    zone = ZONES["group"]

    crop = crop_percent(
        image,
        zone["x"],
        zone["y"],
        zone["w"],
        zone["h"]
    )

    lines = ocr_text(reader, crop)

    normalized = [normalize_text(line) for line in lines]

    group_name = "GROUP UNKNOWN"

    for line in normalized:
        match = re.search(r"GROUP\s+[A-Z]", line)

        if match:
            group_name = match.group(0)
            break

    codes = []

    for line in normalized:
        found_codes = re.findall(r"\b[A-Z]{3}\b", line)

        for code in found_codes:
            if code not in ["THE", "AND", "FOR"] and code not in codes:
                codes.append(code)

    countries = []

    for code in codes:
        countries.append({
            "code": code,
            "flag": FLAG_MAP.get(code, code.lower()),
            "name": COUNTRY_NAME_MAP.get(code, code)
        })

    return {
        "name": group_name,
        "countries": countries,
        "_ocr": lines
    }


# ============================================================
# PROCESAR UNA PÁGINA
# ============================================================

def process_page(reader, image_path):
    filename = image_path.name
    page_index = extract_page_index(filename)

    image = cv2.imread(str(image_path))

    if image is None:
        raise Exception(f"No se pudo leer la imagen: {image_path}")

    country_info = extract_country_info(reader, image)
    country_code = extract_country_code_from_slots(reader, image)

    federation = extract_federation(reader, image)
    group = extract_group(reader, image)

    slots = []

    for slot_config in SLOT_POSITIONS:
        slot = extract_slot(reader, image, slot_config, country_code)
        slots.append(slot)

    country = {
        "id": country_info["id"],
        "code": country_code,
        "name": country_info["name"],
        "pageIndex": page_index,
        "background": f"assets/backgrounds/{filename}",
        "theme": country_info["id"],
        "layout": "standard",
        "slots": [
            {
                "number": slot["number"],
                "name": slot["name"],
                "type": slot["type"],
                "pos": slot["pos"]
            }
            for slot in slots
        ],
        "federation": {
            "name": federation["name"],
            "flag": FLAG_MAP.get(country_code, country_code.lower())
        },
        "group": {
            "name": group["name"],
            "countries": group["countries"]
        },

        # Esto ayuda para revisar errores del OCR
        "_debug": {
            "country_ocr": country_info["_ocr"],
            "federation_ocr": federation["_ocr"],
            "group_ocr": group["_ocr"],
            "slots_ocr": {
                str(slot["number"]): slot["_ocr"]
                for slot in slots
            }
        }
    }

    return country


# ============================================================
# GENERAR ARCHIVOS
# ============================================================

def generate_js(countries):
    countries_clean = []

    for country in countries:
        clean = dict(country)
        clean.pop("_debug", None)
        countries_clean.append(clean)

    json_text = json.dumps(
        countries_clean,
        ensure_ascii=False,
        indent=2
    )

    js = f"""export const countries = {json_text};

export const countriesByGroup = countries.reduce((groups, country) => {{
  const groupName = country.group?.name || 'GROUP UNKNOWN';

  if (!groups[groupName]) {{
    groups[groupName] = [];
  }}

  groups[groupName].push(country);

  return groups;
}}, {{}});

export function getCountryById(id) {{
  return countries.find(c => c.id === id);
}}

export function getCountriesByGroup(groupName) {{
  return countriesByGroup[groupName] || [];
}}
"""

    return js


def main():
    reader = easyocr.Reader(["es", "en"], gpu=False)

    image_files = sorted(IMAGES_DIR.glob("pagina_*.png"))

    if not image_files:
        print(f"No encontré imágenes en: {IMAGES_DIR}")
        return

    countries = []

    for image_path in image_files:
        print(f"Procesando: {image_path.name}")

        try:
            country = process_page(reader, image_path)
            countries.append(country)
        except Exception as e:
            print(f"Error procesando {image_path.name}: {e}")

    # Ordenar por página
    countries.sort(key=lambda item: item["pageIndex"] or 9999)

    # JSON completo con debug OCR
    grouped = {}

    for country in countries:
        group_name = country["group"]["name"]

        if group_name not in grouped:
            grouped[group_name] = []

        grouped[group_name].append(country)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(grouped, f, ensure_ascii=False, indent=2)

    # JS limpio para usar en frontend
    js = generate_js(countries)

    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write(js)

    print("")
    print("Listo.")
    print(f"JSON agrupado generado en: {OUTPUT_JSON}")
    print(f"JS generado en: {OUTPUT_JS}")


if __name__ == "__main__":
    main()