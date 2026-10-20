const CACHE_NAME = 'thai-reading-app-v4';
const APP_SHELL = ['./', './index.html'];
const AUDIO_CACHE_BATCH_SIZE = 8;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith('thai-reading-app-') && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const requestUrl = new URL(request.url);
    const scopeUrl = new URL(self.registration.scope);

    if (request.method !== 'GET' ||
        requestUrl.origin !== scopeUrl.origin ||
        !requestUrl.pathname.startsWith(scopeUrl.pathname)) {
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
            const response = await fetch(request);
            if (response.ok && response.type === 'basic') {
                await cache.put(request, response.clone());
            }
            return response;
        } catch (error) {
            if (request.mode === 'navigate') {
                const appShellResponse = await cache.match('./index.html');
                if (appShellResponse) return appShellResponse;
            }
            throw error;
        }
    })());
});

self.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'CACHE_AUDIO_FILES' || !Array.isArray(event.data.urls)) return;

    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const scopeUrl = new URL(self.registration.scope);
        const audioPath = new URL('audio/', scopeUrl).pathname;
        const urls = event.data.urls.filter(candidate => {
            if (typeof candidate !== 'string') return false;
            const url = new URL(candidate, scopeUrl);
            return url.origin === scopeUrl.origin && url.pathname.startsWith(audioPath);
        });

        for (let index = 0; index < urls.length; index += AUDIO_CACHE_BATCH_SIZE) {
            const batch = urls.slice(index, index + AUDIO_CACHE_BATCH_SIZE);
            await Promise.all(batch.map(async candidate => {
                const url = new URL(candidate, scopeUrl);
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`Audio cache skipped (${response.status}): ${url.pathname}`);
                        return;
                    }
                    await cache.put(url, response);
                } catch (error) {
                    console.warn(`Audio cache failed: ${url.pathname}`, error);
                }
            }));
        }
    })());
});
