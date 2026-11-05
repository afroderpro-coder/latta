const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function createIco(pngBuffers, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(pngBuffers.length, 4); // count

  let offset = 6 + pngBuffers.length * 16;
  const dirEntries = [];

  for (let i = 0; i < pngBuffers.length; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function main() {
  const S = 512;
  const emblemPath = path.join(__dirname, '../public/logo-emblem-white.png');
  
  // 1. Trim the emblem so it is tightly bounded
  const trimmed = await sharp(emblemPath).trim().toBuffer({ resolveWithObject: true });
  console.log('Trimmed emblem dimensions:', trimmed.info.width, 'x', trimmed.info.height);

  // 2. Brighten emblem slightly to ensure high contrast against pure black
  const brightEmblem = await sharp(trimmed.data)
    .modulate({ brightness: 1.15 })
    .linear(1.15, 0)
    .toBuffer();

  // 3. Scale emblem to fit comfortably within circular crop (radius 256)
  // Target width 400px (approx 78% of 512px canvas, leaving ~30px clearance from circle boundary)
  const targetW = 400;
  const targetH = Math.round(targetW * (trimmed.info.height / trimmed.info.width));
  console.log('Target scaled emblem dimensions:', targetW, 'x', targetH);

  const resizedEmblem = await sharp(brightEmblem)
    .resize(targetW, targetH, { fit: 'inside' })
    .toBuffer();

  // 4. Composite onto solid rich black #000000 canvas
  const master512 = await sharp({
    create: {
      width: S,
      height: S,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedEmblem,
      top: Math.round((S - targetH) / 2),
      left: Math.round((S - targetW) / 2)
    }
  ])
  .png()
  .toBuffer();

  // 5. Generate all required sizes
  const p512 = master512;
  const p192 = await sharp(master512).resize(192, 192, { kernel: 'lanczos3' }).png().toBuffer();
  const p180 = await sharp(master512).resize(180, 180, { kernel: 'lanczos3' }).png().toBuffer();
  const p64  = await sharp(master512).resize(64, 64, { kernel: 'lanczos3' }).sharpen().png().toBuffer();
  const p48  = await sharp(master512).resize(48, 48, { kernel: 'lanczos3' }).sharpen().png().toBuffer();
  const p32  = await sharp(master512).resize(32, 32, { kernel: 'lanczos3' }).sharpen().png().toBuffer();
  const p16  = await sharp(master512).resize(16, 16, { kernel: 'lanczos3' }).sharpen().png().toBuffer();

  // 6. Generate multi-resolution favicon.ico
  const ico = createIco([p16, p32, p48, p64], [16, 32, 48, 64]);

  // 7. Write to public/ and src/app/
  const destinations = [
    path.join(__dirname, '../public'),
    path.join(__dirname, '../src/app')
  ];

  for (const dir of destinations) {
    fs.writeFileSync(path.join(dir, 'icon-512.png'), p512);
    fs.writeFileSync(path.join(dir, 'icon.png'), p192);
    fs.writeFileSync(path.join(dir, 'icon-48.png'), p48);
    fs.writeFileSync(path.join(dir, 'apple-icon.png'), p180);
    fs.writeFileSync(path.join(dir, 'favicon.ico'), ico);
    console.log(`Updated icons in ${dir}`);
  }

  // Clean up any test files in public
  const testFiles = [
    'test-icon-512.png',
    'test-favicon.ico',
    'test-google-preview-dark.png',
    'test-google-preview-light.png'
  ];
  for (const f of testFiles) {
    const fp = path.join(__dirname, '../public', f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  console.log('All favicons and app icons generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

