// Register service worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('service-worker.js')
        .then(() => console.log('ServiceWorker registration successful'))
        .catch((err) => console.log('ServiceWorker registration failed: ', err));
    });
  }
}

export { registerServiceWorker };

