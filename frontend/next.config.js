/** @type {import('next').NextConfig} */
const fs = require('fs');

let version = 'dev';
try {
  // Läs version från package.json (enda källan)
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  version = packageJson.version;
} catch (e) {
  console.warn('Could not read package.json:', e.message);
}

console.log(`📦 Building frontend version: v${version}`);

const nextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
  // Proxy: alla /api/-anrop från webbläsaren går via Next.js-servern till backend-containern.
  // Gör att en enda URL (Tailscale eller localhost:3000) räcker – ingen separat port 3001 behövs.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
