// Runs before `pnpm install`: the engine is a sibling checkout, not an npm package.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const engine = resolve(dirname(fileURLToPath(import.meta.url)), "../../loony-engine");
if (!existsSync(resolve(engine, "packages/loony/package.json"))) {
    console.error(
        `\nloony-engine was not found at ${engine}.\n` +
            "Clone it beside this project (both folders in the same parent), install it, then retry:\n\n" +
            "    git clone <loony-engine repository> ../loony-engine\n" +
            "    (cd ../loony-engine && pnpm install)\n"
    );
    process.exit(1);
}
if (!existsSync(resolve(engine, "node_modules"))) {
    console.error(`\nloony-engine at ${engine} is not installed yet. Run:\n\n    (cd ../loony-engine && pnpm install)\n`);
    process.exit(1);
}
