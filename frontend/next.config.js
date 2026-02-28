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
};

module.exports = nextConfig;
