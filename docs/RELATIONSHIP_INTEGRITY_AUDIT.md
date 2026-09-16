# Final relationship integrity audit

Snapshot: 2026-09-16T11:52:07.051493+00:00

| Check | Count |
| --- | --- |
| relationships | 194 |
| canonical_games | 2027 |
| library_entries | 2234 |
| pending_reviews | 0 |
| rejected_reviews | 56 |
| resolved_reviews | 26 |
| duplicate_mappings | 0 |
| self_relationships | 0 |
| broken_foreign_keys | 0 |
| demo_full_game_merges | 0 |
| stale_pending_reviews | 0 |
| duplicate_relationships | 0 |
| suspicious_merge_groups | 0 |
| orphan_canonical_records | 0 |
| pending_already_resolved | 0 |
| pending_identity_reviews | 0 |
| duplicate_review_candidates | 0 |
| owner_verified_relationships | 4 |
| pending_relationship_reviews | 0 |
| conflicting_relationship_pairs | 0 |
| duplicate_edition_remaster_links | 0 |
| library_entries_without_identity | 0 |
| conflicting_inverse_relationships | 0 |
| collection_component_identity_mistakes | 0 |
| canonical_games_without_library_entries | 12 |

Unused canonical records are retained historical identities, not deleted. Conflicting classifications and suspicious merges are review findings, not automatic corrections. No existing games rows were deleted, merged or rewritten.

## Remaining non-queue findings

- Historical canonical without library copies: Disco Elysium: The Final Cut (ae767440-f488-4d35-aa26-9776ae55bd72)
- Historical canonical without library copies: Bloodstained: Ritual of the Night (a151eb8b-c49e-4432-af33-4d8177482640)
- Historical canonical without library copies: Elite Dangerous (9a6d23a1-4025-477a-a4f3-a121f3080455)
- Historical canonical without library copies: Trek to Yomi (d113419d-be1e-48b3-a57f-482794159144)
- Historical canonical without library copies: Supraland (6f17a6b3-a047-4868-a3bf-c3bb0a56626e)
- Historical canonical without library copies: Loop Hero (a22411ea-83b8-42b6-aaa7-71e74194c311)
- Historical canonical without library copies: Ghostwire Tokyo (f93032c8-d5d3-4b61-a698-5977d3b9f3cb)
- Historical canonical without library copies: Gravity Circuit (df8f2092-8764-4a4f-a513-b36451533075)
- Historical canonical without library copies: Brotato (77c9f6f2-bfa5-42a4-a7e3-f9d81a9557f9)
- Historical canonical without library copies: SCARF (3c9c2b8d-ebc5-4f04-a2d0-777eaf56f381)
- Historical canonical without library copies: Naheulbeuk's Dungeon Master (b5ab0ba0-c517-4130-a970-477b453955d3)
- Historical canonical without library copies: Havendock (525e77ad-ade5-437f-af66-a63d64331ac7)

Cleanup before/after counts, mapping corrections, checksum proof and tests are in [RELATIONSHIP_CLEANUP_REPORT.md](RELATIONSHIP_CLEANUP_REPORT.md).

The full evidence and all pending cases are in [RELATIONSHIP_INTEGRITY_AUDIT.json](RELATIONSHIP_INTEGRITY_AUDIT.json). Queue cases can be decided at /admin/relationships.
