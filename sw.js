// เปิดแอปได้ตอนไม่มีสัญญาณ: โหลดจากเน็ตก่อน ถ้าไม่ได้ใช้ของที่เก็บไว้ (เฉพาะไฟล์ของแอปเอง ไม่แตะ Google Sheet)
const C = 'soc-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png'];

addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => skipWaiting())));
addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => clients.claim())));
addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
