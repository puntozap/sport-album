# BLOG — Activar el blog desde Google Sheets

## ¿Qué hace esto?

El menú del álbum tiene un botón **📰 Blog** que abre un modal con artículos.
Los artículos se gestionan desde un Google Sheet: título, portada, contenido y fecha.
Cuando publicas o editas un artículo en el sheet, aparece en la app automáticamente.

---

## Paso 1 — Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea un nuevo archivo.
   Ponle un nombre, por ejemplo: `Blog Album FIFA 2026`
2. Renombra la primera hoja (pestaña inferior) como exactamente: **`Blog`**
3. Escribe los encabezados en la **fila 1** tal como aparecen abajo
   (en minúsculas, sin tildes):

| A — Titulo | B — Portada | C — Contenido | D — Fecha | E — Activo |
|------------|-------------|---------------|-----------|------------|
| Mi primer artículo | https://... | El texto aquí | 2026-06-11 | TRUE |

> Los encabezados deben ser exactamente: `Titulo`, `Portada`, `Contenido`, `Fecha`, `Activo`

---

## Paso 2 — Publicar el Apps Script

1. Dentro del Google Sheet: **Extensiones → Apps Script**
2. Borra todo el código por defecto.
3. Copia y pega el contenido de:
   ```
   scripts/apps-script/blog-apps-script.js
   ```
4. Guarda con **Ctrl + S**.
5. Clic en **"Implementar"** → **"Nueva implementación"**
6. Configura:
   - **Tipo:** Aplicación web
   - **Ejecutar como:** Yo
   - **Quién puede acceder:** Cualquier usuario (anónimo)
7. Clic en **"Implementar"**, acepta los permisos.
8. Copia la **URL de la aplicación web**.
   Tiene este formato:
   `https://script.google.com/macros/s/XXXXXXXXXX/exec`

---

## Paso 3 — Conectar la URL al álbum

1. Abre: `src/components/BlogPage.js`
2. Busca la línea:
   ```js
   const BLOG_ENDPOINT = '';
   ```
3. La URL ya está conectada:
   ```js
   const BLOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyExumHBeTvMusxjm_Kzn2VQGJ0-Pr_CtRJywMJnCb6Ft5WbvAwJtL4spiWKzAEV5YjXw/exec';
   ```
4. Guarda y haz `npm run build` para publicar.

---

## Cómo escribir artículos

### Campos del Sheet

| Campo | Qué poner |
|-------|-----------|
| **Titulo** | El titular del artículo |
| **Portada** | URL de una imagen (ver opciones abajo) |
| **Contenido** | El cuerpo del artículo (ver formato abajo) |
| **Fecha** | En formato `YYYY-MM-DD`, ej: `2026-06-11` |
| **Activo** | `TRUE` para publicar, `FALSE` para guardar como borrador |

### Cómo poner la imagen de portada

**Opción A — Google Drive:**
1. Sube la imagen a Google Drive.
2. Clic derecho → **Compartir** → "Cualquiera con el enlace".
3. Copia el ID del archivo de la URL (la parte larga entre `/d/` y `/view`).
4. Arma la URL así:
   ```
   https://drive.google.com/uc?export=view&id=TU_ID_AQUI
   ```

**Opción B — Cualquier imagen pública:**
Pega directamente la URL de la imagen. Funciona con Imgur, imgbb, etc.

### Formato del contenido (en la celda)

Escribe el texto en la celda. Usa **Shift+Enter** (o Alt+Enter en Windows)
para saltar de línea dentro de la celda.

```
# Título grande

Este es un párrafo normal con **texto en negrita** y *texto en cursiva*.

## Subtítulo

Otro párrafo. Puedes agregar un enlace así:
Visita [Paramount+](https://www.paramountplus.com) para ver los partidos.
```

| Sintaxis | Resultado |
|----------|-----------|
| `# Texto` | Título grande |
| `## Texto` | Subtítulo |
| `**texto**` | **Negrita** |
| `*texto*` | *Cursiva* |
| `[texto](https://url)` | Hipervínculo |
| Línea en blanco | Nuevo párrafo |

---

## Cómo gestionar artículos

| Acción | Cómo hacerlo |
|--------|-------------|
| Publicar | Escribe la fila y pon `TRUE` en Activo |
| Ocultar temporalmente | Cambia Activo a `FALSE` |
| Borrar definitivamente | Elimina la fila |
| Reordenar | Los artículos se ordenan por Fecha (más reciente primero) |
| Actualizar un artículo | Edita la celda y guarda — se refleja en la app al instante |

---

## Referencia rápida — Precios de Vistrea (Paramount+)

El endpoint de precios de Vistrea **ya está conectado** en el álbum:

```
https://script.google.com/macros/s/AKfycbxL34t1jCMcOAQn3JMBENajGOLTnRQMv0PoxOPqKCZBZnxn89F2bjzmGhJGonBCc8jWgw/exec
```

Para actualizar precios: edita el Google Sheet de Vistrea (hoja `Precios`)
y cambia los valores de las columnas `USD` o `Bs`. No hace falta redesplegar nada.

Ver guía completa: [VISTREA-SETUP.md](VISTREA-SETUP.md)
