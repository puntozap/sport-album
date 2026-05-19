# Álbum Panini Mundial 2026 — SPA Interactivo

Aplicación web tipo Single Page Application (SPA) que recrea digitalmente las páginas del álbum Panini del Mundial 2026. Cada país tiene su propia página con fondo temático, slots de cromos, nombres de jugadores, y un sistema de navegación entre equipos.

**Demo en vivo:** Abre `index.html` después de compilar, o corre `npm run dev`.

---

## ¿Qué hace este proyecto?

1. **Extrae cromos** de imágenes escaneadas del álbum físico usando Python
2. **Genera datos de equipos** (nombres, colores, jugadores) desde las páginas escaneadas vía OCR
3. **Construye una SPA** en vanilla JS donde cada país tiene su página temática
4. **Pega cromos automáticamente** en los slots según los archivos que encuentre en las carpetas

---

## Pipeline de trabajo (cómo se creó todo)

### Paso 1: Del PDF a PNG limpio (`sin-margen.py`)

```
pdf/Album-para-Figuras.pdf  →  paginas_png_sin_margen/pagina_01.png, pagina_02.png...
```

- Usa **PyMuPDF (fitz)** para renderizar cada página del PDF a imagen
- Aplica un recorte automático que detecta y elimina márgenes blancos
- El resultado son páginas PNG de alta resolución sin bordes blancos

### Paso 2: Extraer cromos individuales (`cutter.py`)

```
paginas_png_sin_margen/pagina_35.png  →  cromos_extraidos/pagina_01/cromo_01.png, cromo_02.png...
```

- Recorta el área útil de cada página (quitando marco blanco)
- Divide en una matriz de **4 columnas × 4 filas** = 16 cromos por página
- Nombra cada cromo con formato: `pagina_XX_cromo_NN_fila_F_col_C.png`
- También existe una versión para álbumes extra (`cutter.py` adaptado para `Extra-Stickers` y `Coca-Cola`)

### Paso 3: OCR para extraer datos del álbum (`paises.py`)

```
paginas_png_sin_margen/pagina_35.png  →  countries.grouped.json + countries.generated.js
```

- Usa **EasyOCR** (español + inglés) para leer texto de cada página escaneada
- Extrae:
  - **Nombre del país** (zona superior: "WE ARE MEXICO")
  - **Código FIFA** (del primer slot: "MEX")
  - **Federación** (zona media izquierda)
  - **Grupo** (zona inferior derecha: "GROUP A" + códigos de países)
  - **Nombres de jugadores** (de cada uno de los 12 slots)
- Aplica correcciones manuales para nombres con acentos (Malagón, Vásquez, etc.)
- Genera un JSON agrupado por grupos y un archivo JS listo para importar

### Paso 4: Generar datos maestros (`teamsData.json`)

El JSON final `src/data/teamsData.json` contiene:
- **48 equipos** organizados en 12 grupos (A-L)
- **Colores temáticos** por país (primary, secondary, accent, sticker, groupBox)
- **12 jugadores por equipo** (slot 0 es especial/dorado, slots 1-11 son jugadores)
- Códigos FIFA, banderas, confederaciones

Los colores se definieron manualmente basándose en la paleta real del álbum Panini 2026.

### Paso 5: Convertir imágenes a SVG vectorial (`conversvg.py`)

```
imagen.png  →  svg_output/pagina_05_clean.svg
```

- Usa **OpenCV + K-Means** para detectar la paleta de colores dominantes
- Convierte cada color a una capa SVG con paths vectoriales
- Genera un SVG limpio con variables CSS editables (`--color-0`, `--color-1`, etc.)
- Útil para crear fondos vectoriales escalables del álbum

### Paso 6: Convertir imagen a SVG con base64 (`lbase64.py`)

```
Gemini_Generated_Image_...png  →  assets/backgrounds/mexico-bg.svg
```

- Convierte una imagen PNG a un SVG que la contiene embebida en base64
- Útil para fondos que necesitan mantener calidad sin depender de archivos externos

### Paso 7: Recorte configurable de stickers (`main.py`)

```
cromos/pagina_35.png  →  salida/pagina_35/sticker_01.png, sticker_02.png...
```

