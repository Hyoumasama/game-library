import fs from 'node:fs/promises';
import sharp from 'sharp';
import { getIcon, getIconBadgeWidth } from '../lib/gameIcons.ts';

const names = ['Nintendo 3DS', 'PlayStation 2', 'Wii U', 'Nintendo DS', 'Wii', 'GameCube', 'Nintendo 64', 'Game Boy Advance', 'Game Boy Color', 'Game Boy', 'NES', 'SNES', 'PSP', 'PS Vita', 'Xbox 360', 'MSX2', 'Famicom', 'Super Famicom', 'Original Xbox', 'xemu', 'Azahar'];
const layers = [];
for (const [index, name] of names.entries()) {
  const left = (index % 3) * 260;
  const top = Math.floor(index / 3) * 110;
  const path = getIcon(name);
  const width = getIconBadgeWidth(path);
  const buffer = await sharp(`public${path}`).resize(width, 16, { fit: 'contain', background: '#0000' }).png().toBuffer();
  const store = await sharp('public/platforms/citra.png').resize(16, 16).png().toBuffer();
  const hardware = await sharp('public/hardware/steamdeck2.png').resize(16, 16).png().toBuffer();
  const background = Buffer.from(`<svg width="260" height="110"><text x="16" y="25" fill="#d1d5db" font-size="14">${name}</text><rect x="16" y="42" width="${width + 64}" height="26" rx="13" fill="#04080b" stroke="#26717b"/><text x="16" y="91" fill="#94a3b8" font-size="11">Actual size: ${width} × 16 px</text></svg>`);
  layers.push({ input: background, left, top });
  layers.push({ input: store, left: left + 24, top: top + 47 });
  layers.push({ input: buffer, left: left + 46, top: top + 47 });
  layers.push({ input: hardware, left: left + 52 + width, top: top + 47 });
}
await fs.mkdir('docs', { recursive: true });
await sharp({ create: { width: 780, height: Math.ceil(names.length / 3) * 110, channels: 4, background: '#111827' } }).composite(layers).png().toFile('docs/platform-badges-preview.png');
