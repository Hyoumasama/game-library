import {readFileSync,writeFileSync}from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const before=read('data/relationships/semantic-before.json'),after=read('data/relationships/semantic-after.json');
const evidence=read('data/relationships/semantic-igdb.json');
const old=new Map(before.canonical_games.map(c=>[c.id,c])),current=new Map(after.canonical_games.map(c=>[c.id,c]));
const describe=(e,cs)=>({id:e.id,source:cs.get(e.source_game_id)?.title,target:cs.get(e.target_game_id)?.title,source_igdb:cs.get(e.source_game_id)?.igdb_id,target_igdb:cs.get(e.target_game_id)?.igdb_id,type:e.relation_type,notes:e.notes});
const ambiguous=new Map([
 [239952,'Road Trip USA 2 West CE: IGDB version_parent points to the first Road Trip USA. Number/title and explicit catalog parent disagree; requires publisher confirmation.'],
 [55090,'Yakuza Kiwami 2 -> Kiwami: both are remakes of numbered original chapters. Existing sequel edge can express story/chapter order; decide whether the project should represent chronology only through original works.'],
 [7385,'Ninja Gaiden Sigma 2 -> Sigma: enhanced variants of different original installments. Existing edge may express chapter order; original-work-only chronology convention remains a manual decision.'],
 ...[396025,404914,405075,404709,404700,411561,370951,377314].map(id=>[id,'Upcoming/recent catalog relationship retained from explicit imported metadata. Full publisher confirmation of exact package/parent remains outstanding; not approved anew by this cleanup.'])
]);
const removed=before.game_relationships.filter(e=>!after.game_relationships.some(x=>x.id===e.id)).map(e=>describe(e,old));
const added=after.game_relationships.filter(e=>!before.game_relationships.some(x=>x.id===e.id)).map(e=>describe(e,current));
const wrongFacts=removed.filter(e=>e.source_igdb!==143030);
const knownWrong=after.game_relationships.filter(e=>wrongFacts.some(w=>w.source_igdb===current.get(e.source_game_id)?.igdb_id&&w.target_igdb===current.get(e.target_game_id)?.igdb_id&&w.type===e.relation_type));
const duplicateOrphans=consolidatedCheck();
function consolidatedCheck(){return [89354,2955,10760,106534,106836,119308,141533,141540,152203,199116,208652,252851].filter(id=>after.canonical_games.filter(c=>c.igdb_id===id).length!==1);}
if(knownWrong.length||duplicateOrphans.length)throw new Error('Known semantic defects remain');
const changed=after.game_relationships.filter(e=>before.game_relationships.some(x=>x.id===e.id&&JSON.stringify(e)!==JSON.stringify(x))).map(e=>describe(e,current));
const ledger=before.game_relationships.map(e=>{
 const s=old.get(e.source_game_id),t=old.get(e.target_game_id),present=after.game_relationships.find(x=>x.id===e.id);
 const sourceEvidence=evidence.metadata.find(g=>g.id===s.igdb_id),targetEvidence=evidence.metadata.find(g=>g.id===t.igdb_id);
 return {...describe(e,old),disposition:!present?'removed_or_consolidated':ambiguous.has(s.igdb_id)?'manual_review':changed.some(x=>x.id===e.id)?'revalidated_after_metadata_correction':'preserved',
 review_note:ambiguous.get(s.igdb_id)||'Reviewed endpoint identity, release generation, direction and relationship meaning. No additional high-confidence semantic defect identified; preservation does not assert immediate narrative predecessor.',
 source_catalog_url:sourceEvidence?.url,target_catalog_url:targetEvidence?.url};
});
const consolidated=before.canonical_games.filter(c=>!current.has(c.id)).map(c=>({removed_id:c.id,title:c.title,igdb_id:c.igdb_id,steam_appid:c.steam_appid,survivor_id:after.canonical_games.find(x=>x.igdb_id===c.igdb_id&&x.steam_appid===c.steam_appid)?.id}));
const historical=after.canonical_games.filter(c=>!old.has(c.id)).map(c=>({id:c.id,title:c.title,igdb_id:c.igdb_id,release_date:c.release_date,metadata:c.metadata,owned_copies:after.game_identity_links.filter(l=>l.canonical_game_id===c.id).length}));
const cases=ledger.filter(e=>e.disposition==='manual_review');
const report={before_counts:before.audit.counts,after_counts:after.audit.counts,known_wrong_relationships:knownWrong.length,remaining_listed_duplicate_canonicals:duplicateOrphans.length,games_sha256_before:before.games_checksum,games_sha256_after:after.games_checksum,games_preserved:before.games_checksum===after.games_checksum&&after.games.length===2234,removed_relationships:removed,added_relationships:added,revalidated_relationships:changed,consolidated,historical,ambiguous_cases:cases,ledger};
writeFileSync('docs/SEMANTIC_RELATIONSHIP_REVIEW.json',JSON.stringify(report,null,2));
const row=e=>`- ${e.source} → ${e.target}: \`${e.type}\``;
const text=`# Semantic cleanup — 2026-09-16

Supabase project: odohyafmagygisgvonch. No existing games row was changed or removed.

| Metric | Before | After |
|---|---:|---:|
| Library rows | ${before.games.length} | ${after.games.length} |
| Canonical games | ${before.canonical_games.length} | ${after.canonical_games.length} |
| Directed relationships | ${before.game_relationships.length} | ${after.game_relationships.length} |
| Canonicals without ownership | ${before.audit.counts.canonical_games_without_library_entries} | ${after.audit.counts.canonical_games_without_library_entries} |
| Pending reviews | ${before.audit.counts.pending_reviews} | ${after.audit.counts.pending_reviews} |
| Canonical duplicates consolidated | — | ${consolidated.length} |
| Historical identities created | — | ${historical.length} |

All integrity counts for missing identities, duplicate mappings/edges/review candidates, self edges, inverse conflicts, conflicting types, broken foreign keys, suspicious merges and orphan records are zero. Known wrong generation/type facts and all twelve listed duplicate canonical groups are zero. The ${historical.length} unowned historical targets are intentional, and HTTP tests verify zero owned copies.

## Ownership preservation

All-row SHA-256 before and after: \`${after.games_checksum}\`.
PostgreSQL all-row JSON MD5 before and after: \`7895409b9f210c42f80dfc80d85f8c26\`.
Both data migrations assert the exact 2,234-row baseline and checksum inside their transactions; an independent paginated snapshot checks all columns afterwards.

## Removed relationships (${removed.length})

${removed.map(row).join('\n')}

## Added relationships (${added.length})

${added.map(row).join('\n')}

## Revalidated endpoints

Hexen Deathkings already targeted IGDB 3512 / Steam 2360, the owned Hexen identity whose canonical title was incorrectly Heretic: Beyond Heretic. Corrected canonical title to Hexen: Beyond Heretic; ownership text is unchanged. No extra historical Hexen identity was needed.

Anniversary already targeted IGDB 912 / Steam 224960, original Tomb Raider 1996, whose canonical date incorrectly said 2013. Corrected canonical date to 1996-10-24 and revalidated remake edge. The genuinely wrong GOTY 2013 edition target was redirected to a new historical 2013 reboot identity.

Miles Morales uses sequel_of for its standalone direct narrative continuation of Spider-Man 2018, following the project's source-to-predecessor convention. It is not an expansion. [PlayStation](https://www.playstation.com/en-us/games/marvels-spider-man-miles-morales/).
Thronebreaker uses spinoff_of for its independent RPG adaptation of GWENT mechanics, with its Witcher memberships retained. [Publisher](https://www.thewitcher.com/en/thronebreaker-witchertales).
Ground Zeroes uses prologue_of, consistent with Konami's prologue/main-story distinction. [Konami](https://www.konami.com/mg/mgs5/gz/jp/index.php).

Silent Hill retains original SH2 → SH1 and SH3 → original SH2 as installment release order. These edges do not claim immediate plot continuity: SH3's narrative continues SH1. The 2024 remake has only remake_of to SH2 2001 in this chain, and is never represented as a new sequel.

Additional corrections separate Resident Evil 2 2019 from original 1998 and FF I–III Pixel Remasters from Japanese originals (including Western-renumbering collisions). Metroid Prime Remastered targets GameCube 2002 instead of Wii 2009 ([Nintendo](https://www.nintendo.com/us/whatsnew/metroid-prime-remastered-rolled-out-in-latest-nintendo-direct-available-now-for-nintendo-switch/)). Ninja Gaiden II Black targets original 2008 instead of Sigma 2 2009 ([KOEI TECMO](https://www.koeitecmoamerica.com/news/team-ninjas-iconic-hero-ryu-hayabusa-returns-in-the-stunning-action-game-ninja-gaiden-2-black-now-available/)); Master Collection component edges are retained. Publisher evidence takes precedence over the conflicting IGDB parent. Tannenberg's existing standalone_expansion_of is preserved because the original developer announcement explicitly uses that classification ([announcement](https://store.steampowered.com/news/posts/?appids=242860&enddate=1495663257)).

## Consolidated canonicals (${consolidated.length})

${consolidated.map(c=>`- ${c.title}: IGDB ${c.igdb_id}, Steam ${c.steam_appid}; ${c.removed_id} → ${c.survivor_id}`).join('\n')}

Owned canonical survives in every case. Eleven orphan duplicates had no ownership, relationships or taxonomy memberships; Supraland's duplicate expansion edge was deduplicated. Review endpoints are rehomed where representable, with rejection precedence preserved; collapsed self-review history stays in the private before-image archive. Supraland release date is corrected to its original PC release, 2019-04-05; verified ownership aliases preserve library console-release metadata.

## Historical identities (${historical.length})

${historical.map(c=>`- ${c.title}: IGDB ${c.igdb_id}, ${c.release_date}, 0 owned copies; ${c.metadata.evidence_url}`).join('\n')}

## Series and franchise audit

Removed Wolverine → Marvel's Spider-Man series membership. Marvel, X-Men and Wolverine franchise hierarchy is retained. A canonical exclusion prevents reimport through both planner and database trigger.

All franchise links remain intact. Added membership_role with conservative unspecified default. Nickelodeon All-Star Brawl guest IPs are appearance links (Nickelodeon primary), MultiVersus IP links are crossover, and Capcom Arcade Stadium content IPs are appearances. Legitimate LEGO/licensed games, Mario/Rabbids and Mario/Donkey Kong crossovers, and franchise hierarchies remain untouched. Imported multiple franchise IDs never alone prove primary membership or a direct relationship.

## Backfill safeguards

Removed numbered-title sequel inference entirely. Names/suffixes only produce review proposals. Verified generation keys prevent cross-generation edition proposals. No shared-franchise direct-edge inference exists. Corrected canonical identities reuse narrowly verified ownership aliases with exact title/year and strong identifiers, in JS and SQL. A serialized database insert guard rejects duplicate compatible canonical creation rather than silently choosing a disputed identity. Historical targets receive no library links without an actual library entry. Rejected wrong relationships are suppressed for the current identifier fingerprint; material identifier changes remain reviewable.

Full identity backfill rerun created zero canonicals and zero mappings, and left zero pending reviews; its candidate count includes already-resolved/suppressed proposals, not new pending work.

## Manual semantic review (${cases.length} retained cases)

${cases.map(e=>`${row(e)} — ${e.review_note}`).join('\n')}

These are documented outside the pending queue and have not been guessed or automatically reclassified. All ${ledger.length} pre-cleanup edges have an individual disposition, endpoint catalog URLs and review notes in SEMANTIC_RELATIONSHIP_REVIEW.json. Preservation means no identified high-confidence defect, not independent publisher confirmation of every imported relationship.

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
`;
writeFileSync('docs/SEMANTIC_CLEANUP.md',text);
console.log(JSON.stringify({removed:removed.length,added:added.length,consolidated:consolidated.length,historical:historical.length,manual_cases:cases.length,preserved:report.games_preserved}));