- Versión avanzada del cutter con configuración vía **archivo `.env`**
- Soporta overrides por imagen individual
- Permite definir: columnas, filas, área útil, offset, tamaño fijo de sticker

---

## Estructura de carpetas de cromos

```
cromos_extraidos/
└── grupos/
    ├── a/
    │   ├── 1/          → México (1er equipo del grupo A)
    │   │   ├── pagina_35_cromo_01.png
    │   │   ├── pagina_35_cromo_02.png
    │   │   └── ... (hasta 12 cromos)
    │   ├── 2/          → South Africa (2do equipo)
    │   ├── 3/          → Korea Republic (3er equipo)
    │   └── 4/          → Czechia (4to equipo)
    ├── b/
    │   ├── 1/          → Canada
    │   ├── 2/          → Bosnia and Herzegovina
    │   ├── 3/          → Qatar
    │   └── 4/          → Switzerland
    ├── c/ ... l/       → Grupos C hasta L
```

**Reglas:**
- Cada grupo tiene exactamente 4 carpetas numeradas `1`, `2`, `3`, `4`
- El orden alfabético de los archivos PNG dentro de cada carpeta determina el slot (1º→slot0, 2º→slot1...)
- Array de exactamente 12 posiciones. Sin archivo = `null` (slot vacío)
- Si falta una carpeta en la secuencia, ese equipo simplemente no se carga

---

## Arquitectura del Frontend (SPA Vanilla JS)

### Stack tecnológico

| Tecnología | Uso |
|-----------|-----|
| **Vanilla JS (ES Modules)** | Lógica de la aplicación, sin frameworks |
| **Vite** | Bundler y dev server |
| **CSS Custom Properties** | Tematización dinámica por país |
| **SVG inline** | Formas de slots, fondos, decoraciones |
| **Obfuscator** | Ofuscación de código en producción |

### Flujo de renderizado

```
index.html
  └── src/main.js
        └── initApp() [src/app.js]
              └── router.resolve() [src/router.js]
                    └── CountryPage({ country, allCountryIds }) [src/components/CountryPage.js]
                          ├── AlbumBookBackground()      → Fondo de libro con capas SVG
                          ├── PageHeader()               → "WE ARE [PAÍS]" + federación
                          ├── SlotDecorBackground()      → Forma decorativa "2" detrás de slots
                          ├── SlotGrid()                 → Grid de 12 slots
                          │     └── Slot() × 12          → Cada slot con tarjetas + cromo
                          │           └── SlotCard() × 2 → Tarjeta superior (código+número) + inferior (nombre)
                          ├── GroupBox()                 → Caja del grupo con banderas
                          └── Navigation()               ← → botones de navegación
```

### Componentes principales

#### `AlbumBookBackground.js`
Fondo de libro con múltiples capas SVG/CSS:
- Páginas blancas izquierda y derecha
- Capa rosa orgánica (lado derecho)
- Verde oscuro con curva (ambos lados)
- Tira verde claro (esquina superior derecha)
- Header rojo con curva
- Línea central del lomo del libro

Todos los colores vienen de CSS variables inyectadas por el tema del país.

#### `Slot.js` + `SlotCard.js`
Cada slot es un contenedor absolutamente posicionado que contiene:
- **Tarjeta superior**: código del país (ej: "MEX") + número del slot
- **Tarjeta inferior**: nombre del jugador
- **Cromo pegado** (opcional): imagen PNG superpuesta cuando existe

Las tarjetas usan paths SVG con las formas originales del álbum (la forma del "2" para arriba, la del "6" para abajo).

#### `CountryPage.js`
Orquesta toda la página:
1. Genera el tema CSS desde los colores del país (`buildThemeFromAlbumColors`)
2. Aplica las variables CSS al `:root`
3. Renderiza todos los componentes en un DocumentFragment
4. Devuelve el fragmento envuelto en `AlbumPage`

#### `router.js`
Router hash-based simple:
- Rutas: `/#/mexico`, `/#/brazil`, etc.
- Cada país registra su ruta automáticamente
- Navegación vía `router.navigate('/brazil')`

### Sistema de temas (`themes.js`)

