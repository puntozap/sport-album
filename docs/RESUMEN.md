# Album FIFA 2026 — Resumen técnico

## Stack

- **Frontend**: Vite + vanilla JS (SPA), pnpm build
- **Backend**: PHP en Apache (Laragon local / servidor CentOS con SELinux)
- **Deploy**: FTP via `scripts/deploy.py`
- **Servidor**: `https://albumfifa2026.chanzia.com`

---

## Archivos clave

### Frontend
| Archivo | Descripción |
|---|---|
| `src/app.js` | Inicialización, rutas, polling de overrides |
| `src/data/countries.js` | Datos de equipos + `patchPlayerNames()` |
| `src/data/resultsStore.js` | Resultados simulados por el usuario (localStorage) |
| `src/data/serverResultsStore.js` | Resultados oficiales del servidor (memoria) |
| `src/data/matchesData.js` | Partidos del mundial desde JSON |
| `src/data/standingsEngine.js` | Cálculo de tabla de posiciones |
| `src/components/MatchCard.js` | Tarjeta de partido con lógica de bloqueo |
| `src/components/GroupFixturePanel.js` | Panel de fixture + tabla del grupo |
| `src/components/CountryCurtain.js` | Cortina de transición entre países |

### Backend (PHP en `public/api/`)
| Archivo | Descripción |
|---|---|
| `manage-players.php` | CRUD de nombres de jugadores |
| `manage-matches.php` | CRUD de resultados de partidos |
| `manage-cromo.php` | Listar y borrar cromos del servidor |
| `upload-cromo.php` | Subir imágenes de cromos |
| `players-override.json` | Overrides de nombres (escrito por PHP, leído por frontend) |
| `matches-override.json` | Resultados oficiales (escrito por PHP via n8n) |
| `.htaccess` | Bloquea listado y acceso directo a PHP no autorizado |

### Scripts Python (`scripts/`)
| Archivo | Descripción |
|---|---|
| `deploy.py` | Deploy FTP de `dist/` al servidor |
| `upload_cromos.py` | Subir cromos por grupo (acepta `G2`, `A4`, etc.) |
| `borrar_cromo.py` | Borrar cromos del servidor via API |
| `editar_jugador.py` | Editar nombres de jugadores con scraping web |
| `init_players_sheet.py` | Crear Google Spreadsheet con jugadores y partidos |

### n8n
| Archivo | Descripción |
|---|---|
| `scripts/n8n_workflow_matches.json` | Workflow listo para importar en n8n |

---

## Sistemas implementados

### 1. Nombres de jugadores con override
- PHP escribe `players-override.json`
- Frontend hace `fetch` con `cache: 'no-store'` en cada navegación
- `patchPlayerNames()` restaura desde `originalName` antes de aplicar overrides
- Script Python `editar_jugador.py` busca nombres en Wikipedia, FIFA, Transfermarkt, FBRef, Soccerway con fuzzy matching

### 2. Resultados de partidos en tiempo real
- n8n lee el Google Spreadsheet (hoja "Partidos") cuando detecta cambios
- n8n llama `POST /api/manage-matches` con `action=set-matches`
- PHP escribe `matches-override.json`
- Frontend hace polling cada **30 segundos** y actualiza `serverResultsStore`
- `GroupFixturePanel` se rerenderiza automáticamente via `subscribe()`

### 3. Lógica de resultados (dos capas)
| Capa | Store | Prioridad | Fuente |
|---|---|---|---|
| Oficial | `serverResultsStore` | Alta | Spreadsheet → n8n → PHP |
| Simulado | `resultsStore` | Baja | Usuario en el panel |

- Si hay resultado oficial: inputs bloqueados, simulación del usuario aparece en paréntesis `(tu sim: X-Y)`
- Sin resultado oficial: editable durante 24h después del partido
- `mergeResults()` combina ambas capas para el cálculo de standings

### 4. Transición entre países (cortina)
- La cortina espera a que carguen todos los cromos antes de desaparecer
- Máximo de espera: 4 segundos
- Implementado con `Promise.race([readyPromise, maxWait])`

### 5. Cromos
- Subida via `upload_cromos.py` → `upload-cromo.php`
- Borrado via `borrar_cromo.py` → `manage-cromo.php`
- Acceso directo al directorio bloqueado por `.htaccess`

---

## Google Spreadsheet
**ID**: `1dIxWGmcn9AS49Dn7JymDHYEAwQL_fYXO7l3OswwRFro`

### Estructura
| Hoja | Contenido |
|---|---|
| `Partidos` | Una fila por partido — `match_id | group | matchday | home | away | home_score | away_score | date | timeET | status` |
| `Grupo A` … `Grupo L` | Una fila por jugador — `code | team_name | slot | player_name` |

---

## n8n workflow — Resultados de partidos
**Trigger**: Google Sheets Trigger (`anyUpdate`) — se dispara al modificar la hoja "Partidos"

```
Sheets Trigger → Preparar datos (Code) → ¿Hay marcadores? (If) → Actualizar servidor (HTTP POST)
```

**Endpoint**: `POST https://albumfifa2026.chanzia.com/api/manage-matches`
- Header: `X-Upload-Token: xK9#mP2$qR7nL4vT8wY1`
- Body: `action=set-matches`, `matches=[{"match_id":"1","home_score":2,"away_score":1,"status":"played"}]`

---

## Autenticación de endpoints
Todos los endpoints POST requieren el header:
```
X-Upload-Token: xK9#mP2$qR7nL4vT8wY1
```

---

## Permisos en servidor (SELinux - CentOS)
Si PHP no puede escribir archivos JSON:
```bash
chcon -t httpd_sys_rw_content_t /ruta/al/archivo.json
```

---

## Comandos frecuentes
```bash
# Build
pnpm build

# Deploy al servidor
python scripts/deploy.py

# Editar nombres de jugadores
python scripts/editar_jugador.py

# Subir cromos (acepta G2, A4, etc.)
python scripts/upload_cromos.py

# Crear/recrear spreadsheet de Google
python scripts/init_players_sheet.py
```
