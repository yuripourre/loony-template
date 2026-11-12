// `pnpm deploy:itch`: upload builds to itch.io with Butler.
//
//   pnpm deploy:itch                    web + Windows + Linux (default)
//   pnpm deploy:itch:web                web only
//   pnpm deploy:itch:desktop            desktop zips only
//   pnpm deploy:itch --build            build selected targets first
//   pnpm deploy:itch --dry-run          print planned butler push commands
//
// Needs butler on PATH and BUTLER_API_KEY set. Configure loony.itch in package.json.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { assertItchConfig, loadLoonyConfig } from "./lib/loony-config.mjs";
import { commandOnPath, run } from "./lib/run.mjs";
import { zipDirectory } from "./lib/zip-dir.mjs";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const doBuild = argv.includes("--build");
const flags = new Set(argv.filter((a) => a.startsWith("--") && a !== "--dry-run" && a !== "--build"));

const wantWeb = flags.has("--web") || flags.size === 0;
const wantWindows = flags.has("--windows") || flags.size === 0;
const wantLinux = flags.has("--linux") || flags.size === 0;

const { root, loony } = loadLoonyConfig();
const itch = assertItchConfig(loony);
const { channels } = itch;
const releaseDir = join(root, "build/release");
const distDir = join(root, "dist");
const windowsDir = join(root, "build/desktop-windows");
const linuxDir = join(root, "build/desktop");

function itchTarget(channel) {
    return `${itch.user}/${itch.game}:${channel}`;
}

function desktopExePath(dir, exeName, label) {
    return join(dir, label === "windows" ? `${exeName}.exe` : exeName);
}

function assertDesktopBuild(dir, exeName, label) {
    const exePath = desktopExePath(dir, exeName, label);
    if (!existsSync(dir) || !existsSync(exePath)) {
        console.error(`Missing ${label} desktop build at ${dir} (expected ${exePath}). Run build first or pass --build.`);
        process.exit(1);
    }
}

function buildIfNeeded() {
    if (wantWeb) run("pnpm", ["run", "build:web"], { cwd: root });
    if (wantWindows) run("pnpm", ["run", "build:desktop:windows"], { cwd: root });
    if (wantLinux) run("pnpm", ["run", "build:desktop"], { cwd: root });
}

function pushButler(source, target) {
    const args = ["push", source, target];
    if (dryRun) {
        console.log(`\n> butler ${args.join(" ")}`);
        return;
    }
    if (!commandOnPath("butler")) {
        console.error("butler is not on PATH. Install from https://itch.io/docs/butler/");
        process.exit(1);
    }
    if (!process.env.BUTLER_API_KEY) {
        console.error("Set BUTLER_API_KEY for non-interactive uploads.");
        process.exit(1);
    }
    run("butler", args, { cwd: root, shell: false });
}

if (doBuild) buildIfNeeded();

if (wantWeb) {
    if (!dryRun && !existsSync(join(distDir, "index.html"))) {
        console.error(`Missing web build at ${distDir}. Run pnpm build:web or pass --build.`);
        process.exit(1);
    }
    pushButler(distDir, itchTarget(channels.web));
}

if (wantWindows) {
    const zipPath = join(releaseDir, "desktop-windows.zip");
    if (dryRun) {
        pushButler(zipPath, itchTarget(channels.windows));
    } else {
        assertDesktopBuild(windowsDir, loony.executableName, "windows");
        pushButler(zipDirectory(windowsDir, releaseDir, "desktop-windows"), itchTarget(channels.windows));
    }
}

if (wantLinux) {
    const zipPath = join(releaseDir, "desktop-linux.zip");
    if (dryRun) {
        pushButler(zipPath, itchTarget(channels.linux));
    } else {
        assertDesktopBuild(linuxDir, loony.executableName, "linux");
        pushButler(zipDirectory(linuxDir, releaseDir, "desktop-linux"), itchTarget(channels.linux));
    }
}

if (!dryRun) {
    console.log("\nitch.io upload finished.");
}
