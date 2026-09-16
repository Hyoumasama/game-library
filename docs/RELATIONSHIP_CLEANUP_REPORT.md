# Final relationship cleanup

All 2,234 existing games rows were preserved, including every column. No game row was deleted, merged or rewritten. Four reproducible migrations beginning 20260916113610 apply the canonical splits, relationship corrections, audit expansion/performance fix and verified review decisions.

## Before / after

| Check | Before | After |
| --- | --- | --- |
| relationships | 199 | 194 |
| canonical_games | 2027 | 2027 |
| library_entries | 2234 | 2234 |
| pending_reviews | 0 | 0 |
| rejected_reviews | 8 | 56 |
| resolved_reviews | 2 | 26 |
| duplicate_mappings | 0 | 0 |
| self_relationships | 0 | 0 |
| broken_foreign_keys | Not recorded | 0 |
| demo_full_game_merges | Not recorded | 0 |
| stale_pending_reviews | 0 | 0 |
| duplicate_relationships | 0 | 0 |
| suspicious_merge_groups | 12 | 0 |
| orphan_canonical_records | Not recorded | 0 |
| pending_already_resolved | 0 | 0 |
| pending_identity_reviews | 0 | 0 |
| duplicate_review_candidates | 0 | 0 |
| owner_verified_relationships | 4 | 4 |
| pending_relationship_reviews | 0 | 0 |
| conflicting_relationship_pairs | 6 | 0 |
| duplicate_edition_remaster_links | Not recorded | 0 |
| library_entries_without_identity | 0 | 0 |
| conflicting_inverse_relationships | Not recorded | 0 |
| collection_component_identity_mistakes | Not recorded | 0 |
| canonical_games_without_library_entries | 25 | 12 |

New audit dimensions have no earlier recorded SQL count. All are zero after cleanup. Canonical count remained 2,027: required identities were already retained and could be reused. Twelve canonical records remain without library entries, but have graph, taxonomy or review history; zero are orphan records. No remaining case requires manual identity/relationship review.

## Every canonical separation

All twelve requested pairs now use separate canonical identities; every existing canonical ID and its graph history was preserved. Package editions use edition_of; substantive enhanced releases use enhanced_edition_of.

| Variant | Base | Specific relationship |
| --- | --- | --- |
| Enslaved Premium Edition | ENSLAVED: Odyssey to the West | edition_of |
| Sundered: Eldritch Edition | Sundered | enhanced_edition_of |
| Battlefront II: Celebration Edition | Battlefront II (2017) | edition_of |
| Dishonored: Definitive Edition | Dishonored | edition_of |
| The Talos Principle: Gold Edition | The Talos Principle | edition_of |
| Agony UNRATED | Agony | enhanced_edition_of |
| Dark Deity: Complete Edition | Dark Deity | edition_of |
| Kingdom Come: Deliverance Royal Edition | Kingdom Come: Deliverance | edition_of |
| Shadow of War Definitive Edition | Shadow of War | edition_of |
| Ori and the Blind Forest: Definitive Edition | Ori and the Blind Forest | enhanced_edition_of |
| Civilization VI: Platinum Edition | Civilization VI | edition_of |
| Styx: Shards of Darkness Deluxe Edition | Styx: Shards of Darkness | edition_of |

