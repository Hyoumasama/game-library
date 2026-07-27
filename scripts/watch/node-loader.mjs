import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { extname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const serverOnlyShim = pathToFileURL(
  resolvePath(projectRoot, "node_modules/next/dist/compiled/server-only/empty.js")
).href;

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;

  const withoutAlias = specifier.slice(2);
  const absolutePath = resolvePath(projectRoot, withoutAlias);

  if (extname(absolutePath)) return absolutePath;
  if (existsSync(`${absolutePath}.ts`)) return `${absolutePath}.ts`;
  if (existsSync(`${absolutePath}.tsx`)) return `${absolutePath}.tsx`;
  if (existsSync(`${absolutePath}.js`)) return `${absolutePath}.js`;
  if (existsSync(`${absolutePath}.mjs`)) return `${absolutePath}.mjs`;

  return absolutePath;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        url: serverOnlyShim,
        shortCircuit: true,
      };
    }

    const aliasPath = resolveAlias(specifier);

    if (aliasPath) {
      return {
        url: pathToFileURL(aliasPath).href,
        shortCircuit: true,
      };
    }

    return nextResolve(specifier, context);
  },
});
