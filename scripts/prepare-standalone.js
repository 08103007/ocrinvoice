const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

console.log('--- Preparing standalone build for Electron ---');

// Ensure destination directories
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static');
const standalonePublicDir = path.join(standaloneDir, 'public');

fs.mkdirSync(standaloneStaticDir, { recursive: true });
fs.mkdirSync(standalonePublicDir, { recursive: true });

// Copy .next/static
const srcStatic = path.join(rootDir, '.next', 'static');
if (fs.existsSync(srcStatic)) {
  fs.cpSync(srcStatic, standaloneStaticDir, { recursive: true });
  console.log('✓ Copied .next/static to standalone');
}

// Copy public
const srcPublic = path.join(rootDir, 'public');
if (fs.existsSync(srcPublic)) {
  fs.cpSync(srcPublic, standalonePublicDir, { recursive: true });
  console.log('✓ Copied public to standalone');
}

// Copy .env.local
const srcEnv = path.join(rootDir, '.env.local');
if (fs.existsSync(srcEnv)) {
  fs.copyFileSync(srcEnv, path.join(standaloneDir, '.env.local'));
  console.log('✓ Copied .env.local to standalone');
}

console.log('--- Standalone build prepared successfully ---');
