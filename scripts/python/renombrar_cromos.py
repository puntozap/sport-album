from pathlib import Path
import json

# ==========================================================
# CONFIGURACIÓN
# ==========================================================

BASE_DIR = Path(r"C:\laragon\www\album-panini\cromoides")
JSON_NAME = "cromos.json"


# ==========================================================
# FUNCIONES
# ==========================================================

def normalizar_nombre(nombre: str) -> str:
    return nombre.strip().lower()


def cargar_json(carpeta: Path) -> dict:
    json_path = carpeta / JSON_NAME

    if not json_path.exists():
        print(f"❌ No existe el archivo JSON:")
        print(f"   {json_path}")
        return {}

    try:
        with open(json_path, "r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as e:
        print("❌ El JSON tiene un error de formato.")
        print(f"   Archivo: {json_path}")
        print(f"   Error: {e}")
        return {}

    if not isinstance(data, dict):
        print("❌ El JSON debe ser un objeto.")
        print("Ejemplo:")
        print('{ "0": "archivo.png", "1": "archivo2.png" }')
        return {}

    return data


def renombrar_cromos(carpeta: Path, mapping: dict):
    if not carpeta.exists():
        print(f"❌ La carpeta no existe:")
        print(f"   {carpeta}")
        return

    archivos_en_carpeta = {
        normalizar_nombre(archivo.name): archivo
        for archivo in carpeta.iterdir()
        if archivo.is_file() and archivo.name != JSON_NAME
    }

    cambios = []
    no_encontrados = []

    for numero_cromo, nombre_original in mapping.items():
        if nombre_original is None:
            continue

        numero_cromo = int(numero_cromo)
        nombre_normalizado = normalizar_nombre(nombre_original)

        if nombre_normalizado not in archivos_en_carpeta:
            no_encontrados.append(nombre_original)
            continue

        archivo_actual = archivos_en_carpeta[nombre_normalizado]

        nuevo_nombre = f"{numero_cromo:02d}{archivo_actual.suffix.lower()}"
        archivo_destino = carpeta / nuevo_nombre

        cambios.append({
            "numero": numero_cromo,
            "numero_texto": f"{numero_cromo:02d}",
            "actual": archivo_actual,
            "temporal": carpeta / f"__tmp__{numero_cromo:02d}{archivo_actual.suffix.lower()}",
            "destino": archivo_destino,
        })

    if not cambios:
        print("⚠️ No se encontró ningún archivo para renombrar.")
        return

    cambios.sort(key=lambda item: item["numero"])

    print("\nArchivos que se van a renombrar:\n")

    for cambio in cambios:
        print(f"  {cambio['actual'].name}  →  {cambio['destino'].name}")

    if no_encontrados:
        print("\nArchivos no encontrados:")
        for archivo in no_encontrados:
            print(f"  - {archivo}")

    confirmar = input("\n¿Deseas continuar? escribe SI para renombrar: ").strip().upper()

    if confirmar != "SI":
        print("❌ Operación cancelada.")
        return

    # Paso 1: pasar todos a nombres temporales
    for cambio in cambios:
        if cambio["temporal"].exists():
            cambio["temporal"].unlink()

        cambio["actual"].rename(cambio["temporal"])

    # Paso 2: pasar de temporal al nombre final
    numeros_renombrados = []

    for cambio in cambios:
        if cambio["destino"].exists():
            cambio["destino"].unlink()

        cambio["temporal"].rename(cambio["destino"])
        numeros_renombrados.append(cambio["numero_texto"])

    texto_concatenado = ",".join(numeros_renombrados) + ","

    print("\n✅ Renombrado completado correctamente.")

    print("\n📌 Números renombrados:")
    print(texto_concatenado)


# ==========================================================
# PROGRAMA PRINCIPAL
# ==========================================================

def main():
    print("════════════════════════════════════════════")
    print("  Renombrador de cromos usando JSON local")
    print("════════════════════════════════════════════")

    numero_pagina = input("\nIngresa el número de página: ").strip()

    if not numero_pagina.isdigit():
        print("❌ Debes ingresar un número válido.")
        return

    carpeta = BASE_DIR / f"pagina_{numero_pagina}"

    print("\n📁 Carpeta seleccionada:")
    print(f"   {carpeta}")

    mapping = cargar_json(carpeta)

    if not mapping:
        return

    print(f"\n📄 JSON cargado: {JSON_NAME}")
    print(f"🔎 Cromos configurados: {len(mapping)}")

    renombrar_cromos(carpeta, mapping)


if __name__ == "__main__":
    main()