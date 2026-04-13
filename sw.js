// Gorila Gym — Service Worker v1
const CACHE = 'gorila-gym-v1';
const ASSETS = [
  './index.html',
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
  // Network first for Google Fonts and CDN, cache first for everything else
  var url = e.request.url;
  if(url.includes('fonts.googleapis') || url.includes('cdnjs.cloudflare')){
    e.respondWith(
      fetch(e.request).then(function(r){
        var clone = r.clone();
        caches.open(CACHE).then(function(c){c.put(e.request, clone);});
        return r;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(r){
        return r || fetch(e.request).then(function(fr){
          var clone = fr.clone();
          caches.open(CACHE).then(function(c){c.put(e.request, clone);});
          return fr;
        });
      })
    );
  }
});
