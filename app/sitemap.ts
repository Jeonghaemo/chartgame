import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://chartgame.co.kr'

  // 주요 정적 페이지
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
    '/terms',
    '/privacy',
    '/contact',
  ]

  // 승인용 포스트 (블로그/가이드 글)
  const posts = [
    '/posts/avg-price-calculator',
    '/posts/chart-basics',
    '/posts/chartgame-guide',
    '/posts/common-mistakes',
    '/posts/domestic-vs-us',
    '/posts/etf-basics',
    '/posts/investment-tools',
    '/posts/long-vs-short',
    '/posts/risk-management',
    '/posts/stock-faq',
    '/posts/stock-tax-fee',
  ]

  const all = [...routes, ...posts]

  return all.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1.0 : 0.7,
  }))
}
