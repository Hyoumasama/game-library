# Console platform logos — 2026-10-05

Source collection: https://commons.fandom.com/wiki/Category:Console_logos

26 console logos are downloaded locally in `public/platforms/fandom/originals/`.
Source file pages, download URLs, available license metadata, and transformations
are recorded in `platform-logo-sources-2026-10-05.json`. Console trademarks belong
to their respective owners; consult each source file page for its terms.

The displayed PNG variants preserve source alpha, remove transparent margins,
and use white silhouettes for dark wordmarks. PlayStation, Nintendo 64, and Xbox
emblems retain their original colors to preserve internal details. Assets are rendered at 4x badge
resolution. All cover badges use a 16px height with proportional widths capped
at 56px. Game details use the same width helper for platform, store, and hardware.
Store and emulator logos keep their existing assets. Consoles missing from the
collection (Famicom and MSX2) retain their previous logos.

## Restore previous logos

All previous image files remain at their original paths. The previous mapping
and width rules are preserved in `gameIcons-before-fandom-2026-10-05.ts`.
From the project root, run:

```powershell
Copy-Item -LiteralPath docs/gameIcons-before-fandom-2026-10-05.ts -Destination lib/gameIcons.ts
```

To refresh the new assets and their provenance, run
`node scripts/fetch-fandom-platform-logos.mjs`.
