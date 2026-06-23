const sharp = require('sharp');
const path = require('path');

const src = path.join('C:', 'Users', 'dhtmd', 'Downloads', 'ChatGPT Image Jun 23, 2026, 01_23_11 PM.png');
const pub = path.join(__dirname, '..', 'public');

async function convert() {
  // Load and trim black border by extracting the inner rounded rect area
  const meta = await sharp(src).metadata();
  const size = Math.min(meta.width, meta.height);
  // The icon with black border is ~1024x1024, inner icon starts around 5% in
  const trim = Math.floor(size * 0.04);
  const inner = size - trim * 2;

  const cropped = sharp(src).extract({ left: trim, top: trim, width: inner, height: inner });

  await cropped.clone().resize(512, 512).png().toFile(path.join(pub, 'icon-512.png'));
  await cropped.clone().resize(192, 192).png().toFile(path.join(pub, 'icon-192.png'));
  await cropped.clone().resize(32, 32).png().toFile(path.join(pub, 'favicon.png'));
  await cropped.clone().resize(32, 32).png().toFile(path.join(__dirname, '..', 'app', 'favicon.ico'));

  console.log('Logo converted!');
}

convert();
