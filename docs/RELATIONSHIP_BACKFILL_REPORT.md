# Relationship backfill report

Snapshot: 2026-09-16T11:20:29.429Z

- owned_rows: 2234
- canonical_created: 2027
- linked_rows: 2234
- logical_duplicate_copies: 232
- relationship_candidates: 200
- automatically_accepted: 75
- manual_review: 0
- identity_review: 0
- relationship_review: 0
- series: 525
- franchises: 225
- versions: 95

All existing ownership rows remain in games. The 232 additional copies share canonical identities logically. No ownership rows were deleted or merged. Canonical count is the current created total; rerunning backfill creates zero additional identities. Candidate counts combine unique verified facts and review proposals, avoiding counting an automatically resolved review twice.

## Identity decisions still required

Shared Steam IDs can describe bundles, editions, demos, or incorrect metadata. Approve only if these are the same release identity. Use edition/remaster/collection relationships instead when appropriate.

| Source | Target | IGDB source / target | Steam source / target |
| --- | --- | --- | --- |


All pending identity and relationship proposals are listed in [RELATIONSHIP_REVIEW_CANDIDATES.json](RELATIONSHIP_REVIEW_CANDIDATES.json). Resolve them at /admin/relationships.
