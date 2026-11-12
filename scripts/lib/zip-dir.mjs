import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { commandOnPath, run } from "./run.mjs";

/**
 * Create a zip of sourceDir at releaseDir/<zipBaseName>.zip (contents at archive root).
 */
export function zipDirectory(sourceDir, releaseDir, zipBaseName) {
    if (!commandOnPath("zip")) {
        console.error("The zip command is not on PATH (install zip, e.g. dnf install zip).");
        process.exit(1);
    }
    mkdirSync(releaseDir, { recursive: true });
    const zipPath = join(releaseDir, `${zipBaseName}.zip`);
    const parent = dirname(sourceDir);
    const folderName = basename(sourceDir);
    run("zip", ["-r", zipPath, folderName], { cwd: parent, shell: false });
    return zipPath;
}
