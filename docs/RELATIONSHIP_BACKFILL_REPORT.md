# Relationship backfill report

Snapshot: 2026-09-16T09:26:20.475Z

- owned_rows: 2234
- canonical_created: 2027
- linked_rows: 2234
- logical_duplicate_copies: 207
- relationship_candidates: 196
- automatically_accepted: 75
- manual_review: 155
- identity_review: 34
- relationship_review: 121
- series: 525
- franchises: 225
- versions: 90

All existing ownership rows remain in games. The 207 additional copies share canonical identities logically. No ownership rows were deleted or merged. Canonical count is the current created total; rerunning backfill creates zero additional identities. Candidate counts combine unique verified facts and review proposals, avoiding counting an automatically resolved review twice.

## Identity decisions still required

Shared Steam IDs can describe bundles, editions, demos, or incorrect metadata. Approve only if these are the same release identity. Use edition/remaster/collection relationships instead when appropriate.

| Source | Target | IGDB source / target | Steam source / target |
| --- | --- | --- | --- |
| Ghostwire Tokyo | Ghostwire Tokyo | 119308 / 119308 | 1475810 / 1475810 |
| Star Wars Battlefront II: Celebration Edition | Star Wars Battlefront II | 26401 / 26401 | 1237950 / 1237950 |
| Hell Is Us | Hell is Us (DEMO) | 196954 / 196954 | 1620730 / 1620730 |
| Kingdom Come: Deliverance Royal Edition | Kingdom Come: Deliverance | 4843 / 4843 | 379430 / 379430 |
| F.E.A.R. | F.E.A.R. Extraction Point | 517 / 518 | 21090 / 21090 |
| Agony | Agony UNRATED | 19453 / 19453 | 487720 / 487720 |
| Gravity Circuit | Gravity Circuit | 106534 / 106534 | 858710 / 858710 |
| The Talos Principle: Gold Edition | The Talos Principle | 7386 / 7386 | 257510 / 257510 |
| Styx: Shards of Darkness - Deluxe Edition | Styx: Shards of Darkness | 13554 / 13554 | 355790 / 355790 |
| Valor Mortis | Valor Mortis (Playtest) | 361833 / 361833 | 2828710 / 2828710 |
| Endless Legend: Definitive Edition | Endless Legend | 9278 / 9278 | 289130 / 289130 |
| SCARF | SCARF | 106836 / 106836 | 645320 / 645320 |
| Dark Deity: Complete Edition | Dark Deity | 147215 / 147215 | 1374840 / 1374840 |
| Disco Elysium: The Final Cut | Disco Elysium: The Final Cut | 141540 / 141540 | 632470 / 632470 |
| GRIME: Definitive Edition | GRIME | 121295 / 121295 | 1123050 / 1123050 |
| Middle-earth: Shadow of War | Middle-earth: Shadow of War - Definitive Edition | 27421 / 27421 | 356190 / 356190 |
| Bloodstained: Ritual of the Night | Bloodstained: Ritual of the Night | 10760 / 10760 | 692850 / 692850 |
| Elite Dangerous | Elite Dangerous | 2955 / 2955 | 359320 / 359320 |
| Brotato | Brotato | 199116 / 199116 | 1942280 / 1942280 |
| Ori and the Blind Forest | Ori and the Blind Forest: Definitive Edition | 7344 / 7344 | 261570 / 261570 |
| Naheulbeuk's Dungeon Master | Naheulbeuk's Dungeon Master | 252851 / 252851 | 2005160 / 2005160 |
| Loop Hero | Loop Hero | 141533 / 141533 | 1282730 / 1282730 |
| Ninja Gaiden: Master Collection | Ninja Gaiden Sigma | 143619 / 5974 | 1580780 / 1580780 |
| Enslaved: Odyssey to the West Premium Edition | ENSLAVED: Odyssey to the West  | 24192 / 2538 | 245280 / 245280 |
| Stellar Blade | Stellar Blade (DEMO) | 117170 / 117170 | 3489700 / 3489700 |
| F.E.A.R. Perseus Mandate | F.E.A.R. Extraction Point | 519 / 518 | 21090 / 21090 |
| Stellar Blade | Stellar Blade (DEMO) | 117170 / 117170 | 3489700 / 3489700 |
| Dishonored: Definitive Edition | Dishonored | 533 / 533 | 205100 / 205100 |
| Havendock | Havendock | 208652 / 208652 | 2020710 / 2020710 |
| Sid Meier's Civilization VI: Platinum Edition | Sid Meier's Civilization VI | 19130 / 19130 | 289070 / 289070 |
| Stellar Blade (DEMO) | Stellar Blade (DEMO) | 117170 / 117170 | 3489700 / 3489700 |
| Trek to Yomi | Trek to Yomi | 152203 / 152203 | 1370050 / 1370050 |
| Sundered | Sundered: Eldritch Edition | 24428 / 113102 | 535480 / 535480 |
| Supraland | Supraland | 89354 / 89354 | 813630 / 813630 |

All pending identity and relationship proposals are listed in [RELATIONSHIP_REVIEW_CANDIDATES.json](RELATIONSHIP_REVIEW_CANDIDATES.json). Resolve them at /admin/relationships.
