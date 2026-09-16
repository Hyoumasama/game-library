# Final relationship integrity audit

Snapshot: 2026-09-16T11:20:29.777187+00:00

| Check | Count |
| --- | --- |
| relationships | 199 |
| canonical_games | 2027 |
| library_entries | 2234 |
| pending_reviews | 0 |
| rejected_reviews | 8 |
| resolved_reviews | 2 |
| duplicate_mappings | 0 |
| self_relationships | 0 |
| stale_pending_reviews | 0 |
| duplicate_relationships | 0 |
| suspicious_merge_groups | 12 |
| pending_already_resolved | 0 |
| pending_identity_reviews | 0 |
| duplicate_review_candidates | 0 |
| owner_verified_relationships | 4 |
| pending_relationship_reviews | 0 |
| conflicting_relationship_pairs | 6 |
| library_entries_without_identity | 0 |
| canonical_games_without_library_entries | 25 |

Unused canonical records are retained historical identities, not deleted. Conflicting classifications and suspicious merges are review findings, not automatic corrections. No existing games rows were deleted, merged or rewritten.

## Remaining non-queue findings

- Historical canonical without library copies: Dishonored: Definitive Edition (78d5a35e-2769-4175-a886-83905105a8e1)
- Historical canonical without library copies: The Talos Principle: Gold Edition (11b2cd36-ac1e-4960-a058-f0ee261530d1)
- Historical canonical without library copies: Star Wars Battlefront II: Celebration Edition (951e5ecd-429c-4747-a3ff-254c69acf917)
- Historical canonical without library copies: Kingdom Come: Deliverance Royal Edition (cdef623a-3ab9-48e0-aa45-60ffa53986e0)
- Historical canonical without library copies: Disco Elysium: The Final Cut (ae767440-f488-4d35-aa26-9776ae55bd72)
- Historical canonical without library copies: Bloodstained: Ritual of the Night (a151eb8b-c49e-4432-af33-4d8177482640)
- Historical canonical without library copies: Middle-earth: Shadow of War (01f89355-86a2-4067-aa80-7882b1593e4d)
- Historical canonical without library copies: Elite Dangerous (9a6d23a1-4025-477a-a4f3-a121f3080455)
- Historical canonical without library copies: Enslaved: Odyssey to the West Premium Edition (604851d7-2039-4d06-a456-9f23ffb063b8)
- Historical canonical without library copies: Trek to Yomi (d113419d-be1e-48b3-a57f-482794159144)
- Historical canonical without library copies: Supraland (6f17a6b3-a047-4868-a3bf-c3bb0a56626e)
- Historical canonical without library copies: Loop Hero (a22411ea-83b8-42b6-aaa7-71e74194c311)
- Historical canonical without library copies: Sundered (08ed51c9-f170-4801-a7c0-0aeed4e564ef)
- Historical canonical without library copies: Dark Deity: Complete Edition (cdf33c48-030b-4972-ad94-f5fb7a20b7d0)
- Historical canonical without library copies: Sid Meier's Civilization VI: Platinum Edition (596719c7-9c37-4e57-a347-4aa84276cf42)
- Historical canonical without library copies: Styx: Shards of Darkness - Deluxe Edition (2df3b9cc-b64d-4478-ab51-dbc58a89807d)
- Historical canonical without library copies: Ghostwire Tokyo (f93032c8-d5d3-4b61-a698-5977d3b9f3cb)
- Historical canonical without library copies: Stellar Blade (DEMO) (5a878d88-6bf4-42aa-ae5d-808e49ca7631)
- Historical canonical without library copies: Gravity Circuit (df8f2092-8764-4a4f-a513-b36451533075)
- Historical canonical without library copies: Brotato (77c9f6f2-bfa5-42a4-a7e3-f9d81a9557f9)
- Historical canonical without library copies: SCARF (3c9c2b8d-ebc5-4f04-a2d0-777eaf56f381)
- Historical canonical without library copies: Ori and the Blind Forest (9644767f-ff7c-4023-aae9-340e940e86c3)
- Historical canonical without library copies: Naheulbeuk's Dungeon Master (b5ab0ba0-c517-4130-a970-477b453955d3)
- Historical canonical without library copies: Havendock (525e77ad-ade5-437f-af66-a63d64331ac7)
- Historical canonical without library copies: Agony (14b6b8b1-0351-4a9f-acd1-fccbf915c64e)
- Potential relationship conflict: Mafia: Definitive Edition -> Mafia: remake_of / edition_of
- Potential relationship conflict: Little Nightmares Enhanced Edition -> Little Nightmares: remaster_of / enhanced_edition_of
- Potential relationship conflict: The Outer Worlds: Spacer's Choice Edition -> The Outer Worlds: remaster_of / edition_of
- Potential relationship conflict: Mafia II: Definitive Edition -> Mafia II: edition_of / remaster_of
- Potential relationship conflict: Hard Reset Redux -> Hard Reset: edition_of / remaster_of
- Potential relationship conflict: Metro Last Light Redux -> Metro: Last Light: remaster_of / edition_of
- Suspicious identity mapping: Kingdom Come: Deliverance (14ac509b-c6ed-45bd-aa49-b6c1c9db2c99)
- Suspicious identity mapping: Sundered: Eldritch Edition (1db19308-ed32-4228-a1d5-4515f977696e)
- Suspicious identity mapping: Star Wars Battlefront II (2b6825c6-3b67-40a9-a01e-d7c0b489356b)
- Suspicious identity mapping: Ori and the Blind Forest: Definitive Edition (2d5c0532-54fc-47ff-ac66-daff2ceabd2b)
- Suspicious identity mapping: Styx: Shards of Darkness (4456332e-5f08-4f6a-abd8-b02cc06540d6)
- Suspicious identity mapping: The Talos Principle (5505356c-b297-44be-ab4a-91d6521fecdb)
- Suspicious identity mapping: Stellar Blade (DEMO) (7c4e4e1d-61ce-448f-a911-97b9779c126b)
- Suspicious identity mapping: Sid Meier's Civilization VI (8e2b6427-fbd3-4f90-aec1-4ceecc6ec994)
- Suspicious identity mapping: ENSLAVED: Odyssey to the West  (9d311a45-6646-4543-a4ed-fad2aec8f83e)
- Suspicious identity mapping: Dark Deity (d0d2ddf3-ee6b-4358-abac-293a4655e26f)
- Suspicious identity mapping: Middle-earth: Shadow of War - Definitive Edition (d4973355-99a2-4d3c-af06-1fbea68c3de4)
- Suspicious identity mapping: Dishonored (fe68a1d9-4f0a-4c76-a911-f0b30a5e25db)

The full evidence and all pending cases are in [RELATIONSHIP_INTEGRITY_AUDIT.json](RELATIONSHIP_INTEGRITY_AUDIT.json). Queue cases can be decided at /admin/relationships.
