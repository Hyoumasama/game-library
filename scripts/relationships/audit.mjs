import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data, error } = await client.rpc("audit_game_relationship_integrity");
if (error) throw new Error(error.message);
mkdirSync("docs", { recursive: true });
writeFileSync(
  "docs/RELATIONSHIP_INTEGRITY_AUDIT.json",
  JSON.stringify(data, null, 2),
);
const lines = Object.entries(data.counts)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n");
writeFileSync(
  "docs/RELATIONSHIP_INTEGRITY_AUDIT.md",
  `# Final relationship integrity audit\n\nSnapshot: ${data.snapshot_at}\n\n| Check | Count |\n| --- | --- |\n${lines}\n\nUnused canonical records are retained historical identities, not deleted. Conflicting classifications and suspicious merges are review findings, not automatic corrections. No existing games rows were deleted, merged or rewritten.\n\n## Remaining non-queue findings\n\n${[...data.unused_canonical.map((c) => `- Historical canonical without library copies: ${c.title} (${c.id})`), ...data.conflicting_relationships.map((c) => `- Potential relationship conflict: ${c.source} -> ${c.target}: ${c.first_type} / ${c.second_type}`), ...data.suspicious_merges.map((c) => `- Suspicious identity mapping: ${c.title} (${c.id})`)].join("\n") || "None."}\n\nThe full evidence and all pending cases are in [RELATIONSHIP_INTEGRITY_AUDIT.json](RELATIONSHIP_INTEGRITY_AUDIT.json). Queue cases can be decided at /admin/relationships.\n`,
);
console.log(JSON.stringify(data.counts, null, 2));
