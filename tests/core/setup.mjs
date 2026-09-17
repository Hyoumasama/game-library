import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

registerHooks({
  resolve(specifier, context, next) {
    // CRUD tests run the real route handlers against an isolated in-memory client.
    if (context.parentURL?.includes("/app/api/admin/games/")) {
      if (specifier === "@/lib/supabase")
        return { url: pathToFileURL(resolve("tests/core/database.mjs")).href, shortCircuit: true };
      if (specifier === "@/lib/games")
        return { url: pathToFileURL(resolve("tests/core/database.mjs")).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(candidate)) return next(candidate.href, context);
    }
    return next(specifier, context);
  },
});
