export function onDOMReady(callback, doc = document) {
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}
