"""
Sube archivos PNG locales a Google Drive Y al servidor del álbum.

USO:
  python scripts/upload_cromos.py

Ejemplos al elegir carpeta:
  b1
  b1:07
  b1:07.png
  c4:02,03,10,11
  12:02,03,10
  5

SETUP (solo la primera vez):
  pip install google-auth google-auth-oauthlib google-api-python-client requests
  - Pon credentials.json en la raíz del proyecto
  - Borra token_drive.json si ya existía (necesita permiso de escritura en Drive)
"""

import os
import sys
import re
import requests
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials


# ── Configuración ─────────────────────────────────────────────
SERVER_URL = "https://sportalbum.chanzia.com/api/upload-cromo"
UPLOAD_TOKEN = "xK9#mP2$qR7nL4vT8wY1"

# Necesita permiso de escritura para subir a Drive
SCOPES = ["https://www.googleapis.com/auth/drive.file"]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = Path(r"C:\laragon\www\album-panini")

CROMOS_BASE = os.path.join(BASE_DIR, "cromos_extraidos")
CREDENTIALS_FILE = os.path.join(ROOT, "credentials.json")

# Ojo: este proyecto también usa token.json para Google Sheets.
# Para evitar choques de scopes, este script usa su propio token.
TOKEN_FILE = os.path.join(ROOT, "token_drive.json")


# Mapa folder ID → ruta en el servidor
FOLDERS = {
    "1VeKc7liTH9tauMUe9ZECLdrRGN_-NMxn": "grupos/a/1",
    "1LwvKTlWacxzlTM7QtjE8xCvrCoWYafaR": "grupos/a/2",
    "1rcedv-uEDQihdwFA0D8eWfFm8OBum4Na": "grupos/a/3",
    "13H3hSQ2cA7t-CeIdw44iQ3zgCMDmoV6I": "grupos/a/4",

    "1IAaxxXGCIhRd_2eUiJKb7fJomz7vYSg_": "grupos/b/1",
    "1oZFqDjftUGlQyAfl08qKe-bratzYKCE5": "grupos/b/2",
    "1mCqEEU59M0TWf9KQ32yPSKHu5X3m3VbK": "grupos/b/3",
    "1XAdZtQ5YqKUmXB3AjRnYuJ0NJhY85gqj": "grupos/b/4",

    "1YVrmWqFj0GshP2AnR9Bk-MRydehZxg6Z": "grupos/c/1",
    "1SlkfOQx3qEwQ7v32s3v0l48b8-t5wuvJ": "grupos/c/2",
    "1TJgY46zcn-Hj0iDX3C38xfUW5Up9XYfe": "grupos/c/3",
    "15Vo-Hg6aJ_2H00hvYzS9sDKzN-67SfQd": "grupos/c/4",

    "18r7CmOj556Y4vzq6lDUbWt8BCappgTtF": "grupos/d/1",
    "1-QItLjnOnOKUtmNrB3YTjmBBlRpiHvFE": "grupos/d/2",
    "1UJqttxbN9xawfUncfSLImH9AxfW1Xxrs": "grupos/d/3",
    "1dNBIqQcbGEluJiBd3D7XJ_lAkzPWJ5AZ": "grupos/d/4",

    "1-AK_F5rLH0YBqEZ8KqzGJ8c19y5RV3kD": "grupos/e/1",
    "1se3jeWgfqWDZc_iSbfkOWAD4XmFeCPWd": "grupos/e/2",
    "1m2pugzgEFc4FJgCw8eKIoGF8jVRuJ2lw": "grupos/e/3",
    "149p1Alcbvk5ndMGOUeGZNu0Ca56YP4fZ": "grupos/e/4",

    "17vV10YiJGT-lcP0fTOgtIk1lf3DCN7Yn": "grupos/f/1",
    "14sBmBCvEhaBjkG6doLEQ3KLJLBN7-i4q": "grupos/f/2",
    "1pYBeV8lyz52_r9C5omMV11NHFBNmRl0l": "grupos/f/3",
    "1MsU93G3LuR3xxjeGi1-M__izIc7Eb3ox": "grupos/f/4",

    "1ZWWFbYoxkTJPJVGMG-_4aBe87-JtHXCO": "grupos/g/1",
    "1FlP9OqP1Gvp8_W7ZJOAphwvlxpY2DVjR": "grupos/g/2",
    "1EHzwJEIVKtoRqtZQiT2QyGLdCcWxvEMO": "grupos/g/3",
    "1QhaiS1UWNV-H2kPuhPbqk2qKWGWueV-t": "grupos/g/4",

    "1zgheGhGDdiHtrXGJ2m5y6hP-vWmRn35k": "grupos/h/1",
    "1YoKFc_V4a1Pt6p_HBbF_RM6mxUw5MHtR": "grupos/h/2",
    "11fem1WOmJVdk_jucYiuAG37w5Dh5zIaf": "grupos/h/3",
    "1kXBCpAvyDD1mbPaYuIYVRz5Hgl-r04lz": "grupos/h/4",

    "1XHVOLnxpYuOAjhKjlr9EolGQoEdR9wg8": "grupos/i/1",
    "1TUW8adcFpcY3q7h0ojp-ZDGNk3MsNm3Z": "grupos/i/2",
    "1UKcHNN3ZQV_cUJ2Gjl_hKRQRhA1dp7HO": "grupos/i/3",
    "1K4FumJpNjkXsf889sUM4X2NQmiC2dRph": "grupos/i/4",

    "1r-LQmG6HEhTIhNWKYuUOzltYVZk4ua29": "grupos/j/1",
    "1qKpv1e-zclEELj7cKsvXcyrvLJadphYR": "grupos/j/2",
    "1fMEKnodgZL1xmqGwaFM_3JlJMVI2N3Yd": "grupos/j/3",
    "11IiZDJ1r8nR5C0byzWwCfIfjuE0uryio": "grupos/j/4",

    "1Cu1-h9_1IbIAFojty90Z1YkvboE1_K4d": "grupos/k/1",
    "1bZ3n1wlj3p4xkoaBsXjvP-C18RouZyFz": "grupos/k/2",
    "1Bo9_M3m2nUF0S3bmAqYsAk91PzUa1Bib": "grupos/k/3",
    "1pW2k4Y1joWEMG_jnYV4meBdkk5GfE-vH": "grupos/k/4",

    "1oUduTPBx2KOoWK_VWFwuQLptCUtOAQbF": "grupos/l/1",
    "1rqhz-kRSUq2q_fA59gTnX5VsUiTj8THC": "grupos/l/2",
    "1jygtnJ1KJGs2rjTIYQ8dtEu04QFCt-70": "grupos/l/3",
    "1gTTyrRGwbjIg5QfqZgQajeHu8Mh7FVxC": "grupos/l/4",
}


