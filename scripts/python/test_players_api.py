"""
Diagnóstico rápido del endpoint manage-players.
Ejecuta: python scripts/test_players_api.py
"""

import requests
import json

BASE_URL     = "https://albumfifa2026.chanzia.com/api/manage-players.php"
UPLOAD_TOKEN = "xK9#mP2$qR7nL4vT8wY1"
HEADERS      = {"X-Upload-Token": UPLOAD_TOKEN}

print("═" * 60)
print("  Diagnóstico manage-players")
print("═" * 60)

# 1. Debug público (GET)
print("\n[1] GET ?debug=1 (sin token) ...")
try:
    r = requests.get(BASE_URL + "?debug=1", timeout=10)
    print(f"    HTTP {r.status_code}")
    data = r.json()
    print(json.dumps(data, indent=4, ensure_ascii=False))
except Exception as e:
    print(f"    ERROR: {e}")

# 2. get-overrides (POST con token)
print("\n[2] POST action=get-overrides ...")
try:
    r = requests.post(BASE_URL, headers=HEADERS, data={"action": "get-overrides"}, timeout=10)
    print(f"    HTTP {r.status_code}")
    print(f"    Respuesta: {r.text[:300]}")
except Exception as e:
    print(f"    ERROR: {e}")

# 3. update-player de prueba
print("\n[3] POST action=update-player (MEX, slot 1, nombre TEST) ...")
try:
    r = requests.post(BASE_URL, headers=HEADERS, data={
        "action": "update-player",
        "code": "MEX",
        "slot": 1,
        "name": "TEST_NOMBRE",
    }, timeout=10)
    print(f"    HTTP {r.status_code}")
    print(f"    Respuesta: {r.text}")
except Exception as e:
    print(f"    ERROR: {e}")

# 4. Leer players-override.json directamente
print("\n[4] GET /api/players-override.json (lo que ve el frontend) ...")
try:
    r = requests.get("https://albumfifa2026.chanzia.com/api/players-override.json", timeout=10)
    print(f"    HTTP {r.status_code}")
    print(f"    Contenido: {r.text[:300]}")
except Exception as e:
    print(f"    ERROR: {e}")

print("\n" + "═" * 60)
