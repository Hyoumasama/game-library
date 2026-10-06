import fs from 'node:fs/promises';
import sharp from 'sharp';

const entries = [
  ['ps1', 'PS.svg'], ['ps2', 'PS2.svg'], ['ps3', 'PS3.svg'],
  ['ps4', 'PS4.svg'], ['ps5', 'PS5.svg'], ['psp', 'PSP.svg'],
  ['psvita', 'PSVita.svg'], ['switch', 'Nintendo Switch.svg'],
  ['wii', 'Wii.svg'], ['wiiu', 'WiiU.svg'], ['gamecube', 'GameCube.svg'],
  ['3ds', '3DS.svg'], ['ds', 'Nintendo DS.svg'], ['n64', 'Nintendo 64.svg'],
  ['gba', 'Game Boy Advance.svg'], ['gbc', 'Game Boy Color.svg'], ['gb', 'Game Boy.svg'],
  ['nes', 'Nintendo Entertainment System.svg'], ['snes', 'Super Nintendo Entertainment System.svg'],
  ['xbox-original', 'Xbox.svg'], ['xbox360', 'Xbox 360.svg'],
  ['xboxone', 'Xbox One.svg'], ['xboxseries', 'Xbox Series.svg'],
  ['dreamcast', 'Dreamcast.svg'], ['genesis', 'Sega Genesis.svg'], ['atari', 'Atari.svg'],
];
const directory = 'public/platforms/fandom';
await fs.mkdir(`${directory}/originals`, { recursive: true });
const url = new URL('https://commons.fandom.com/api.php');
url.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', titles: entries.map(([, title]) => `File:${title}`).join('|') });
const response = await fetch(url);
if (!response.ok) throw new Error(`Fandom API: ${response.status}`);
const result = await response.json();
const sources = [];
const widths = {};
for (const [name, title] of entries) {
  const info = Object.values(result.query.pages).find(page => page.title === `File:${title}`)?.imageinfo?.[0];
  if (!info) throw new Error(`Missing ${title}`);
  const response = await fetch(info.url);
  if (!response.ok) throw new Error(`${title}: ${response.status}`);
  const svg = await response.text();
  if (!/<svg[\s>]/i.test(svg) || /<script[\s>]|<foreignObject[\s>]|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i.test(svg)) throw new Error(`Unsafe SVG: ${title}`);
  await fs.writeFile(`${directory}/originals/${name}.svg`, svg);
  // Preserve the source silhouette and alpha; white keeps even dark wordmarks visible.
  const trimmed = await sharp(Buffer.from(svg), { density: 300 }).ensureAlpha().trim().png().toBuffer();
  const metadata = await sharp(trimmed).metadata();
  const width = Math.max(16, Math.min(56, Math.round(metadata.width / metadata.height * 16)));
  const preserveColors = ['ps1', 'n64', 'xbox-original', 'xbox360', 'xboxone', 'xboxseries'].includes(name);
  const badge = preserveColors ? sharp(trimmed) : sharp(trimmed).linear([0, 0, 0, 1], [255, 255, 255, 0]);
  await badge.resize(width * 4, 64, { fit: 'contain', background: '#0000' }).png().toFile(`${directory}/${name}.png`);
  widths[`/platforms/fandom/${name}.png`] = width;
  sources.push({ name, title, source: info.descriptionurl, download: info.url, original: `${directory}/originals/${name}.svg`, path: `${directory}/${name}.png`, modification: `Trimmed transparent margins; ${preserveColors ? 'original colors' : 'white RGB with original alpha'}; padded to badge aspect ratio at 4x resolution`, license: info.extmetadata?.LicenseShortName?.value || 'See source file page; Fandom community content CC BY-SA unless otherwise noted', metadata: info.extmetadata || {} });
  console.log(`Saved ${name}: ${width} x 16`);
}
await fs.writeFile('lib/platformLogoWidths.json', JSON.stringify(widths, null, 2) + '\n');
await fs.writeFile('docs/platform-logo-sources-2026-10-05.json', JSON.stringify(sources, null, 2) + '\n');
