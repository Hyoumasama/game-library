# Semantic cleanup — 2026-09-16

Supabase project: odohyafmagygisgvonch. No existing games row was changed or removed.

| Metric | Before | After |
|---|---:|---:|
| Library rows | 2234 | 2234 |
| Canonical games | 2027 | 2024 |
| Directed relationships | 194 | 191 |
| Canonicals without ownership | 12 | 9 |
| Pending reviews | 0 | 0 |
| Canonical duplicates consolidated | — | 12 |
| Historical identities created | — | 9 |

All integrity counts for missing identities, duplicate mappings/edges/review candidates, self edges, inverse conflicts, conflicting types, broken foreign keys, suspicious merges and orphan records are zero. Known wrong generation/type facts and all twelve listed duplicate canonical groups are zero. The 9 unowned historical targets are intentional, and HTTP tests verify zero owned copies.

## Ownership preservation

All-row SHA-256 before and after: `bfc99040dc279f60202c2acbeb27c7b4191c75f8ac5871ccfdda31f053cbcea3`.
PostgreSQL all-row JSON MD5 before and after: `7895409b9f210c42f80dfc80d85f8c26`.
Both data migrations assert the exact 2,234-row baseline and checksum inside their transactions; an independent paginated snapshot checks all columns afterwards.

## Removed relationships (15)

- Doom II → Doom: `sequel_of`
- Marvel's Spider-Man: Miles Morales → Marvel's Spider-Man: `standalone_expansion_of`
- Supraland - Crash → Supraland: `expansion_of`
- Tomb Raider GAME OF THE YEAR EDITION → Tomb Raider: `edition_of`
- Resident Evil 2 → Resident Evil: `sequel_of`
- Silent Hill 3 → Silent Hill 2: `sequel_of`
- Final Fantasy III → Final Fantasy II: `sequel_of`
- Ninja Gaiden 2 BLACK → Ninja Gaiden Sigma 2: `remaster_of`
- METAL GEAR SOLID V: GROUND ZEROES → METAL GEAR SOLID V: THE PHANTOM PAIN: `standalone_expansion_of`
- Saints Row 2 → Saints Row: `sequel_of`
- Final Fantasy II → Final Fantasy: `sequel_of`
- Doom II → Doom: `sequel_of`
- Thronebreaker: The Witcher Tales → GWENT: The Witcher Card Game: `standalone_expansion_of`
- Metroid Prime Remastered → Metroid Prime: `remaster_of`
- Silent Hill 2 → Silent Hill: `sequel_of`

## Added relationships (12)

- Resident Evil 2 → Resident Evil 2 (1998): `remake_of`
- Tomb Raider GAME OF THE YEAR EDITION → Tomb Raider (2013): `edition_of`
- METAL GEAR SOLID V: GROUND ZEROES → METAL GEAR SOLID V: THE PHANTOM PAIN: `prologue_of`
- Final Fantasy → Final Fantasy (1987): `remaster_of`
- Ninja Gaiden 2 BLACK → Ninja Gaiden II (2008): `remaster_of`
- Saints Row 2 → Saints Row (2006): `sequel_of`
- Doom II → DOOM (1993): `sequel_of`
- Final Fantasy III → Final Fantasy III (1990): `remaster_of`
- Final Fantasy II → Final Fantasy II (1988): `remaster_of`
- Marvel's Spider-Man: Miles Morales → Marvel's Spider-Man: `sequel_of`
- Metroid Prime Remastered → Metroid Prime (2002): `remaster_of`
- Thronebreaker: The Witcher Tales → GWENT: The Witcher Card Game: `spinoff_of`

## Revalidated endpoints

Hexen Deathkings already targeted IGDB 3512 / Steam 2360, the owned Hexen identity whose canonical title was incorrectly Heretic: Beyond Heretic. Corrected canonical title to Hexen: Beyond Heretic; ownership text is unchanged. No extra historical Hexen identity was needed.

Anniversary already targeted IGDB 912 / Steam 224960, original Tomb Raider 1996, whose canonical date incorrectly said 2013. Corrected canonical date to 1996-10-24 and revalidated remake edge. The genuinely wrong GOTY 2013 edition target was redirected to a new historical 2013 reboot identity.

