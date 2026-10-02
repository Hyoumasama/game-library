# Emulation logo credits

Downloaded logos and their exact upstream revisions, source URLs, and license links are recorded in [emulation-logo-sources.json](emulation-logo-sources.json).

- Azahar Emu Logo © 2024 by **angyartanddraw and PabloMK7**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), obtained from the official Azahar repository. The embedded attribution is preserved.
- System logo variants from **Art Book Next by Anthony Caccese** are used under the theme collection's [CC BY-NC-SA 2.0](https://creativecommons.org/licenses/by-nc-sa/2.0/) terms. See the [upstream credits and license](https://github.com/anthonycaccese/art-book-next-es-de#license). Assets are preserved unchanged.
- Other logos are obtained from Wikimedia Commons. Each file's description page and license are recorded in the source manifest. Embedded metadata is preserved.

System and emulator trademarks belong to their respective owners.

Compact badge variants use the existing logo glyphs: 3DS and DS omit the Nintendo prefix, and SNES uses the Super Famicom emblem. PS2 uses the standalone white line logo with a small extra stroke for visibility. Wii and Wii U use white logo variants. Nintendo 64 uses its N emblem from [the logo source](https://en.wikipedia.org/wiki/File:Nintendo_64_(logo).svg). The rejected 3DS console illustration was removed.

Wordmarks receive 40–42 pixels of width in game badges, while compact emblems receive 18 pixels. The footer wraps its badges when necessary to prevent the larger logos overlapping the hours. A [preview at actual badge size](platform-badges-preview.png) covers every newly added system logo.

There are 20 newly covered emulator/system identities and three additional light variants for Nintendo 3DS, Nintendo DS, and Game Boy Color. Existing Xenia, Vita3K, PlayStation, PlayStation 2, PlayStation 3, and Switch assets are reused.

To refresh downloaded assets, run `node scripts/fetch-emulation-logos.mjs` followed by `node scripts/prepare-compact-platform-logos.mjs`.
To render the contact sheets, run `node scripts/preview-emulation-logos.mjs` and `node --experimental-strip-types scripts/preview-platform-badges.mjs`.