def autenticar():
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                print(f"\n❌ No encontré {CREDENTIALS_FILE}")
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE,
                SCOPES
            )
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return creds


def normalizar_nombres_imagenes(raw_images):
    """
    Convierte:
      02,03,10,11
    en:
      ["02.png", "03.png", "10.png", "11.png"]

    También acepta:
      02.png,03.png
    """

    if not raw_images:
        return []

    images = []

    parts = raw_images.split(",")

    for part in parts:
        name = part.strip()

        if not name:
            continue

        if not name.lower().endswith(".png"):
            name += ".png"

        images.append(name)

    return images


def elegir_carpeta():
    folders_sorted = sorted(FOLDERS.items(), key=lambda x: x[1])

    # mapa ruta completa → (fid, path)
    path_map = {path: (fid, path) for fid, path in folders_sorted}

    print("\n📁 Carpetas disponibles:\n")
    print(f"  {'#':>3}  Ruta")
    print(f"  {'─'*3}  {'─'*18}")

    for i, (fid, path) in enumerate(folders_sorted, 1):
        print(f"  {i:>3}  {path}")

    print()
    print("  Puedes escribir:")
    print("    - número: 5")
    print("    - clave: b1")
    print("    - clave + imagen: b1:07")
    print("    - clave + varias imágenes: c4:02,03,10,11")
    print("    - número + varias imágenes: 12:02,03,10")
    print("    - también acepta .png: c4:02.png,03.png\n")

    while True:
        raw = input("Elige: ").strip()

        selected_images = []

        # Permite formato carpeta:imagenes
        # Ejemplos:
        # b1:07
        # c4:02,03,10,11
        # 12:02,03
        if ":" in raw:
            folder_part, images_part = raw.split(":", 1)

            folder_part = folder_part.strip()
            images_part = images_part.strip()

            if not images_part:
                print("  ❌ Debes indicar una o varias imágenes después de ':'")
                continue

            selected_images = normalizar_nombres_imagenes(images_part)
            raw = folder_part

            if not selected_images:
                print("  ❌ No se detectaron imágenes válidas.")
                continue

        # Número directo
        if raw.isdigit() and 1 <= int(raw) <= len(folders_sorted):
            folder_id, path_prefix = folders_sorted[int(raw) - 1]
            return folder_id, path_prefix, selected_images

        # Clave tipo:
        # G2, g2, A4, c4
        # c4 → grupos/c/4
        m = re.fullmatch(r'([a-lA-L])(\d{1,2})', raw)

        if m:
            letra = m.group(1).lower()
            numero = m.group(2)

            target = f"grupos/{letra}/{numero}"

            if target in path_map:
                folder_id, path_prefix = path_map[target]
                return folder_id, path_prefix, selected_images

            print(f"  ❌ No existe la carpeta {target}, intenta de nuevo.")
            continue

        print("  Entrada inválida. Escribe un número, una clave como b1 o c4:02,03,10")