Miles Morales uses sequel_of for its standalone direct narrative continuation of Spider-Man 2018, following the project's source-to-predecessor convention. It is not an expansion. [PlayStation](https://www.playstation.com/en-us/games/marvels-spider-man-miles-morales/).
Thronebreaker uses spinoff_of for its independent RPG adaptation of GWENT mechanics, with its Witcher memberships retained. [Publisher](https://www.thewitcher.com/en/thronebreaker-witchertales).
Ground Zeroes uses prologue_of, consistent with Konami's prologue/main-story distinction. [Konami](https://www.konami.com/mg/mgs5/gz/jp/index.php).

Silent Hill retains original SH2 → SH1 and SH3 → original SH2 as installment release order. These edges do not claim immediate plot continuity: SH3's narrative continues SH1. The 2024 remake has only remake_of to SH2 2001 in this chain, and is never represented as a new sequel.

Additional corrections separate Resident Evil 2 2019 from original 1998 and FF I–III Pixel Remasters from Japanese originals (including Western-renumbering collisions). Metroid Prime Remastered targets GameCube 2002 instead of Wii 2009 ([Nintendo](https://www.nintendo.com/us/whatsnew/metroid-prime-remastered-rolled-out-in-latest-nintendo-direct-available-now-for-nintendo-switch/)). Ninja Gaiden II Black targets original 2008 instead of Sigma 2 2009 ([KOEI TECMO](https://www.koeitecmoamerica.com/news/team-ninjas-iconic-hero-ryu-hayabusa-returns-in-the-stunning-action-game-ninja-gaiden-2-black-now-available/)); Master Collection component edges are retained. Publisher evidence takes precedence over the conflicting IGDB parent. Tannenberg's existing standalone_expansion_of is preserved because the original developer announcement explicitly uses that classification ([announcement](https://store.steampowered.com/news/posts/?appids=242860&enddate=1495663257)).

## Consolidated canonicals (12)

- SCARF: IGDB 106836, Steam 645320; 3c9c2b8d-ebc5-4f04-a2d0-777eaf56f381 → 10d754cd-e2c9-409f-a3a7-d474062b2562
- Havendock: IGDB 208652, Steam 2020710; 525e77ad-ade5-437f-af66-a63d64331ac7 → 7769e4f7-b8fa-48b5-a105-3e42f6dd690b
- Supraland: IGDB 89354, Steam 813630; 6f17a6b3-a047-4868-a3bf-c3bb0a56626e → 62f07418-c4f1-481b-a962-e4f021c355f1
- Brotato: IGDB 199116, Steam 1942280; 77c9f6f2-bfa5-42a4-a7e3-f9d81a9557f9 → 0cb539fe-adb3-496f-a3f8-c024333e1b77
- Elite Dangerous: IGDB 2955, Steam 359320; 9a6d23a1-4025-477a-a4f3-a121f3080455 → f7a220c6-5fa6-4cae-a689-a2d59b3ea579
- Bloodstained: Ritual of the Night: IGDB 10760, Steam 692850; a151eb8b-c49e-4432-af33-4d8177482640 → 6745cd80-9a93-4943-ad49-6d6a816f99eb
- Loop Hero: IGDB 141533, Steam 1282730; a22411ea-83b8-42b6-aaa7-71e74194c311 → 63c9b87b-a348-4e1e-a4bc-7ede76f4142e
- Disco Elysium: The Final Cut: IGDB 141540, Steam 632470; ae767440-f488-4d35-aa26-9776ae55bd72 → 47c4efd0-3668-4a58-a578-5a11d42b2608
- Naheulbeuk's Dungeon Master: IGDB 252851, Steam 2005160; b5ab0ba0-c517-4130-a970-477b453955d3 → 87d3e8b4-521e-4f31-adb4-2df5fd48ed27
- Trek to Yomi: IGDB 152203, Steam 1370050; d113419d-be1e-48b3-a57f-482794159144 → 240f6e72-faa4-4301-aafa-0ae70506f98e
- Gravity Circuit: IGDB 106534, Steam 858710; df8f2092-8764-4a4f-a513-b36451533075 → 418e5a7c-7d4f-4262-ae4a-a6b46ff9af49
- Ghostwire Tokyo: IGDB 119308, Steam 1475810; f93032c8-d5d3-4b61-a698-5977d3b9f3cb → 1d7fb1bb-4678-44dd-a419-fa1190b212ac

Owned canonical survives in every case. Eleven orphan duplicates had no ownership, relationships or taxonomy memberships; Supraland's duplicate expansion edge was deduplicated. Review endpoints are rehomed where representable, with rejection precedence preserved; collapsed self-review history stays in the private before-image archive. Supraland release date is corrected to its original PC release, 2019-04-05; verified ownership aliases preserve library console-release metadata.

## Historical identities (9)

- Final Fantasy (1987): IGDB 385, 1987-12-18, 0 owned copies; https://www.igdb.com/games/final-fantasy
- Final Fantasy II (1988): IGDB 16474, 1988-12-17, 0 owned copies; https://www.igdb.com/games/final-fantasy-ii--1
- Saints Row (2006): IGDB 825, 2006-08-29, 0 owned copies; https://www.igdb.com/games/saints-row
- Tomb Raider (2013): IGDB 1164, 2013-03-05, 0 owned copies; https://www.igdb.com/games/tomb-raider--2
- Final Fantasy III (1990): IGDB 77234, 1990-04-27, 0 owned copies; https://www.igdb.com/games/final-fantasy-iii--1
- Metroid Prime (2002): IGDB 1105, 2002-11-17, 0 owned copies; https://www.igdb.com/games/metroid-prime
- Resident Evil 2 (1998): IGDB 880, 1998-01-21, 0 owned copies; https://www.igdb.com/games/resident-evil-2
- DOOM (1993): IGDB 673, 1993-12-10, 0 owned copies; https://www.igdb.com/games/doom
- Ninja Gaiden II (2008): IGDB 6782, 2008-06-03, 0 owned copies; https://www.igdb.com/games/ninja-gaiden-ii

## Series and franchise audit

Removed Wolverine → Marvel's Spider-Man series membership. Marvel, X-Men and Wolverine franchise hierarchy is retained. A canonical exclusion prevents reimport through both planner and database trigger.

All franchise links remain intact. Added membership_role with conservative unspecified default. Nickelodeon All-Star Brawl guest IPs are appearance links (Nickelodeon primary), MultiVersus IP links are crossover, and Capcom Arcade Stadium content IPs are appearances. Legitimate LEGO/licensed games, Mario/Rabbids and Mario/Donkey Kong crossovers, and franchise hierarchies remain untouched. Imported multiple franchise IDs never alone prove primary membership or a direct relationship.

## Backfill safeguards

Removed numbered-title sequel inference entirely. Names/suffixes only produce review proposals. Verified generation keys prevent cross-generation edition proposals. No shared-franchise direct-edge inference exists. Corrected canonical identities reuse narrowly verified ownership aliases with exact title/year and strong identifiers, in JS and SQL. A serialized database insert guard rejects duplicate compatible canonical creation rather than silently choosing a disputed identity. Historical targets receive no library links without an actual library entry. Rejected wrong relationships are suppressed for the current identifier fingerprint; material identifier changes remain reviewable.

Full identity backfill rerun created zero canonicals and zero mappings, and left zero pending reviews; its candidate count includes already-resolved/suppressed proposals, not new pending work.

## Manual semantic review (11 retained cases)

- S.T.A.L.K.E.R. 2: Cost of Hope → S.T.A.L.K.E.R. 2: Heart of Chornobyl: `expansion_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Ninja Gaiden 4: The Two Masters → Ninja Gaiden 4: `expansion_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- The Alters: Last Variable → The Alters: `expansion_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Doom: The Dark Ages - Revelations → DOOM: The Dark Ages: `expansion_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Ninja Gaiden Sigma 2 → Ninja Gaiden Sigma: `sequel_of` — Ninja Gaiden Sigma 2 -> Sigma: enhanced variants of different original installments. Existing edge may express chapter order; original-work-only chronology convention remains a manual decision.
- Monster Hunter Wilds: Ascendance → Monster Hunter Wilds: `expansion_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Mafia: The Old Country - Man of Honor → Mafia: The Old Country: `expansion_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Trails in the Sky 2nd Chapter → The Legend of Heroes: Trails in the Sky SC: `remake_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Nioh 3: Hell Rising → Nioh 3: `dlc_of` — Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.
- Road Trip: USA 2 West CE → Road Trip: USA: `edition_of` — Road Trip USA 2 West CE: IGDB version_parent points to the first Road Trip USA. Number/title and explicit catalog parent disagree; requires publisher confirmation.
- Yakuza Kiwami 2 → Yakuza Kiwami: `sequel_of` — Yakuza Kiwami 2 -> Kiwami: both are remakes of numbered original chapters. Existing sequel edge can express story/chapter order; decide whether the project should represent chronology only through original works.

These are documented outside the pending queue and have not been guessed or automatically reclassified. All 194 pre-cleanup edges have an individual disposition, endpoint catalog URLs and review notes in SEMANTIC_RELATIONSHIP_REVIEW.json. Preservation means no identified high-confidence defect, not independent publisher confirmation of every imported relationship.

## Validation

- Unit tests: 51/51 pass.
- Existing SQL integration suite: pass, transaction rolled back.
- Semantic SQL guard/checksum suite: pass, transaction rolled back.
- Existing HTTP regression suite: pass (12 canonical splits, 8 earlier type corrections).
- Authenticated HTTP integration suite: pass, synthetic canonical fixtures cleaned up; no existing games changed.
- Semantic HTTP suite: 17 corrected/revalidated edges and all historical pages/copy counts pass.
- Typecheck: pass.
- Lint: 0 errors, 42 pre-existing warnings.
- Production build: pass (Next.js 16.2.9). Network access was required for Google Fonts.

SQL integration exposed parameter shadowing in the new identity predicate; a separate corrective migration fixes it with positional title arguments. The entire suite passed after the fix.

## Inspecting and restoring canonical changes

Migrations: 20260916161119_game_semantic_cleanup, 20260916161910_semantic_identity_predicate_fix, 20260916162252_semantic_original_release_targets, 20260916162652_historical_identity_reuse. Both destructive canonical data migrations were rehearsed under rollback before application. The last migration adds verified historical names so future genuine ownership imports reuse the original identity rather than creating a duplicate because its display title includes a year. Private service-only game_semantic_cleanup_archive stores complete graph before-images and consolidation/historical creation records. Restore only canonical-layer records from those images in reverse migration order after verifying no intervening graph writes; restore original UUIDs, relationships, reviews, memberships and mappings, then remove newly created unreferenced historical identities. Never restore or modify games. Do not run a blanket graph replacement over later independent edits. JS/code commits can be reverted independently.
