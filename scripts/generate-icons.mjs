import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 48, 96, 128];
const svgPath = path.join(__dirname, '../src/assets/icons/icon.svg');
const outDir = path.join(__dirname, '../src/assets/icons');

const svg = fs.readFileSync(svgPath, 'utf8');

async function generateIcons() {
  for (const size of sizes) {
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    
    const outPath = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(outPath, pngBuffer);
    console.log(`Generated: ${outPath} (${pngBuffer.length} bytes)`);
  }
  
  console.log('All icons generated!');
}

generateIcons().catch(console.error);