const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = '/Users/ravipatil/Documents/hyperweb/hyperdelivery';

// Master SVG for HyperDelivery Monogram Favicon
// Features:
// 1. Apple-style squircle with vibrant royal-to-hyper blue gradient
// 2. Mathematically centered, bold, confident "H"
// 3. Energetic food delivery amber/orange accent dot
// 4. Subtle frosted rim for depth on dark tabs
const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="hdBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e40af" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb923c" />
      <stop offset="100%" stop-color="#f97316" />
    </linearGradient>
    <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Squircle Base with smooth curvature and subtle inset border -->
  <rect x="36" y="36" width="440" height="440" rx="114" fill="url(#hdBgGrad)" filter="url(#shadowFilter)" />
  <rect x="36" y="36" width="440" height="440" rx="114" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity="0.2" />

  <!-- Monogram 'H' (Unified seamless path) -->
  <path d="
    M 144 154
    A 18 18 0 0 1 162 136
    L 190 136
    A 18 18 0 0 1 208 154
    L 208 226
    L 304 226
    L 304 154
    A 18 18 0 0 1 322 136
    L 350 136
    A 18 18 0 0 1 368 154
    L 368 358
    A 18 18 0 0 1 350 376
    L 322 376
    A 18 18 0 0 1 304 358
    L 304 286
    L 208 286
    L 208 358
    A 18 18 0 0 1 190 376
    L 162 376
    A 18 18 0 0 1 144 358
    Z
  " fill="url(#stemGrad)" />

  <!-- Hyper Orange Delivery Accent Dot -->
  <circle cx="360" cy="146" r="18" fill="url(#accentGrad)" />
</svg>`;

// Helper function to build multi-frame ICO file from PNG buffers
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  
  let currentOffset = headerSize + dirSize;
  const dirEntries = [];
  
  for (const item of pngBuffers) {
    const { width, height, buffer } = item;
    const size = buffer.length;
    
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width === 256 ? 0 : width, 0);   // width
    entry.writeUInt8(height === 256 ? 0 : height, 1); // height
    entry.writeUInt8(0, 2);                          // color palette
    entry.writeUInt8(0, 3);                          // reserved
    entry.writeUInt16LE(1, 4);                       // color planes
    entry.writeUInt16LE(32, 6);                      // bits per pixel
    entry.writeUInt32LE(size, 8);                    // size of image data
    entry.writeUInt32LE(currentOffset, 12);           // offset of image data
    
    dirEntries.push(entry);
    currentOffset += size;
  }
  
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type (1 = icon)
  header.writeUInt16LE(count, 4); // count
  
  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

async function buildFavicons() {
  console.log('Writing master SVG...');
  const appDir = path.join(rootDir, 'src/app');
  const publicDir = path.join(rootDir, 'public');
  
  // 1. Save src/app/icon.svg
  fs.writeFileSync(path.join(appDir, 'icon.svg'), masterSvg);
  
  // 2. Generate crisp PNG buffers
  const svgBuf = Buffer.from(masterSvg);
  
  const buf512 = await sharp(svgBuf).resize(512, 512).png().toBuffer();
  const buf192 = await sharp(svgBuf).resize(192, 192).png().toBuffer();
  const buf180 = await sharp(svgBuf).resize(180, 180).png().toBuffer();
  const buf48  = await sharp(svgBuf).resize(48, 48).png().toBuffer();
  const buf32  = await sharp(svgBuf).resize(32, 32).png().toBuffer();
  const buf16  = await sharp(svgBuf).resize(16, 16).png().toBuffer();
  
  // 3. Write icon.png and apple-icon.png in src/app
  fs.writeFileSync(path.join(appDir, 'icon.png'), buf512);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), buf180);
  
  // 4. Build .ico with 16, 32, 48px frames
  const icoBuffer = createIco([
    { width: 48, height: 48, buffer: buf48 },
    { width: 32, height: 32, buffer: buf32 },
    { width: 16, height: 16, buffer: buf16 },
  ]);
  
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), buf512);
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), buf180);
  
  console.log('All favicon assets generated successfully!');
}

buildFavicons().catch(console.error);
