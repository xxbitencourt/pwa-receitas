// Importando funções e classes necessárias da biblioteca Workbox
import { offlineFallback, warmStrategyCache } from 'workbox-recipes';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Configurando o cache para a página principal do site
const pageCache = new CacheFirst({
  cacheName: 'pwareceitas',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    // Plugin que define um tempo de expiração para as páginas em cache
    new ExpirationPlugin({
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias em segundos
    }),
  ],
});

// Registrando uma rota para cache de assets (arquivos de estilo, scripts e workers)
// StaleWhileRevalidate, onde o cache é servido imediatamente e a requisição é feita em segundo plano
registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination), // Verifica se a requisição é para estilo, script ou worker
  new StaleWhileRevalidate({
    cacheName: 'asset-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

offlineFallback({
  pageFallback: '/offline.html', 
});

// Registrando uma rota para imagens para garantir que as imagens sejam carregadas do cache primeiro
registerRoute(
  ({ request }) => request.destination === 'image', // Verifica se a requisição é para uma imagem
  new CacheFirst({
    cacheName: 'images', 
    plugins: [
      // Define a expiração das imagens no cache e o limite de armazenamento
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30,
        maxEntries: 50, // Limita a quantidade de imagens armazenadas a 50
      }),
    ],
  })
);

// Registrando uma rota para as receitas, StaleWhileRevalidate para cache com atualização em segundo plano
registerRoute(
  ({ request }) => request.url.includes('/receitas'),
  new StaleWhileRevalidate({
    cacheName: 'receitas-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);