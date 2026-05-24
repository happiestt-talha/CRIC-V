/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://cric-v.live',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    '/dashboard',
    '/dashboard/*',
    '/sessions',
    '/sessions/*',
    '/players',
    '/players/*',
    '/analysis',
    '/analysis/*',
    '/profile',
    '/admin',
    '/admin/*',
    '/change-password',
    '/verify-email',
    '/reset-password',
  ],
  additionalPaths: async (config) => [
    {
      loc: '/',
      changefreq: 'weekly',
      priority: 1.0,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/login',
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    },
    {
      loc: '/register',
      changefreq: 'monthly',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    },
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: [
          '/dashboard',
          '/sessions',
          '/players',
          '/analysis',
          '/profile',
          '/admin',
          '/api/',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        crawlDelay: 2,
      },
    ],
    additionalSitemaps: [],
  },
}
