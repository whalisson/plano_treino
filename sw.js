// Gorila Gym — Service Worker v28
// Bump CACHE só quando precisar forçar limpeza total (mudança estrutural).
// Para deploys normais, stale-while-revalidate atualiza os assets automaticamente.
const CACHE = 'gorila-gym-v28';
const ASSETS = [
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/state.js',
  './js/constants.js',
  './js/periodizacao.js',
  './js/logbook.js',
  './js/rm.js',
  './js/cardio.js',
  './js/rpe.js',
  './js/workoutlog.js',
  './js/fadiga.js',
  './js/volume.js',
  './js/pico.js',
  './js/anilhas.js',
  './js/feeder.js',
  './js/firebase.js',
  './js/firebase-config.js',
  './js/app.js',
  './manifest.json',
  './img/icon.svg',
  './img/supino_cyber.png',
  './img/agacha_cyber.png',
  './img/terra_cyber.png',
  './img/any_cyber.png',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // Ignora requisições não-GET (Firebase Auth usa POST) e URLs externas
  // que não sejam os CDNs conhecidos — nunca tentar cachear essas
  var isExternal = !url.startsWith(self.location.origin);
  var isCDN      = url.includes('fonts.googleapis') || url.includes('cdnjs.cloudflare');
  var isFirebase = url.includes('firestore.googleapis') || url.includes('firebase') ||
                   url.includes('identitytoolkit') || url.includes('securetoken');

  if (isFirebase) return; // deixa o Firebase passar sem interferência

  if (isCDN) {
    // Network first para fontes e Chart.js
    e.respondWith(
      fetch(e.request).then(function(r){
        var clone = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return r;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
  } else if (!isExternal && e.request.method === 'GET') {
    // Stale-while-revalidate: serve do cache imediatamente + atualiza em background.
    // Garante carregamento rápido e assets sempre atualizados no próximo acesso.
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var networkFetch = fetch(e.request).then(function(response) {
            if (response && response.ok) {
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(function() {
            return cached;
          });
          return cached || networkFetch;
        });
      })
    );
  }
});
