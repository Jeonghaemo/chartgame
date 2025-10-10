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

  // 블로그 / 가이드 포스트 (총 16개)
  const posts = [
    // 기존 11개
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

    // ✅ 신규 5개 심화글
    '/posts/trading-journal',
    '/posts/market-cycles',
    '/posts/stop-loss-mastery',
    '/posts/trend-reversals',
    '/posts/portfolio-risk',
  ]

  const all = [...routes, ...posts]

  return all.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1.0 : 0.7,
  }))
}
