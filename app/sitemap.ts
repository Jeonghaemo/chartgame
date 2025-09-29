import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://chartgame.co.kr';
  
  const routes = [
    '',
    '/game',
    '/leaderboard',
    '/signin',
    '/calculators',
    '/calculators/average',
    '/calculators/compound',
    '/calculators/exchange',
    '/calculators/fee',
    '/calculators/losscut',
    '/calculators/target',
    '/calculators/tax',
    '/calculators/water',
    '/calculators/yield',
  ];
  
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.7,
  })) as MetadataRoute.Sitemap;
}