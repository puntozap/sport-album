/**
 * Helper para crear elementos DOM de forma declarativa.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {(Node|string)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  children.forEach(child => {
    if (child instanceof Node) {
      element.appendChild(child);
    } else if (child != null) {
      element.appendChild(document.createTextNode(String(child)));
    }
  });
  return element;
}

/**
 * Limpia el contenido de un elemento.
 * @param {HTMLElement} element
 */
export function empty(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
