/**
 * Service Worker：让页面在通过 http/https 打开时可以离线使用。
 *
 * 说明：
 * - file:// 协议下浏览器不允许注册 Service Worker，index.html 里已做协议判断。
 * - 修改缓存内容时，把 CACHE 的版本号加一即可让旧缓存失效。
 */

const CACHE = 'quit-smoking-v3';
const CORE = ['./index.html', './styles.css', './manifest.webmanifest', './icon.svg'];

// 安装：预先缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

// 激活：清掉旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 页面导航：网络优先，断网时回退到缓存，保证离线也能打开
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 其它资源（含 Tailwind CDN）：先用缓存，同时在后台更新
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
