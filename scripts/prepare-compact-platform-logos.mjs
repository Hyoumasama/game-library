import fs from 'node:fs/promises';

const manifestPath = 'docs/emulation-logo-sources.json';
let sources = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  .filter(source => source.path !== 'public/hardware/nintendo3ds-icon.svg');
const revision = await (await fetch('https://api.github.com/repos/anthonycaccese/art-book-next-es-de/commits/main')).json();
if (!revision.sha) throw new Error('Cannot resolve logo revision');
for (const name of ['ps2', 'wii', 'wiiu', 'nds', 'gba', 'gbc']) {
  const asset = `_inc/systems/logos/${name}.svg`;
  const download = `https://raw.githubusercontent.com/anthonycaccese/art-book-next-es-de/${revision.sha}/${asset}`;
  const response = await fetch(download);
  if (!response.ok) throw new Error(`Logo ${name}: ${response.status}`);
  const svg = await response.text();
  if (!svg.includes('<svg')) throw new Error(`Invalid ${name} SVG`);
  const path = `public/hardware/${name}-badge.svg`;
  await fs.writeFile(path, svg);
  sources = sources.filter(source => source.path !== path);
  sources.push({ path, source: `https://github.com/anthonycaccese/art-book-next-es-de/blob/${revision.sha}/${asset}`, download, license: 'CC BY-NC-SA 2.0', attribution: 'Art Book Next by Anthony Caccese', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/2.0/' });
}
for (const [path, derivedFrom, modification] of [
  ['public/hardware/3ds-badge.svg', 'public/hardware/nintendo3ds-light.svg', 'Cropped viewBox to 3DS glyphs'],
  ['public/hardware/ds-badge.svg', 'public/hardware/nds-badge.svg', 'Cropped viewBox to DS glyphs'],
  ['public/hardware/snes-emblem.svg', 'public/hardware/superfamicom.svg', 'Cropped viewBox to original emblem'],
  ['public/hardware/ps2-compact.svg', 'public/hardware/ps2-badge.svg', 'Extra 2-unit white stroke for small size readability'],
]) {
  sources = sources.filter(source => source.path !== path);
  sources.push({ path, derivedFrom, modification, license: 'CC BY-NC-SA 2.0', attribution: 'Art Book Next by Anthony Caccese', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/2.0/' });
}
const n64Path = 'public/hardware/n64-logo.svg';
sources = sources.filter(source => source.path !== n64Path);
sources.push({ path: n64Path, source: 'https://en.wikipedia.org/wiki/File:Nintendo_64_(logo).svg', download: 'https://upload.wikimedia.org/wikipedia/en/2/2d/Nintendo_64_%28logo%29.svg', note: 'Nintendo 64 N logo, unchanged' });
await fs.writeFile(manifestPath, JSON.stringify(sources, null, 2) + '\n');

// Badge variants retain the original vector glyphs and omit long brand prefixes.
async function compact(source, destination, viewBox) {
  let svg = await fs.readFile(source, 'utf8');
  svg = svg.replace(/viewBox="[^"]+"/, `viewBox="${viewBox}"`);
  await fs.writeFile(destination, svg);
}
await compact('public/hardware/nintendo3ds-light.svg', 'public/hardware/3ds-badge.svg', '336 0 264 74');
await compact('public/hardware/nds-badge.svg', 'public/hardware/ds-badge.svg', '172 0 92 38');
await compact('public/hardware/superfamicom.svg', 'public/hardware/snes-emblem.svg', '0 0 66 50');
// A little extra stroke keeps the original PS2 line logo visible at badge size.
let ps2 = await fs.readFile('public/hardware/ps2-badge.svg', 'utf8');
ps2 = ps2.replace(/<polygon /g, '<polygon stroke="#fff" stroke-width="2" stroke-linejoin="miter" ');
await fs.writeFile('public/hardware/ps2-compact.svg', ps2);
