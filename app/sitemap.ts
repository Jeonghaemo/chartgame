import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://chartgame.co.kr'

  // 주요 정적 페이지
  const routes = [
    '',
    '/game',
    '/leaderboard',
    '/signin',
    '/posts', // 블로그 허브
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
    '/terms',
    '/privacy',
    '/contact',
  ]

  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1.0 : 0.7,
  }))
}