def pedir_archivos_locales(path_prefix, selected_images=None):
    """
    Si selected_images viene vacío:
      sube todos los PNG de la carpeta.

    Si selected_images trae valores:
      sube solamente esos archivos.
    """

    if selected_images is None:
        selected_images = []

    local_path = Path(CROMOS_BASE) / path_prefix.replace("/", os.sep)

    print(f"\n📂 Buscando PNG en: {local_path}")

    if local_path.exists():

        # Caso: el usuario eligió imágenes específicas
        if selected_images:
            archivos = []
            faltantes = []

            for image_name in selected_images:
                file_path = local_path / image_name

                # Intento normal
                if file_path.exists() and file_path.is_file():
                    archivos.append(file_path)
                    continue

                # Intento por mayúscula .PNG
                file_path_upper = local_path / image_name.replace(".png", ".PNG")

                if file_path_upper.exists() and file_path_upper.is_file():
                    archivos.append(file_path_upper)
                    continue

                faltantes.append(image_name)

            if faltantes:
                print("\n  ❌ No encontré estas imágenes:")
                for name in faltantes:
                    print(f"    - {name}")

                print(f"\n  Carpeta revisada:")
                print(f"    {local_path}")
                sys.exit(1)

            print("\n  ✅ Imágenes seleccionadas:")
            for archivo in archivos:
                print(f"    - {archivo.name}")

            return archivos

        # Caso: no eligió imágenes específicas, sube todos los PNG
        pngs = sorted(local_path.glob("*.png")) + sorted(local_path.glob("*.PNG"))

        if pngs:
            return pngs

        print("  ⚠️  No hay archivos PNG en esa carpeta.")

    else:
        print("  ⚠️  La carpeta automática no existe.")

    print("\n  Escribe otra ruta o arrastra la carpeta aquí:\n")

    while True:
        raw = input("Ruta: ").strip().strip('"')
        folder = Path(raw)

        if not folder.exists():
            print("  ❌ Esa ruta no existe, intenta de nuevo.")
            continue

        if selected_images:
            archivos = []
            faltantes = []

            for image_name in selected_images:
                file_path = folder / image_name

                if file_path.exists() and file_path.is_file():
                    archivos.append(file_path)
                    continue

                file_path_upper = folder / image_name.replace(".png", ".PNG")

                if file_path_upper.exists() and file_path_upper.is_file():
                    archivos.append(file_path_upper)
                    continue

                faltantes.append(image_name)

            if faltantes:
                print("\n  ❌ No encontré estas imágenes:")
                for name in faltantes:
                    print(f"    - {name}")
                continue

            print("\n  ✅ Imágenes seleccionadas:")
            for archivo in archivos:
                print(f"    - {archivo.name}")

            return archivos

        pngs = sorted(folder.glob("*.png")) + sorted(folder.glob("*.PNG"))

        if not pngs:
            print("  ⚠️  No hay archivos PNG en esa carpeta.")
            continue

        return pngs


def subir_a_drive(service, folder_id, file_path):
    metadata = {
        "name": file_path.name,
        "parents": [folder_id]
    }

    media = MediaFileUpload(
        str(file_path),
        mimetype="image/png",
        resumable=False
    )

    uploaded = service.files().create(
        body=metadata,
        media_body=media,
        fields="id"
    ).execute()

    return uploaded["id"]


def subir_al_servidor(file_id, path, file_path):
    with open(file_path, "rb") as f:
        resp = requests.post(
            SERVER_URL,
            headers={"X-Upload-Token": UPLOAD_TOKEN},
            data={
                "action": "upload",
                "fileId": file_id,
                "path": path
            },
            files={
                "file": (file_path.name, f, "image/png")
            },
            timeout=30,
        )

    return resp.status_code, resp.json() if resp.content else {}


def main():
    print("═" * 55)
    print("  Uploader de cromos: Local → Drive + Servidor")
    print("═" * 55)

    creds = autenticar()
    service = build("drive", "v3", credentials=creds)

    folder_id, path_prefix, selected_images = elegir_carpeta()

    archivos = pedir_archivos_locales(
        path_prefix=path_prefix,
        selected_images=selected_images
    )

    print(f"\n  {len(archivos)} archivo(s) encontrado(s). Subiendo...\n")

    ok = 0
    fail = 0

    for file_path in archivos:
        nombre = file_path.name.lower()
        path = f"{path_prefix}/{nombre}"

        print(f"  ↑ {file_path.name}", end="", flush=True)

        try:
            # 1. Subir a Drive
            drive_file_id = subir_a_drive(service, folder_id, file_path)
            print(" → Drive ✓", end="", flush=True)

            # 2. Subir al servidor
            status, body = subir_al_servidor(drive_file_id, path, file_path)

            if status == 200:
                print(" → Servidor ✓")
                ok += 1
            else:
                err = body.get("error", "?")
                print(f" → Servidor ✗ ({err})")
                fail += 1

        except Exception as e:
            print(f" ✗ Error: {e}")
            fail += 1

    print(f"\n{'═' * 55}")
    print(f"  Resultado: {ok} subidos, {fail} fallidos")
    print(f"{'═' * 55}\n")


if __name__ == "__main__":
    main()