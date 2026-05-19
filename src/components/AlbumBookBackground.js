/**
 * Fondo de libro con capas estilo album Panini 2026.
 * Basado en preview(3).html - adaptado al contenedor album-page.
 * Usa CSS custom properties para tematizacion por pais.
 */
export function AlbumBookBackground() {
  const container = document.createElement('div');
  container.className = 'album-book-bg';
  container.setAttribute('aria-hidden', 'true');

  container.innerHTML = `
    <!-- Paginas blancas izquierda y derecha -->
    <div class="book-page-left"></div>
    <div class="book-page-right"></div>

    <!-- Capa rosa derecha (debajo del header) -->
    <div class="book-pink-layer"></div>

    <!-- Capa rosa orgánica debajo de slots izquierdos 
    <div class="book-pink-left">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 0 45 C 20 20, 50 10, 80 18 C 92 22, 100 32, 100 48 L 100 100 L 0 100 Z" fill="var(--book-pink, #f0b7aa)" />
      </svg>
    </div> -->

    <!-- Verde oscuro izquierdo con curva -->
    <div class="book-dark-green-left">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 0 100 C 6 42, 48 0, 100 0 L 100 100 Z" fill="var(--book-dark-green, #064c2f)" />
      </svg>
    </div>

    <!-- Verde oscuro derecho con curva -->
    <div class="book-dark-green-right">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 0 0 C 52 0, 94 42, 100 100 L 0 100 Z" fill="var(--book-dark-green, #064c2f)" />
      </svg>
    </div>

    <!-- Tira verde claro arriba derecha -->
    <div class="book-green-strip"></div>

    <!-- Capa roja header con curva -->
    <div class="book-red-header">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="
          M 0 0
          H 97
          Q 99 35, 100 100
          H 34
          C 10 100, 0 58, 0 0
          Z
        " fill="var(--book-red, #e30613)" />
      </svg>
    </div>

    <!-- Linea central del libro -->
    <div class="book-spine"></div>
  `;

  return container;
}
