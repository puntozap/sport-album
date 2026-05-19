# Documentación técnica — Álbum Panini FIFA 2026

## Índice
1. [Estructura general](#estructura-general)
2. [Navegación móvil: pan + pinch-to-zoom](#navegación-móvil-pan--pinch-to-zoom)
3. [Navegación desktop: drag con efecto 3D](#navegación-desktop-drag-con-efecto-3d)
4. [Por qué se descartó el scroll nativo](#por-qué-se-descartó-el-scroll-nativo)
5. [La trampa de scale.js](#la-trampa-de-scalejs)
6. [Archivos clave y su responsabilidad](#archivos-clave-y-su-responsabilidad)

---

## Estructura general

El álbum es una página de **1629 × 907 px** (ratio ~1.796:1, landscape). El usuario navega entre países/equipos.

```
<body>
  <div id="app">
    <main class="album-shell">       ← elemento que se transforma
      <section class="album-page">  ← contenido del álbum
        ...cromos, fondos, etc.
      </section>
    </main>
  </div>
</body>
```

---

## Navegación móvil: pan + pinch-to-zoom

### El problema de pantalla estrecha

En un móvil vertical (ej. 390 × 844 px), el álbum landscape no cabe en la pantalla. La solución adoptada es renderizar el álbum a **tamaño completo** (más ancho que la pantalla) y permitir al usuario **explorar con el pulgar**, igual que se navega un mapa.

### CSS: tamaño del álbum en móvil

```css
/* src/styles/album-page.css */
@media (max-width: 1100px) {
  .album-shell {
    width: calc(100dvh * (1629 / 907)); /* Ej: 844px × 1.796 ≈ 1515px */
    min-width: auto;
    max-width: none;
    transform-origin: 0 0;  /* el JS aplica translate/scale desde la esquina superior-izquierda */
    touch-action: none;     /* el JS gestiona TODOS los eventos táctiles, no el browser */
  }
}

/* src/styles/main.css */
@media (max-width: 1100px) {
  #app {
    overflow: hidden;   /* oculta el desbordamiento del álbum */
    width: 100vw;
    height: 100dvh;
  }
}
```

Con esto, el álbum mide ~1515px de ancho pero el viewport solo muestra 390px. El resto queda oculto. El JS lo mueve usando `transform`.

### JS: sistema de pan + pinch-to-zoom

**Archivo:** `src/components/PageSwipe.js`

#### Estado del sistema

```js
let mobPanX = 0;    // desplazamiento horizontal actual (en px)
let mobPanY = 0;    // desplazamiento vertical actual (en px)
let mobScale = 1.0; // zoom actual (1.0 = tamaño natural)
const mobMinScale = 1.0;  // no se puede alejar más del tamaño que llena la pantalla
const MOB_MAX_SCALE = 3.0;
```

#### Aplicar la transformación

```js
shell.style.transform = `translate(${mobPanX}px, ${mobPanY}px) scale(${mobScale})`;
// transform-origin: 0 0  → todo se calcula desde la esquina superior-izquierda del álbum
```

Con `transform-origin: 0 0`, la esquina superior-izquierda del álbum aparece exactamente en la coordenada `(mobPanX, mobPanY)` de la pantalla.

#### Límites del pan (clamping)

El álbum no puede salirse de la pantalla: sus bordes no pueden dejar espacio vacío.

```js
function clampMobPan(x, y, scale) {
  const { w, h } = getMobNaturalSize(); // offsetWidth/Height del elemento CSS
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const displayW = w * scale;  // tamaño visual real con zoom
  const displayH = h * scale;

  // Horizontal: si el álbum es más ancho que la pantalla, panX ∈ [vw - displayW, 0]
  //   panX = 0        → borde izquierdo del álbum en el borde izquierdo de pantalla
  //   panX = vw-displayW → borde derecho del álbum en el borde derecho de pantalla
  const cx = displayW >= vw
    ? Math.min(0, Math.max(vw - displayW, x))
    : (vw - displayW) / 2; // si cabe entero, se centra

  const cy = displayH >= vh
    ? Math.min(0, Math.max(vh - displayH, y))
    : (vh - displayH) / 2;

  return { x: cx, y: cy };
}
```

**Ejemplo numérico** en un móvil 390 × 844 px, scale=1:
- Álbum: 1515 × 844 px
- Rango panX: `[390 - 1515, 0]` = `[-1125, 0]`
- `panX = 0`: se ve el lado IZQUIERDO del álbum
- `panX = -1125`: se ve el lado DERECHO del álbum

#### Un dedo → pan

```js
function onMobTouchMove(e) {
  e.preventDefault(); // evita scroll/zoom nativo del browser

  if (count === 1 && !isPinching) {
    // Desplazamiento del dedo desde el inicio del gesto
    const dx = touch.x - singleStartX;
    const dy = touch.y - singleStartY;

    // Nueva posición = posición base + movimiento del dedo
    const clamped = clampMobPan(panBaseX + dx, panBaseY + dy, mobScale);
    mobPanX = clamped.x;
    mobPanY = clamped.y;
    applyMobTransform();
  }
}
```

#### Dos dedos → pinch-to-zoom

El objetivo es que el punto del álbum bajo el centro del pinch **quede fijo** mientras la escala cambia.

```
Situación inicial del pinch:
  - Escala: pinchStartScale
  - Centro del pinch en pantalla: (pinchStartMidX, pinchStartMidY)
  - Pan en ese momento: (pinchBasePanX, pinchBasePanY)

El punto del álbum bajo el centro del pinch (en coordenadas CSS del álbum):
  albumOrigX = (pinchStartMidX - pinchBasePanX) / pinchStartScale
  albumOrigY = (pinchStartMidY - pinchBasePanY) / pinchStartScale

Al cambiar la escala a newScale, para que ese punto siga en la misma posición de pantalla:
  newPanX = currentMidX - albumOrigX * newScale
  newPanY = currentMidY - albumOrigY * newScale
```

El `currentMid` puede moverse también (el usuario mueve las dos manos), lo que hace que el pan de dos dedos también funcione naturalmente.

```js
} else if (count >= 2) {
  const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  const midX = (pts[0].x + pts[1].x) / 2;
  const midY = (pts[0].y + pts[1].y) / 2;

  const newScale = Math.max(mobMinScale, Math.min(MOB_MAX_SCALE,
    pinchStartScale * (dist / pinchStartDist)
  ));

  const albumOrigX = (pinchStartMidX - pinchBasePanX) / pinchStartScale;
  const albumOrigY = (pinchStartMidY - pinchBasePanY) / pinchStartScale;

  const clamped = clampMobPan(
    midX - albumOrigX * newScale,
    midY - albumOrigY * newScale,
    newScale
  );
  mobPanX = clamped.x;
  mobPanY = clamped.y;
  mobScale = newScale;
  applyMobTransform();
}
```

#### Swipe vertical → cambiar de país

Se detecta en `touchend`, comparando posición inicial vs final del gesto:

```js
const dx = t.clientX - singleStartX;
const dy = t.clientY - singleStartY;
const dt = Date.now() - singleStartTime;

const esRapido   = dt < 400;                              // menos de 400ms
const esVertical = Math.abs(dy) >= 60                     // al menos 60px
               && Math.abs(dy) / Math.max(Math.abs(dx), 1) >= 1.8; // ratio Y/X > 1.8

if (esRapido && esVertical) {
  if (dy > 0) goPrev(); // dedo hacia abajo → país anterior
  else        goNext(); // dedo hacia arriba → país siguiente
}
```

El swipe vertical **no requiere interceptar `touchmove`** para detectarse — solo se compara inicio vs fin del gesto. Esto permite que el pan horizontal funcione libremente durante el gesto.

Al cambiar de país, el pan se resetea a la posición inicial (`panX=0`, izquierda del álbum):

```js
function update(newCurrentId) {
  currentId = newCurrentId;
  currentIndex = allIds.indexOf(currentId);
  if (isMobile()) initMobPanZoom(); // reset pan
}
```

#### Manejo de multi-touch (de 2 dedos a 1)

Cuando el usuario levanta un dedo durante el pinch y queda uno solo, se resetea el "baseline" del pan para que el dedo restante continúe moviendo el álbum sin salto:

```js
if (remaining === 1) {
  isPinching = false;
  // El dedo que queda se convierte en el nuevo origen del pan
  singleStartX = touch.x;
  singleStartY = touch.y;
  panBaseX = mobPanX;
  panBaseY = mobPanY;
}
```

---

## Navegación desktop: drag con efecto 3D

En escritorio (>1100px), el álbum cabe en la pantalla. El usuario arrastra horizontalmente para cambiar de país. Hay un efecto visual 3D mientras arrastra:

```js
function applyDragTransform(delta) {
  const rotateY = (delta / window.innerWidth) * 8;   // hasta 8° de rotación
  const scale = 1 - Math.abs(delta) / window.innerWidth * 0.05; // ligera reducción
  container.style.transform =
    `translateX(${delta * 0.5}px) rotateY(${rotateY}deg) scale(${scale})`;
}
```

Si el desplazamiento supera el umbral (60px), se navega al país anterior/siguiente. Si no, se hace `snapBack()` (animación de vuelta a la posición original).

---

## Por qué se descartó el scroll nativo

El primer enfoque en móvil fue usar el scroll horizontal nativo del browser:

```css
#app { overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

```js
// Solo detectar touchstart y touchend, dejar que el browser maneje el scroll
document.addEventListener('touchstart', ..., { passive: true });
document.addEventListener('touchend', ..., { passive: true }); // NO touchmove
```

**Por qué no funcionó:** El ancho del `.album-shell` terminaba siendo igual al viewport (`min(100%, ...)` = 100%), sin desbordamiento, por lo que no había nada que desplazar horizontalmente.

**Por qué tampoco funcionaba si se hubiera forzado el ancho:** El scroll nativo no permite pinch-to-zoom controlado, ni detectar swipe vertical con facilidad, ni animar transiciones de país mientras se hace scroll.

---

## La trampa de scale.js

**`src/utils/scale.js`** era el archivo que rompía el sistema de pan+zoom. Se ejecuta justo después de `PageSwipe.js` y hacía:

```js
// Establecía inline styles que sobreescriben el CSS
shell.style.width = `${width}px`;
shell.style.height = `${height}px`;

// Reactivaba el scroll nativo (anulaba nuestro overflow: hidden del CSS)
app.style.overflowX = 'scroll';

// CENTRABA el scroll al medio del álbum
const scrollTarget = (width - vw) / 2; // ≈ 562px
app.scrollLeft = scrollTarget;
```

El efecto del `scrollLeft = 562` era que el viewport mostraba el **centro del álbum**. Nuestro `panX = 0` no movía el álbum respecto al viewport sino respecto a su posición CSS (x=0), que con el scroll ya apuntaba al centro. Para que el borde izquierdo del álbum se viera en pantalla habría que haber usado `panX = +562`, pero el clamping lo limitaba a máximo 0.

**Síntoma:** podías moverte hacia la derecha (panX negativo) pero nunca veías el lado izquierdo completo del álbum.

**Solución:** `scale.js` en móvil ahora no hace nada. El CSS y `PageSwipe.js` controlan todo.

---

## Archivos clave y su responsabilidad

| Archivo | Responsabilidad |
|---|---|
| `src/components/PageSwipe.js` | Pan + pinch-to-zoom (móvil) y drag 3D (desktop). Detecta swipe vertical para cambiar de país. |
| `src/styles/album-page.css` | Define el tamaño del álbum. En móvil: `width = 100dvh × 1.796`, `transform-origin: 0 0`, `touch-action: none`. |
| `src/styles/main.css` | En móvil: `#app { overflow: hidden; height: 100dvh }`. Oculta el desbordamiento del álbum. |
| `src/styles/swipe.css` | Estilos del overlay de navegación y tutorial. En móvil desactiva el 3D (`perspective: none`, `transform-style: flat`). |
| `src/utils/scale.js` | Solo actúa en desktop (>1100px) para limpiar inline styles residuales. En móvil no hace nada. |
| `src/components/CountryPage.js` | Renderiza la página de un país (álbum, cromos, etc.). |
| `src/router.js` | Gestiona la navegación por hash (`#/mexico`, `#/brazil`, etc.). |

---

## Flujo de eventos en móvil

```
touchstart  → guardar posición inicial, baseline del pan, inicio del pinch
              [passive: true — no necesita preventDefault]

touchmove   → actualizar pan (1 dedo) o escala+pan (2 dedos)
              e.preventDefault() — IMPRESCINDIBLE para bloquear scroll/zoom del browser
              [passive: false — requerido para poder llamar preventDefault]

touchend    → detectar swipe vertical → cambiar país
              detectar escala menor al mínimo → snap de vuelta
              resetear baseline si pasa de 2 dedos a 1
              [passive: true]
```

La razón por la que `touchmove` debe ser `{ passive: false }` es que los browsers modernos marcan los listeners como pasivos por defecto para mejorar el rendimiento del scroll. Si el listener es pasivo, `preventDefault()` es ignorado y el browser hace scroll de todos modos.
