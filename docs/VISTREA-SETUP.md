# VISTREA — Activar precios de Paramount+ desde Google Sheets

## ¿Qué hace esto?

El modal de Paramount+ en el álbum tiene un tab **"📺 Contratar"** donde los usuarios
ven dos opciones:

1. **Pagar directamente en Paramount+** — con tarjeta internacional desde su web oficial.
2. **Pagar con Vistrea en bolívares** — Vistrea gestiona la suscripción y la persona paga en moneda local, sin tarjeta internacional.

Los precios de la opción 2 (Bs y USD) se gestionan desde un Google Sheet.
Cuando cambias un precio en el sheet, la app lo refleja automáticamente.

---

## Paso 1 — Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea un nuevo archivo.
2. Renombra la primera hoja (pestaña inferior) como exactamente: **`Precios`**
3. Escribe los encabezados en la fila 1 y llena los datos a partir de la fila 2:

| A — Plan | B — USD | C — Bs | D — Descripcion | E — Activo |
|----------|---------|--------|-----------------|------------|
| Esencial | 7.99 | 38 | 1 pantalla · Full HD · Sin descargas | TRUE |
| Showtime | 12.99 | 62 | 3 pantallas · 4K · Con descargas | TRUE |

> **Notas:**
> - La columna **Activo** acepta `TRUE` o `FALSE`. Con `FALSE` el plan se oculta sin borrarlo.
> - Puedes agregar más filas para más planes.
> - El nombre de las columnas debe estar en minúsculas tal como están arriba (el script las normaliza).

---

## Paso 2 — Publicar el Apps Script

1. Dentro del Google Sheet: **Extensiones → Apps Script**
2. Borra todo el código que aparece por defecto.
3. Copia y pega el contenido de este archivo:
   ```
   scripts/apps-script/paramount-prices-apps-script.js
   ```
4. Guarda con **Ctrl + S** (o el ícono de disco).
5. Haz clic en **"Implementar"** → **"Nueva implementación"**
6. Configura así:
   - **Tipo:** Aplicación web
   - **Ejecutar como:** Yo (tu cuenta de Google)
   - **Quién puede acceder:** Cualquier usuario (anónimo)
7. Haz clic en **"Implementar"** y acepta los permisos que pide.
8. Copia la **URL de la aplicación web** que aparece al final.
   Se ve así: `https://script.google.com/macros/s/XXXXXXXXXX/exec`

---

## Paso 3 — Conectar la URL al álbum

1. Abre el archivo: `src/components/ParamountPage.js`
2. Busca la línea que dice:
   ```js
   const PRICES_ENDPOINT = '';
   ```
3. Reemplázala pegando tu URL entre las comillas:
   ```js
   const PRICES_ENDPOINT = 'https://script.google.com/macros/s/XXXXXXXXXX/exec';
   ```
4. Guarda el archivo y haz `npm run build` para publicar.

---

## Cómo actualizar precios

Solo edita las celdas **USD** o **Bs** en el Google Sheet y guarda.
**No hace falta redesplegar el script ni tocar el código.**
La app consulta los precios cada vez que el usuario abre el tab "Contratar".

---

## Cómo agregar o quitar un plan

- **Agregar:** Agrega una nueva fila con los datos y pon `TRUE` en Activo.
- **Quitar temporalmente:** Cambia el valor de Activo a `FALSE`.
- **Quitar permanentemente:** Borra la fila.

---

## Resolución de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| Se muestran precios genéricos (Esencial $7.99) | `PRICES_ENDPOINT` vacío o URL incorrecta | Revisa el Paso 3 |
| Precios desactualizados | El script no fue republicado después de cambios en el código | Solo cambia celdas del sheet, no el script |
| Error de permisos | La implementación no es pública | Reimplementar con "Cualquier usuario" |
| El tab "Contratar" no aparece | Build desactualizado | `npm run build` y subir al servidor |
