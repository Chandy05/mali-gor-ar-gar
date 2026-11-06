// sw.js - โหมดออนไลน์ดึงไฟล์ใหม่เสมอ (Network First) และล้างแคชหน้าเก่าทิ้งอัตโนมัติ
const CACHE_NAME = 'smart-town-v6.2';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // บังคับใช้ Service Worker ตัวใหม่ทันทีโดยไม่ต้องรอปิดเบราว์เซอร์
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // ลบแคชหน้า index.html เก่าทิ้งทั้งหมด
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ดึงไฟล์ใหม่จากอินเทอร์เน็ตก่อนเสมอ หากไม่มีเน็ตค่อยดึงจากแคช
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
