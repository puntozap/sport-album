import json
import os
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"]

# ID de la carpeta raíz del álbum en Drive.
# Ejemplo: https://drive.google.com/drive/folders/ABC123
# El ID sería ABC123
ROOT_FOLDER_ID = "1LgvEdY1lUllVvh1COmW_RIchk4XdhXbV"

OUTPUT_JSON = "folders-map.json"
OUTPUT_JS = "folders-map-n8n.js"


def get_drive_service():
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json",
                SCOPES
            )
            creds = flow.run_local_server(port=0)

        with open("token.json", "w", encoding="utf-8") as token:
            token.write(creds.to_json())

    return build("drive", "v3", credentials=creds)


def list_child_folders(service, parent_id):
    folders = []
    page_token = None

    query = (
        f"'{parent_id}' in parents "
        "and mimeType='application/vnd.google-apps.folder' "
        "and trashed=false"
    )

    while True:
        response = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name)",
            pageToken=page_token,
            pageSize=1000,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()

        folders.extend(response.get("files", []))

        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return folders


def main():
    service = get_drive_service()

    folders_map = {}

    # Busca carpeta "grupos" dentro de Album Panini 2026
    root_folders = list_child_folders(service, ROOT_FOLDER_ID)

    grupos_folder = None
    for folder in root_folders:
        if folder["name"].lower().strip() == "grupos":
            grupos_folder = folder
            break

    if not grupos_folder:
        raise Exception("No encontré la carpeta 'grupos' dentro de la carpeta raíz.")

    grupos_id = grupos_folder["id"]

    # Busca carpetas de grupo: a, b, c, d...
    group_folders = list_child_folders(service, grupos_id)

    for group in group_folders:
        group_name = group["name"].strip().lower()

        # Solo carpetas tipo a, b, c...
        if not group_name.isalpha():
            continue

        team_folders = list_child_folders(service, group["id"])

        for team in team_folders:
            team_name = team["name"].strip()

            # Solo carpetas numéricas: 1, 2, 3...
            if not team_name.isdigit():
                continue

            drive_folder_id = team["id"]
            path_prefix = f"grupos/{group_name}/{team_name}"

            folders_map[drive_folder_id] = path_prefix

    # Ordenar por ruta
    folders_map = dict(
        sorted(
            folders_map.items(),
            key=lambda item: item[1]
        )
    )

    Path(OUTPUT_JSON).write_text(
        json.dumps(folders_map, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    js_code = "const folders = "
    js_code += json.dumps(folders_map, indent=2, ensure_ascii=False)
    js_code += """;

const item = $input.first().json;

const parentId = Array.isArray(item.parents) ? item.parents[0] : item.parents;

const pathPrefix = folders[parentId];

if (!pathPrefix) {
  throw new Error(`No existe pathPrefix configurado para parentId: ${parentId}`);
}

return [
  {
    json: {
      fileId: item.id,
      name: item.name,
      mimeType: item.mimeType,
      parentId,
      pathPrefix,
      path: `${pathPrefix}/${item.name}`,
    }
  }
];
"""

    Path(OUTPUT_JS).write_text(js_code, encoding="utf-8")

    print("Listo. Archivos generados:")
    print(f"- {OUTPUT_JSON}")
    print(f"- {OUTPUT_JS}")
    print()
    print("Total de carpetas detectadas:", len(folders_map))
    print()
    print(json.dumps(folders_map, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()