import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://sanatanibandhan.web.app';

// Define the core public-facing modules to be indexed by search engines
const routes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/purohit-marketplace', priority: '0.9', changefreq: 'daily' },
  { path: '/matrimony', priority: '0.9', changefreq: 'daily' },
  { path: '/panchang', priority: '0.8', changefreq: 'daily' },
  { path: '/goshala', priority: '0.8', changefreq: 'weekly' },
  { path: '/dharamshala', priority: '0.8', changefreq: 'weekly' },
  { path: '/sanskrit-library', priority: '0.8', changefreq: 'monthly' },
  { path: '/pooja-booking', priority: '0.8', changefreq: 'weekly' }
];

const generateSitemap = () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const distPath = path.resolve('dist');
  
  // Ensure dist directory exists
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), xml);
  console.log('✅ sitemap.xml successfully generated in dist directory');
};

generateSitemap();
