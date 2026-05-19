# Sincronización de Cromos con Google Drive + n8n

Cada vez que subes, renombras o eliminas una imagen en Google Drive,
n8n la sincroniza automáticamente en el servidor. Sin rebuild, sin tocar código.

---

## Cómo funciona

```
Google Drive (grupos/a/1/00.png)
        ↓  trigger automático
       n8n  descarga + POST al servidor
        ↓
  upload-cromo.php  valida + guarda
        ↓
cromos_extraidos/grupos/a/1/00.png  ← disponible al instante
```

- **Subir** → archivo nuevo en el servidor
- **Renombrar** → borra el slot viejo, guarda con el nuevo nombre
- **Eliminar** → borra el archivo del servidor

---

## Paso 1 — Estructura de carpetas en Google Drive

Crea esta estructura **exacta** (mismos nombres que en `cromos_extraidos/`):

```
📁 Album Panini 2026/           ← carpeta raíz (el nombre no importa)
  📁 grupos/
    📁 a/
      📁 1/    ← Mexico
        🖼 00.png   (slot dorado)
        🖼 01.png
        🖼 05.png   (puedes subir solo los que tengas)
      📁 2/    ← South Africa
        🖼 01.png
    📁 b/
      📁 7/
        🖼 03.png
```

**Reglas de nombres:**
- Carpeta grupo: letra minúscula (`a`, `b`, `c`…)
- Carpeta equipo: número (`1`, `2`, `3`…)
- Archivo: dos dígitos + `.png` (`00.png` a `11.png`)

Para saber qué letra/número corresponde a cada país, revisa `src/data/stickerMap.json`.

---

## Paso 2 — Configurar el token secreto en el servidor

Abre `public/api/upload-cromo.php` y cambia la línea:

```php
define('UPLOAD_TOKEN', 'CAMBIA_ESTO_POR_UN_TOKEN_SECRETO');
```

Por cualquier cadena larga aleatoria, por ejemplo:
```php
define('UPLOAD_TOKEN', 'xK9#mP2$qR7nL4vT8wY1');
```

Guarda ese token — lo necesitas en n8n.

---

## Paso 3 — Instalar n8n

