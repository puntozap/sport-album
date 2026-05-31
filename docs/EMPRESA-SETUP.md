# Cómo configurar un álbum empresarial

## Estructura de carpetas

```
public/
  empresas/
    {slug}/               ← nombre corto sin espacios, ej: "isacell"
      config.json         ← branding: logo, colores, nombre
      albumData.json      ← grupos, entidades, nombres de cromos
      logo.png            ← logo de la empresa
      cromos/
        {entity-id}/      ← debe coincidir exactamente con el "id" del albumData.json
          00.png          ← holograma (cromo especial, slot 0)
          01.png
          02.png
          ...
          12.png          ← último cromo (si stickerCount es 13)
```

---

## Paso 1 — Crear la carpeta de la empresa

Copia la carpeta `public/empresas/_ejemplo/` y renómbrala con el slug de la empresa:

```
public/empresas/isacell/
```

---

## Paso 2 — Editar `config.json`

Personaliza el branding (logo, color primario, nombre):

```json
{
  "name": "Isacell",
  "tagline": "Tecnología a tu alcance",
  "primaryColor": "#1a56db"
}
```

El campo `primaryColor` afecta toda la paleta visual del álbum.  
Coloca `logo.png` en la misma carpeta si quieres que aparezca en el álbum.

---

## Paso 3 — Crear `albumData.json`

Define los grupos y entidades. Copia `public/empresas/_ejemplo/albumData.json` como base.

Campos importantes:

| Campo | Descripción |
|-------|-------------|
| `stickerCount` | Total de cromos por entidad (13 = 1 holograma + 12 normales) |
| `groups[].letter` | Letra del grupo: "A", "B", "C"… |
| `entities[].id` | **Debe coincidir con el nombre de la carpeta en `cromos/`** |
| `entities[].code` | Código de 3 letras que aparece en la navegación |
| `stickers[].slot` | Número de slot (0 = holograma, 1–12 = normales) |

---

## Paso 4 — Agregar las imágenes de cromos

Crea subcarpetas dentro de `cromos/` con el **id exacto** de cada entidad:

```
public/empresas/isacell/cromos/
  ventas-norte/
    00.png    ← holograma del área (logo, escudo, foto grupal)
    01.png    ← persona 1
    02.png    ← persona 2
    ...
    12.png
  ventas-sur/
    00.png
    01.png
    ...
```

### Requisitos de imágenes

- **Formato:** PNG (preferido) o JPG
- **Nombres:** `00.png`, `01.png`, … `14.png` (siempre dos dígitos, default 15 slots)
- **Proporción recomendada:** 3:4 (portrait), ej. 300×400 px
- Si falta una imagen, el slot aparece vacío hasta que se "pegue" el cromo

---

## Paso 5 — Acceder al álbum

La URL sigue el patrón:

```
http://localhost/{slug}/{entity-id}
```

Ejemplos:
```
http://localhost/isacell/ventas-norte
http://localhost/isacell/logistica
```

La raíz `http://localhost/isacell/` redirige automáticamente a la primera entidad.

---

## Notas importantes

- El `id` de cada entidad en `albumData.json` debe ser **idéntico** al nombre de su carpeta en `cromos/` (minúsculas, sin espacios, usar guiones).
- El `code` es solo para mostrar en la navegación superior — máximo 3–4 caracteres.
- Si una entidad no tiene imágenes, los slots aparecen en blanco (el usuario los "consigue" abriendo sobres).
- El álbum FIFA sigue funcionando en `/` sin cambios.

---

## Agregar una empresa nueva

1. Crear carpeta `public/empresas/{nuevo-slug}/`
2. Poner `config.json`, `albumData.json`, `logo.png`
3. Crear `cromos/{entity-id}/` con las imágenes
4. Acceder en `/{nuevo-slug}/{primera-entidad}`

No hay que tocar código — solo archivos de configuración e imágenes.
