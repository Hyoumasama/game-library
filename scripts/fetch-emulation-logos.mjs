import fs from 'node:fs/promises';

// Keep source URLs alongside downloaded assets for attribution and future updates.
const commons = [
  ['platforms/xemu.svg', 'Xemu logo green.svg'],
  ['hardware/wii.svg', 'Wii.svg'],
  ['hardware/wiiu.svg', 'WiiU.svg'],
  ['hardware/gamecube.svg', 'GC Logo.svg'],
  ['hardware/nintendo3ds.svg', 'Nintendo 3DS logo.svg'],
  ['hardware/nintendods.svg', 'Nintendo DS Logo.svg'],
  ['hardware/gba.svg', 'Game Boy Advance logo.svg'],
  ['hardware/gbc.svg', 'Game Boy Color logo.svg'],
];
const github = [
  ['hardware/nintendo3ds-light.svg', 'n3ds'],
  ['hardware/nintendods-light.svg', 'nds'],
  ['hardware/gbc-light.svg', 'gbc'],
  ['hardware/nintendo64.svg', 'n64'],
  ['hardware/gameboy.svg', 'gb'],
  ['hardware/nes.svg', 'nes'],
  ['hardware/snes.svg', 'snes'],
  ['hardware/famicom.svg', 'famicom'],
  ['hardware/superfamicom.svg', 'sfc'],
  ['hardware/psp.svg', 'psp'],
  ['hardware/psvita.svg', 'psvita'],
  ['hardware/xbox360.svg', 'xbox360'],
  ['hardware/msx2.svg', 'msx2'],
  ['hardware/xbox-original.svg', 'xbox'],
];
const sources = [];
async function saveSvg(path, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const svg = await response.text();
  if (!/<svg[\s>]/i.test(svg) || /<script[\s>]|<foreignObject[\s>]|\son\w+\s*=/i.test(svg)) throw new Error(`Unexpected SVG: ${path}`);
  await fs.writeFile(`public/${path}`, svg);
  console.log(`Saved ${path}`);
}
const api = new URL('https://commons.wikimedia.org/w/api.php');
api.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', titles: commons.map(([, title]) => `File:${title}`).join('|') });
const response = await fetch(api);
if (!response.ok) throw new Error(`Commons API: HTTP ${response.status}`);
const result = await response.json();
for (const [path, title] of commons) {
  const info = Object.values(result.query.pages).find(p => p.title === `File:${title}`)?.imageinfo?.[0];
  if (!info) throw new Error(`Missing source: ${title}`);
  const url = info.url.split('?')[0];
  if (!(await fs.stat(`public/${path}`).catch(() => null))) await saveSvg(path, url);
  sources.push({ path: `public/${path}`, source: info.descriptionurl, download: url, license: info.extmetadata?.LicenseShortName?.value, licenseUrl: info.extmetadata?.LicenseUrl?.value });
}
const repo = 'anthonycaccese/art-book-next-es-de';
const repoInfo = await (await fetch(`https://api.github.com/repos/${repo}/commits/main`)).json();
if (!repoInfo.sha) throw new Error('Cannot resolve logo collection revision');
for (const [path, system] of github) {
  const asset = `_inc/systems/logos/${system}.svg`;
  const url = `https://raw.githubusercontent.com/${repo}/${repoInfo.sha}/${asset}`;
  await saveSvg(path, url);
  sources.push({ path: `public/${path}`, source: `https://github.com/${repo}/blob/${repoInfo.sha}/${asset}`, download: url, license: 'CC BY-NC-SA 2.0 (theme collection)', attribution: 'Art Book Next by Anthony Caccese; system trademarks belong to their respective owners', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/2.0/' });
}
const azaharRepo = 'azahar-emu/azahar';
const azaharInfo = await (await fetch(`https://api.github.com/repos/${azaharRepo}/commits/master`)).json();
if (!azaharInfo.sha) throw new Error('Cannot resolve Azahar revision');
const azaharUrl = `https://raw.githubusercontent.com/${azaharRepo}/${azaharInfo.sha}/dist/azahar.svg`;
await saveSvg('platforms/azahar.svg', azaharUrl);
sources.push({ path: 'public/platforms/azahar.svg', source: `https://github.com/${azaharRepo}/blob/${azaharInfo.sha}/dist/azahar.svg`, download: azaharUrl, license: 'CC BY 4.0', attribution: 'Azahar Emu Logo (c) 2024 by angyartanddraw and PabloMK7', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' });
await fs.writeFile('docs/emulation-logo-sources.json', JSON.stringify(sources, null, 2) + '\n');
console.log(`Ready: ${sources.length} logos`);
