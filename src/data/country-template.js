/**
 * PLANTILLA PARA AGREGAR UN NUEVO PAÍS
 *
 * 1. Copia este objeto y pégalo en countries.js dentro del array `countries`.
 * 2. Reemplaza los valores según el país.
 * 3. Copia el fondo PNG correspondiente a public/assets/backgrounds/ como pagina_XX.png.
 * 4. Agrega el tema en themes.js si los colores difieren de los default.
 */

export const countryTemplate = {
  id: 'argentina',           // ID único (usado en la URL: #/argentina)
  code: 'ARG',               // Código FIFA de 3 letras
  name: 'Argentina',         // Nombre del país
  pageIndex: 3,              // Número de página en el álbum (para fondo y cromos)
  theme: 'default',          // Referencia a tema en themes.js
  layout: 'standard',        // 'standard' | 'special'

  slots: [
    // Slot 0 = escudo (usualmente gold)
    { number: 0, name: '\u00A0', type: 'gold', pos: { left: '5.89%', top: '38.37%' } },
    // Slots 1-11 = jugadores
    { number: 1, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '19.58%', top: '38.37%' } },
    { number: 2, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '33.40%', top: '38.37%' } },
    { number: 3, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '19.58%', top: '70.89%' } },
    { number: 4, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '33.40%', top: '70.89%' } },
    { number: 5, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '55.49%', top: '6.06%' } },
    { number: 6, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '69.43%', top: '6.06%' } },
    { number: 7, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '83.12%', top: '6.06%' } },
    { number: 8, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '55.49%', top: '38.37%' } },
    { number: 9, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '69.43%', top: '38.37%' } },
    { number: 10, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '83.12%', top: '38.37%' } },
    { number: 11, name: 'Nombre<br>Apellido', type: 'normal', pos: { left: '83.12%', top: '70.89%' } }
  ],

  federation: {
    name: 'Asociación del Fútbol<br>Argentino',
    flag: 'ar'                // Código de flagcdn.com
  },

  group: {
    name: 'GROUP B',
    countries: [
      { code: 'ARG', flag: 'ar', name: 'Argentina' },
      { code: 'BRA', flag: 'br', name: 'Brasil' },
      { code: 'FRA', flag: 'fr', name: 'Francia' },
      { code: 'GER', flag: 'de', name: 'Alemania' }
    ]
  }
};
