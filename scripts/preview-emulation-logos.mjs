import fs from 'node:fs/promises';
import sharp from 'sharp';

const sources = JSON.parse(await fs.readFile('docs/emulation-logo-sources.json', 'utf8'));
const layers = [];
for (const [index, source] of sources.entries()) {
  const left = (index % 4) * 260;
  const top = Math.floor(index / 4) * 150;
  const input = await sharp(source.path).resize(220, 90, { fit: 'inside' }).png().toBuffer();
  const { width } = await sharp(input).metadata();
  layers.push({ input, left: left + Math.floor((260 - width) / 2), top: top + 10 });
  const name = source.path.split('/').pop();
  const label = `<svg width="260" height="30"><text x="130" y="21" fill="#fff" font-size="16" text-anchor="middle">${name}</text></svg>`;
  layers.push({ input: Buffer.from(label), left, top: top + 110 });
}
await sharp({ create: { width: 1040, height: Math.ceil(sources.length / 4) * 150, channels: 4, background: '#202534' } })
  .composite(layers).png().toFile('docs/emulation-logos-preview.png');
console.log(`Rendered ${sources.length} SVGs`);
