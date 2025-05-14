const CACHE_NAME = "mRegister-cache-v14";
const CACHE_FILES = [
  "/",
  "/PWA/manifest.json",
  "/PWA/index.html",
  "/PWA/register-client.html",
  "/PWA/tb-screen.html",
  "/PWA/styles.css",
  "/PWA/app.css",
  "/PWA/icon-192.png",
  "/PWA/lhc-forms.js",
  "/PWA/lformsFHIR.min.js",
  "/PWA/modules/fhirFormCommon.js",
  "/PWA/modules/fhirFormWeb.js",
  "/PWA/questionnaires/questionnaire-client-reg-schema.json",
  "/PWA/questionnaires/questionnaire1-schema.json",
  "/PWA/questionnaires/questionnaire2-schema.json"
];

self.addEventListener('install', (event) => {
  self.skipWaiting();  // Activate immediately after install
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Check for valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone and store in cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return response;
        });
    }).catch((error) => {
      console.error('Fetch failed:', error);
      return new Response("Offline and resource not cached", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "text/plain" }
      });
    })
  );
});
