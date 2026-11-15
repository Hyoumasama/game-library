import { registerHooks } from "node:module";
const mocks = new URL("./sources.mjs", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (["@/lib/supabase", "@/lib/server/hltb", "@/lib/server/metacritic", "next/headers"].includes(specifier)) return { url: mocks, shortCircuit: true };
  return next(specifier, context);
} });
