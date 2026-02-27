/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');

let version = 'dev';
try {
  version = execSync('git describe --tags', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('⚠️ Could not get git version:', e.message);
}

console.log(`📦 Building frontend version: ${version}`);

const nextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
};

module.exports = nextConfig;