No same-identity exception was retained. [Thunder Lotus confirms Sundered Eldritch Edition was a free PC/PS4 update](https://thunderlotusgames.com/press-releases/sundered-news-12-21-2018/) adding co-op, areas and a boss. The rows carry different historical release identifiers (IGDB 24428 / 113102), so the canonical layer preserves the original 2017 release and its enhanced version. This does not assert that the update required a second purchase. [Xbox documents Ori Definitive Edition's new areas and abilities](https://news.xbox.com/en-us/2016/03/09/ori-blind-forest-definitive-edition-launch-trailer/?ver=3.7.1), supporting enhanced_edition_of. [Agony's publisher announcement links a separate UNRATED Steam title](https://store.steampowered.com/news/posts/?appgroupname=Agony&appids=487720&enddate=1540915256&feed=steam_community_announcements).

External identifiers on ownership records were preserved even where they describe the base rather than an edition. They remain non-unique in canonical metadata and cannot alone collapse release identities.

## Every ownership mapping correction

Fifteen library links changed across the twelve groups. One additional Stellar Blade demo link was restored to the matching 2025 canonical using exact title, IGDB and release year. Both dated demo identities and their owner-verified demo_of relationships remain intact. The 2005 Battlefront II copy stays distinct from the 2017 release despite punctuation-normalized titles matching.

| Game ID | Title | Previous canonical | Correct canonical |
| --- | --- | --- | --- |
| 370 | Star Wars Battlefront II: Celebration Edition | `2b6825c6-3b67-40a9-a01e-d7c0b489356b` | `951e5ecd-429c-4747-a3ff-254c69acf917` |
| 468 | Enslaved: Odyssey to the West Premium Edition | `9d311a45-6646-4543-a4ed-fad2aec8f83e` | `604851d7-2039-4d06-a456-9f23ffb063b8` |
| 727 | Middle-earth: Shadow of War | `d4973355-99a2-4d3c-af06-1fbea68c3de4` | `01f89355-86a2-4067-aa80-7882b1593e4d` |
| 756 | Sundered | `1db19308-ed32-4228-a1d5-4515f977696e` | `08ed51c9-f170-4801-a7c0-0aeed4e564ef` |
| 807 | Dishonored: Definitive Edition | `fe68a1d9-4f0a-4c76-a911-f0b30a5e25db` | `78d5a35e-2769-4175-a886-83905105a8e1` |
| 1403 | Dishonored: Definitive Edition | `fe68a1d9-4f0a-4c76-a911-f0b30a5e25db` | `78d5a35e-2769-4175-a886-83905105a8e1` |
| 1465 | Star Wars Battlefront II: Celebration Edition | `2b6825c6-3b67-40a9-a01e-d7c0b489356b` | `951e5ecd-429c-4747-a3ff-254c69acf917` |
| 1473 | Star Wars Battlefront II: Celebration Edition | `2b6825c6-3b67-40a9-a01e-d7c0b489356b` | `951e5ecd-429c-4747-a3ff-254c69acf917` |
| 1488 | Kingdom Come: Deliverance Royal Edition | `14ac509b-c6ed-45bd-aa49-b6c1c9db2c99` | `cdef623a-3ab9-48e0-aa45-60ffa53986e0` |
| 1501 | Ori and the Blind Forest | `2d5c0532-54fc-47ff-ac66-daff2ceabd2b` | `9644767f-ff7c-4023-aae9-340e940e86c3` |
| 1543 | The Talos Principle: Gold Edition | `5505356c-b297-44be-ab4a-91d6521fecdb` | `11b2cd36-ac1e-4960-a058-f0ee261530d1` |
| 1591 | Dark Deity: Complete Edition | `d0d2ddf3-ee6b-4358-abac-293a4655e26f` | `cdf33c48-030b-4972-ad94-f5fb7a20b7d0` |
| 1703 | Stellar Blade (DEMO) | `7c4e4e1d-61ce-448f-a911-97b9779c126b` | `5a878d88-6bf4-42aa-ae5d-808e49ca7631` |
| 1762 | Sid Meier's Civilization VI: Platinum Edition | `8e2b6427-fbd3-4f90-aec1-4ceecc6ec994` | `596719c7-9c37-4e57-a347-4aa84276cf42` |
| 1775 | Agony | `16cb4e9d-e561-4e96-a650-bdd24c0a69a9` | `14b6b8b1-0351-4a9f-acd1-fccbf915c64e` |
| 1980 | Styx: Shards of Darkness - Deluxe Edition | `4456332e-5f08-4f6a-abd8-b02cc06540d6` | `2df3b9cc-b64d-4478-ab51-dbc58a89807d` |

## Every relationship correction

- Half-Life 2 Episode One and Episode Two: keep episode_of, remove standalone_expansion_of.
- Hard Reset Redux: keep remaster_of, remove edition_of.
- Little Nightmares Enhanced Edition: keep enhanced_edition_of, remove remaster_of. [Bandai Namco specifies visual, lighting and performance enhancements](https://en.bandainamcoent.eu/little-nightmares/news/little-nightmares-enhanced-edition-delivers-high-resolution-scares-10).
- Mafia Definitive Edition: keep remake_of, remove edition_of.
- Mafia II Definitive Edition: keep remaster_of, remove edition_of.
- Metro Last Light Redux: keep remaster_of, remove edition_of.
- The Outer Worlds Spacer's Choice Edition: keep remaster_of, remove edition_of. [Take-Two explicitly describes it as remastered](https://ir.take2games.com/node/29466/pdf); its enhancements do not require a second parallel classification.
- Sundered Eldritch and Ori Definitive: replace generic edition_of with enhanced_edition_of.
- Add the missing Agony UNRATED enhanced_edition_of, Celebration Edition edition_of and Civilization VI Platinum Edition edition_of.

Ten redundant edge records were removed and five specific records added: 199 to 194 relationships. Removed-record evidence is retained in the snapshots and rejected review history.

| Source | Target | Removed classification |
| --- | --- | --- |
| Half-Life 2: Episode One | Half-Life 2 | standalone_expansion_of |
| Sundered: Eldritch Edition | Sundered | edition_of |
| Mafia II: Definitive Edition | Mafia II | edition_of |
| Hard Reset Redux | Hard Reset | edition_of |
| Mafia: Definitive Edition | Mafia | edition_of |
| Little Nightmares Enhanced Edition | Little Nightmares | remaster_of |
| Ori and the Blind Forest: Definitive Edition | Ori and the Blind Forest | edition_of |
| Half-Life 2: Episode Two | Half-Life 2 | standalone_expansion_of |
| Metro Last Light Redux | Metro: Last Light | edition_of |
| The Outer Worlds: Spacer's Choice Edition | The Outer Worlds | edition_of |

Five unreferenced edition descriptors incorrectly placed on base identities (Dishonored, Talos Principle, Kingdom Come, Dark Deity and Styx) were retired. No identity or ownership record was removed. Variant descriptors now belong to their correct identities; remaster/remake/enhanced descriptors match the corrected edges. Full before/after descriptor evidence is in RELATIONSHIP_CLEANUP_AFTER.json.

## Backfill and review safeguards

The JS planner and atomic ownership-insert trigger require full normalized title, meaningful marker signature, matching release year and compatible positive identifiers. Steam cannot override IGDB conflicts. Multiple equally matching canonicals require isolation/review. Existing manual mappings are preserved, but an incorrect mapping cannot pull a new edition copy into a base identity. Genuine copies of the same verified full release reuse a canonical even when another variant shares its IGDB ID.

All requested markers are tested. The audit also catches different edition titles sharing the same generic edition class and identifiers. Titles alone can generate review proposals, never automatic consolidation.

Discarded classifications have durable rejections tied to current semantic keys and identifier fingerprints. Explicitly rejected two new false proposals: Celebration Edition to Battlefront II (2005), and consolidation of the 2024/2025 Stellar Blade demos. Repeated real backfills create zero identities/links, preserve rejections and leave zero pending reviews. Generated proposal counts in a plan are not live pending queue counts; the database audit is authoritative.

Enrichment no longer removes or downgrades existing verified/manually curated relationships. All original series/franchise records and memberships are preserved; restored identities inherit memberships additively. Fifteen protected F.E.A.R./Dead Space/collection/demo/playtest relationships were compared byte-for-byte and preserved.

## Verification

- 46 unit tests passed, covering twenty meaningful marker cases, genuine copy reuse and reboot isolation.
- Rollback-only SQL integration tests passed, including all markers through the actual ownership trigger, inverse review deduplication, suppression and private audit permissions.
- Authenticated/unauthenticated HTTP smoke tests passed: canonical search, taxonomy, CRUD, queue, all four new types and idempotent existing-fact resolution.
- Read-only live HTTP checks passed for all twelve splits and eight corrections, including APIs and canonical pages.
- Typecheck and production build passed. Lint passed with zero errors and 42 existing warnings.
- REST integrity audit passes after materializing its core query once. No server timeout was increased.
- PostgreSQL full-row MD5 before/after: 7895409b9f210c42f80dfc80d85f8c26.
- Independent complete-row SHA-256 before/after: bfc99040dc279f60202c2acbeb27c7b4191c75f8ac5871ccfdda31f053cbcea3.

Security advisors found no new relationship-schema warnings. Existing unrelated function search-path/public-definer warnings remain outside this cleanup; [search-path remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [public-definer remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Private review/backfill tables intentionally have RLS with no client policies.

Read-only snapshots: node scripts/relationships/cleanup-snapshot.mjs before, then after. Raw snapshots are ignored under data/relationships and contain no credentials. Public evidence is in RELATIONSHIP_CLEANUP_BEFORE.json, RELATIONSHIP_CLEANUP_AFTER.json and RELATIONSHIP_INTEGRITY_AUDIT.json. Run node tests/relationships/cleanup-http.mjs with the production server on port 3001 and a current local after snapshot. Refresh relationships:audit and relationships:report after future decisions. Database migrations are additive/reviewable; reverting Git does not undo already-applied database changes.
