/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://chartgame.co.kr',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  sitemapSize: 7000,
  exclude: ['/api/*', '/auth/*'],
};