Cada país tiene 5 colores base en `teamsData.json`:
```json
{
  "primary": "#006B57",    // Verde oscuro del fondo
  "secondary": "#D71920",  // Rojo del header
  "accent": "#F6D98A",     // Amarillo/dorado
  "sticker": "#A8C98F",    // Verde claro de slots
  "groupBox": "#77C66B"    // Verde de la caja del grupo
}
```

`buildThemeFromAlbumColors()` genera ~30 variables CSS:
- `--book-dark-green`, `--book-red`, `--book-pink`
- `--slot-green`, `--slot-gold`
- `--title-we`, `--title-mx`
- `--decoration-color`, `--group-bg`

### Mapeo de cromos (`stickerMap.json`)

Generado automáticamente por `generate-sticker-map.cjs`:
- Escanea `cromos_extraidos/grupos/`
- Mapea cada carpeta al equipo correspondiente según `teamsData.json`
- Crea arrays de 12 posiciones con las rutas de los PNG
- `null` = slot vacío (cromo no encontrado)

El plugin `vite-plugin-sticker-map.js` vigila cambios en las carpetas de cromos y regenera el JSON automáticamente en modo desarrollo.

---

## Scripts disponibles

```bash
# Desarrollo con hot reload y auto-regeneración de stickerMap
npm run dev

# Build para producción (ofuscado + minificado)
npm run build

# Preview del build
npm run preview

# Regenerar stickerMap manualmente
node generate-sticker-map.cjs
```

---

## Archivos Python explicados

| Archivo | ¿Qué hace? | Entrada | Salida |
|---------|-----------|---------|--------|
| `sin-margen.py` | PDF → PNG sin márgenes blancos | `pdf/*.pdf` | `paginas_png_sin_margen/*.png` |
| `cutter.py` | Página PNG → 16 cromos individuales | `paginas_png_sin_margen/*.png` | `cromos_extraidos/pagina_XX/*.png` |
| `paises.py` | OCR de páginas → datos de equipos | `paginas_png_sin_margen/*.png` | `countries.grouped.json`, `countries.generated.js` |
| `conversvg.py` | Imagen → SVG vectorial con capas | `*.png` | `svg_output/*_clean.svg` |
| `lbase64.py` | Imagen → SVG con base64 embebido | `*.png` | `assets/backgrounds/*.svg` |
| `main.py` | Recorte configurable de stickers | `cromos/*.png` + `.env` | `salida/*/*.png` |
| `generate-sticker-map.cjs` | Escanea carpetas → JSON de mapeo | `cromos_extraidos/grupos/` | `src/data/stickerMap.json` |

---

## Configuración del `.env` (para main.py)

```env
# Configuración global
INPUT_DIR=cromos
OUTPUT_DIR=salida
OUTPUT_ALL_DIR=todos_juntos
COLS=4
ROWS=4

# Opcional: área útil y offset
USABLE_WIDTH=1600
USABLE_HEIGHT=2200
OFFSET_X=35
OFFSET_Y=30

# Opcional: tamaño fijo de cada sticker
STICKER_WIDTH=400
STICKER_HEIGHT=550

# Override por imagen específica
OVERRIDE_pagina_35_COLS=4
OVERRIDE_pagina_35_ROWS=4
```

---

## Notas técnicas

- **Encoding UTF-8**: Los nombres de jugadores con acentos (Malagón, Vásquez, Álvarez) se manejan correctamente tras corregir un problema de doble encoding en `teamsData.json`
- **Aspect ratio**: La página del álbum usa `aspect-ratio: 1629/907` (proporción del álbum real)
- **Posicionamiento**: Todos los slots usan posicionamiento absoluto en porcentajes dentro del contenedor
- **Lazy loading**: Las imágenes de cromos usan `loading="lazy"`
- **Ofuscación**: El build de producción ofusca el JS con `vite-plugin-javascript-obfuscator`

---

## Créditos

- Datos de equipos y jugadores extraídos del álbum Panini Mundial 2026
- Banderas vía [flagcdn.com](https://flagcdn.com)
- OCR con [EasyOCR](https://github.com/JaidedAI/EasyOCR)
- Procesamiento de imágenes con [Pillow](https://python-pillow.org) y [OpenCV](https://opencv.org)
