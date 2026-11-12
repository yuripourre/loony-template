import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { commandOnPath, run } from "./run.mjs";

/**
 * Zip a .app bundle at bundlePath into releaseDir/<zipBaseName>.zip (archive contains the .app folder).
 */
export function zipAppBundle(bundlePath, releaseDir, zipBaseName) {
    if (!commandOnPath("zip")) {
        console.error("The zip command is not on PATH (install zip, e.g. dnf install zip).");
        process.exit(1);
    }
    mkdirSync(releaseDir, { recursive: true });
    const zipPath = join(releaseDir, `${zipBaseName}.zip`);
    const appBundleName = basename(bundlePath);
    run("zip", ["-r", zipPath, appBundleName], { cwd: dirname(bundlePath), shell: false });
    return zipPath;
}