### Opción A — n8n Cloud (más fácil)
1. Ve a [app.n8n.cloud](https://app.n8n.cloud) y crea una cuenta gratis
2. Crea un workspace
3. Listo, tienes tu URL: `https://tu-workspace.app.n8n.cloud`

### Opción B — n8n self-hosted (Docker)
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```
Accede en `http://localhost:5678`

---

## Paso 4 — Conectar Google Drive en n8n

1. En n8n ve a **Settings → Credentials → Add Credential**
2. Busca **Google Drive OAuth2**
3. Sigue el asistente (necesitas una cuenta Google con acceso a la carpeta de Drive)
4. Guarda la credencial con el nombre: `Google Drive Cromos`

---

## Paso 5 — Workflow: Subir y Renombrar

Este workflow se activa cuando subes un archivo nuevo O lo renombras en Drive.

### Crear el workflow

1. **New Workflow** → nombre: `Sync Cromos - Upload`

### Nodo 1: Google Drive Trigger
```
Tipo:         Google Drive Trigger
Credencial:   Google Drive Cromos
Evento:       File Created  (activa también para renamed via "Updated")
Drive:        My Drive
Folder:       [selecciona tu carpeta grupos/]
Include in subfolders: ✅ Sí
```
> Repite con un segundo trigger igual pero evento **File Updated** — conéctalos ambos al mismo siguiente nodo.

### Nodo 2: Obtener ruta relativa (Code node)
```javascript
// Construye la ruta relativa a partir del nombre de archivo y carpeta padre
const item = $input.first().json;

// El trigger de Drive da: name, id, parents, webViewLink
// La ruta en Drive debe ser: grupos/a/1/00.png
// n8n Drive Trigger da el path completo en 'name' si configuras el folder raíz

// Ajusta según tu estructura — ejemplo con nombre de carpeta en el path:
const fullPath = item.name; // e.g. "grupos/a/1/00.png" si Drive da el path
// Si Drive solo da el nombre de archivo, necesitas armar la ruta con los parents

return [{
  json: {
    fileId:  item.id,
    path:    fullPath,   // "grupos/a/1/00.png"
    name:    item.name,
  }
}];
```

> **Nota**: si Drive trigger solo da el `name` del archivo (sin la carpeta), 
> agrega un nodo **Google Drive → Get File** para obtener los `parents`, 
> luego otro **Google Drive → Get File** para resolver el nombre de la carpeta padre.
> Ver sección "Resolver ruta completa" más abajo.

### Nodo 3: Descargar archivo
```
Tipo:         Google Drive → Download File
File ID:      {{ $json.fileId }}
```

### Nodo 4: Enviar al servidor
```
Tipo:         HTTP Request
Method:       POST
URL:          https://tu-dominio.com/api/upload-cromo.php

Headers:
  X-Upload-Token:  xK9#mP2$qR7nL4vT8wY1   ← tu token

Body Type:    Form-Data (Multipart)
Fields:
  action   = upload
  fileId   = {{ $('Nodo 2').item.json.fileId }}
  path     = {{ $('Nodo 2').item.json.path }}
  file     = [Binary] → selecciona el binario del nodo de descarga
```

---

## Paso 6 — Workflow: Eliminar

### Crear el workflow

1. **New Workflow** → nombre: `Sync Cromos - Delete`

### Nodo 1: Google Drive Trigger
```
Evento:  File Deleted
Folder:  [tu carpeta grupos/]
Include in subfolders: ✅
```

### Nodo 2: Enviar delete al servidor
```
Tipo:    HTTP Request
Method:  POST
URL:     https://tu-dominio.com/api/upload-cromo.php

Headers:
  X-Upload-Token: xK9#mP2$qR7nL4vT8wY1

Body Type: Form-Data
Fields:
  action  = delete
  fileId  = {{ $json.id }}
```

---

## Paso 7 — Workflow: Sincronizar TODO (manual)

Úsalo la primera vez para subir todos los cromos que ya tengas en Drive.

### Crear el workflow

1. **New Workflow** → nombre: `Sync Cromos - Full Sync`

### Nodo 1: Manual Trigger
```
Tipo: Manual Trigger
```

### Nodo 2: Listar todos los archivos
```
Tipo:      Google Drive → Search Files
Query:     mimeType='image/png'
Folder:    [tu carpeta grupos/]
Include subfolders: ✅
```

### Nodo 3: Loop (Split in Batches)
```
Batch Size: 1
```

### Nodo 4: Descargar archivo
```
Tipo:    Google Drive → Download File
File ID: {{ $json.id }}
```

### Nodo 5: Code — obtener path
```javascript
const file = $('Nodo 2').item.json;
// Construye la ruta igual que en el workflow de upload
return [{ json: { fileId: file.id, path: file.name /* ajusta */, name: file.name } }];
```

### Nodo 6: HTTP Request → upload-cromo.php
_(Igual que el Paso 5, Nodo 4)_

---

## Resolver ruta completa desde Drive

Si el trigger de Drive solo da el nombre del archivo (sin carpeta), usa esta secuencia:

```
[Drive Trigger]
      ↓
[Google Drive → Get File]   File ID: {{ $json.id }}
Fields: name, parents
      ↓
[Google Drive → Get File]   File ID: {{ $json.parents[0] }}
Fields: name, parents
→ nombre de carpeta equipo (ej. "1")
      ↓
[Google Drive → Get File]   File ID: {{ $json.parents[0] }}
→ nombre de carpeta grupo (ej. "a")
      ↓
[Code node]
const slotFile  = 'nombre del archivo';    // "00.png"
const teamFolder = 'nombre carpeta equipo'; // "1"
const groupFolder = 'nombre carpeta grupo'; // "a"
const path = `grupos/${groupFolder}/${teamFolder}/${slotFile}`;
return [{ json: { fileId, path } }];
```

---

## Probar que funciona

1. Sube una imagen PNG a Drive con nombre `00.png` en la carpeta `grupos/a/1/`
2. n8n debe activarse en segundos
3. Verifica que aparece en `cromos_extraidos/grupos/a/1/00.png` en el servidor
4. Abre la web y navega a México → el cromo aparece sin hacer nada más

Para ver los logs del servidor: revisa `public/api/drive-manifest.json` —
ahí queda registrado qué fileId de Drive corresponde a qué ruta.

---

## Resumen de archivos importantes

| Archivo | Qué hace |
|---|---|
| `public/api/upload-cromo.php` | Recibe archivos de n8n y los guarda |
| `public/api/drive-manifest.json` | Registro fileId → ruta (lo crea solo) |
| `cromos_extraidos/` | Donde viven las imágenes en el servidor |
| `src/data/stickerMap.json` | Mapa estático de fallback |
| `src/config/remote.js` | Config de n8n (si quieres servir desde Drive directamente) |
