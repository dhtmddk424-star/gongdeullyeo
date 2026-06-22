const sharp = require('sharp');
const path = require('path');

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#FAF7F2"/>
  <rect x="24" y="24" width="464" height="464" rx="80" fill="#C9A882" fill-opacity="0.15"/>
  <text x="256" y="200" text-anchor="middle" font-size="160" font-family="serif" fill="#4A3728" font-weight="600">공</text>
  <text x="256" y="380" text-anchor="middle" font-size="80" font-family="sans-serif" fill="#9A8A78" font-weight="400">들여</text>
  <circle cx="400" cy="120" r="24" fill="#C9A882"/>
  <rect x="390" y="80" width="20" height="12" rx="4" fill="#C9A882"/>
</svg>`;

async function generate() {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(192, 192).png().toFile(path.join(__dirname, '..', 'public', 'icon-192.png'));
  await sharp(buf).resize(512, 512).png().toFile(path.join(__dirname, '..', 'public', 'icon-512.png'));
  await sharp(buf).resize(32, 32).png().toFile(path.join(__dirname, '..', 'app', 'favicon.ico'));
  console.log('Icons generated!');
}

generate();
