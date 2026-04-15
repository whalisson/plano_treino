// Gorila Gym — Service Worker v8
const CACHE = 'gorila-gym-v11';
const ASSETS = [
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/state.js',
  './js/periodizacao.js',
  './js/logbook.js',
  './js/rm.js',
  './js/cardio.js',
  './js/rpe.js',
  './js/app.js',
  './manifest.json',
  './img/icon.svg',
  './img/supino-met.png',
  './img/agacha-met.png',
  './img/terra-met.png',
  './img/supino-ps.png',
  './img/agacha-ps.png',
  './img/terra-ps.png',
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
    // Cache first apenas para assets do próprio app (GET)
    e.respondWith(
      caches.match(e.request).then(function(r){
        return r || fetch(e.request).then(function(fr){
          var clone = fr.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
          return fr;
        });
      })
    );
  }
});
