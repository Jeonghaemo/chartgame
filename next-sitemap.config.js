/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://chartgame.co.kr',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/api/*', '/auth/*'],
  transform: async (_config, path) => ({
    loc: path,
    changefreq: 'daily',
    priority: path === '/' ? 1.0 : 0.7,
    lastmod: new Date().toISOString(),
  }),
};
