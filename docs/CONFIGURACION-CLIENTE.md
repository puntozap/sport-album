# Guía de Configuración para Empresas
## Álbum Digital FIFA World Cup 2026

---

## 1. Archivo de configuración

Todo se controla desde un solo archivo:

```
src/config/client.js
```

Abre ese archivo y edita los valores según el cliente.

---

## 2. Opciones disponibles

```js
const _config = {

  // ── ACTIVAR / DESACTIVAR BRANDING ─────────────────────────────
  active: true,        // true = branding encendido | false = álbum limpio sin marca


  // ── DATOS DE LA EMPRESA ───────────────────────────────────────
  name:    'Papelería López',          // Nombre de la empresa
  tagline: 'Especialistas en calendarios', // Frase corta (aparece en algunos lugares)


  // ── LOGO ──────────────────────────────────────────────────────
  // 1. Copia el logo en:  public/assets/client/
  // 2. Actualiza la ruta aquí abajo
  // Si dejas null → se muestra el nombre como texto en su lugar
  logoUrl: '/assets/client/logo-empresa.png',


  // ── COLOR PRINCIPAL DE LA MARCA ───────────────────────────────
  // Usado como acento en badges, stamps y glows
  primaryColor: '#1a56db',


  // ── CONTACTO (opcional) ───────────────────────────────────────
  whatsapp: null,   // Número completo con código de país. Ej: '584241234567'
  website:  null,   // URL del sitio web. Ej: 'https://miempresa.com'


  // ── TAMAÑO DEL STAMP EN EL CROMO EXPANDIDO ───────────────────
  stamp: {
    logoHeight:   26,        // Alto del logo en px. Más alto = más grande
    padding:      '6px 12px', // Espaciado interno del badge
    borderRadius: '10px',    // Redondez de las esquinas
    offsetBottom: -20,       // Qué tanto sale por abajo del cromo (más negativo = más afuera)
    offsetRight:  -14,       // Qué tanto sale por la derecha del cromo (más negativo = más afuera)
    rotate:       -6,        // Grados de inclinación (-6 = leve diagonal)
  },

};
```

---

## 3. Dónde aparece el logo

| Lugar | Descripción |
|-------|-------------|
| **Loading splash** | Pantalla que aparece al navegar entre países. Logo debajo del trofeo. |
| **Páginas del álbum** | Badge pequeño en esquina inferior derecha de cada página. |
| **Telón de país** | Pantalla "WE ARE [PAÍS]" — sección "Presentado por" al pie. |
| **Cromo expandido** | Stamp que sale diagonalmente de la esquina inferior derecha del cromo. |
| **Simulador** | Logo grande difuminado de fondo en la pantalla de bracket. |
| **Modal Info** | Logo del cliente al inicio del popup de información. |

---

## 4. Cómo preparar el logo

**Formato recomendado:** PNG con fondo transparente  
**Tamaño sugerido:** 300×100 px (horizontal) o 200×200 px (si es cuadrado)  
**Nombre del archivo:** sin espacios ni caracteres especiales  
  - ✅ `logo-lopez.png`  
  - ✅ `papeleria_logo.png`  
  - ❌ `Logo Papelería López (final).png`

**Dónde guardarlo:**
```
public/assets/client/logo-lopez.png
```

**Luego en client.js:**
```js
logoUrl: '/assets/client/logo-lopez.png',
```

---

## 5. Toggle de demostración (sin tocar código)

Puedes mostrar el álbum con y sin branding cambiando solo la URL:

| URL | Resultado |
|-----|-----------|
| `https://tudominio.com` | Con branding del cliente |
| `https://tudominio.com?brand=off` | Álbum limpio, sin logo |
| `https://tudominio.com?brand=on` | Fuerza el branding (útil para preview) |

Ideal para demos de ventas: le mandas dos links al prospecto.

---

## 6. Cambiar de cliente

Para adaptar el álbum a una empresa diferente:

1. Copia el logo nuevo en `public/assets/client/`
2. Edita `src/config/client.js` con los datos del nuevo cliente
3. Ejecuta el build: `npm run build`
4. Sube el resultado de la carpeta `dist/` al hosting

Tiempo estimado de personalización: **5–10 minutos por cliente**

---

## 7. Colores comunes de referencia

| Color | Hex |
|-------|-----|
| Azul corporativo | `#1a56db` |
| Verde | `#16a34a` |
| Rojo | `#dc2626` |
| Negro | `#111111` |
| Dorado | `#d4af37` |
| Naranja | `#ea580c` |

---

*Desarrollado por PuntoZap — contacto: wa.me/584247647893*
