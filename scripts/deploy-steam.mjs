// `pnpm deploy:steam`: stage desktop builds and upload Steam depots with steamcmd.
//
//   pnpm deploy:steam              stage Windows + Linux and run steamcmd
//   pnpm deploy:steam --build      build desktop targets first
//   pnpm deploy:steam --windows      Windows depot only
//   pnpm deploy:steam --linux        Linux depot only
//   pnpm deploy:steam --dry-run      stage + print steamcmd command only
//
// Set loony.steam in package.json. Env: STEAM_USERNAME, STEAM_PASSWORD, optional STEAM_GUARD_CODE, STEAMCMD.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertSteamConfig, loadLoonyConfig } from "./lib/loony-config.mjs";
import { commandOnPath, run } from "./lib/run.mjs";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const doBuild = argv.includes("--build");
const flags = new Set(argv.filter((a) => a.startsWith("--") && a !== "--dry-run" && a !== "--build"));

const wantWindows = flags.has("--windows") || flags.size === 0;
const wantLinux = flags.has("--linux") || flags.size === 0;

const { root, loony } = loadLoonyConfig();
const steam = assertSteamConfig(loony);

const windowsBuildDir = join(root, "build/desktop-windows");
const linuxBuildDir = join(root, "build/desktop");
const steamDir = join(root, "steam");
const stagingDir = join(steamDir, "staging");
const generatedDir = join(steamDir, "generated");
const outputDir = join(steamDir, "output");
const templatesDir = steamDir;

const TOKEN_APP_ID = "@@APP_ID@@";
const TOKEN_DEPOT_WINDOWS = "@@DEPOT_WINDOWS@@";
const TOKEN_DEPOT_LINUX = "@@DEPOT_LINUX@@";

function substituteTokens(text, replacements) {
    let out = text;
    for (const [token, value] of Object.entries(replacements)) {
        out = out.split(token).join(value);
    }
    return out;
}

function stripTemplateComments(text) {
    return text.replace(/^\/\/.*\n/m, "");
}

function copyTemplate(name, replacements) {
    const raw = readFileSync(join(templatesDir, name), "utf8");
    const text = stripTemplateComments(raw);
    return substituteTokens(text, replacements);
}

function assertDesktopBuild(dir, exeName, label) {
    const exePath = join(dir, label === "windows" ? `${exeName}.exe` : exeName);
    if (!existsSync(dir) || !existsSync(exePath)) {
        console.error(`Missing ${label} desktop build at ${dir} (expected ${exePath}). Run build first or pass --build.`);
        process.exit(1);
    }
}

function stageFolder(sourceDir, targetDir) {
    rmSync(targetDir, { recursive: true, force: true });
    mkdirSync(targetDir, { recursive: true });
    for (const entry of readdirSync(sourceDir)) {
        cpSync(join(sourceDir, entry), join(targetDir, entry), { recursive: true });
    }
}

function buildIfNeeded() {
    if (wantWindows) run("pnpm", ["run", "build:desktop:windows"], { cwd: root });
    if (wantLinux) run("pnpm", ["run", "build:desktop"], { cwd: root });
}

function writeGeneratedVdfs() {
    const replacements = {
        [TOKEN_APP_ID]: steam.appId,
        [TOKEN_DEPOT_WINDOWS]: steam.depots.windows,
        [TOKEN_DEPOT_LINUX]: steam.depots.linux,
    };

    rmSync(generatedDir, { recursive: true, force: true });
    mkdirSync(generatedDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    if (wantWindows) {
        writeFileSync(
            join(generatedDir, "depot_build_windows.vdf"),
            copyTemplate("depot_build_windows.vdf", replacements)
        );
    }
    if (wantLinux) {
        writeFileSync(
            join(generatedDir, "depot_build_linux.vdf"),
            copyTemplate("depot_build_linux.vdf", replacements)
        );
    }

    let depotsBlock = "";
    if (wantWindows) {
        depotsBlock += `\t\t"${steam.depots.windows}" "depot_build_windows.vdf"\n`;
    }
    if (wantLinux) {
        depotsBlock += `\t\t"${steam.depots.linux}" "depot_build_linux.vdf"\n`;
    }

    const appBuild = `"AppBuild"
{
\t"appid" "${steam.appId}"
\t"desc" "Loony game build"
\t"buildoutput" "../output"
\t"contentroot" ""
\t"setlive" ""
\t"preview" "0"
\t"local" ""
\t"depots"
\t{
${depotsBlock}\t}
}
`;
    writeFileSync(join(generatedDir, "app_build.vdf"), appBuild);
}

function resolveSteamcmd() {
    if (process.env.STEAMCMD) {
        if (!existsSync(process.env.STEAMCMD)) {
            console.error(`STEAMCMD path does not exist: ${process.env.STEAMCMD}`);
            process.exit(1);
        }
        return process.env.STEAMCMD;
    }
    if (!commandOnPath("steamcmd")) {
        console.error("steamcmd is not on PATH. Install from https://developer.valvesoftware.com/wiki/SteamCMD or set STEAMCMD.");
        process.exit(1);
    }
    return "steamcmd";
}

if (doBuild) buildIfNeeded();

if (wantWindows) assertDesktopBuild(windowsBuildDir, loony.executableName, "windows");
if (wantLinux) assertDesktopBuild(linuxBuildDir, loony.executableName, "linux");

if (wantWindows) stageFolder(windowsBuildDir, join(stagingDir, "windows"));
if (wantLinux) stageFolder(linuxBuildDir, join(stagingDir, "linux"));

writeGeneratedVdfs();

const appBuildVdf = join(generatedDir, "app_build.vdf");
const loginArgs = [
    "+login",
    process.env.STEAM_USERNAME ?? "<STEAM_USERNAME>",
    process.env.STEAM_PASSWORD ?? "<STEAM_PASSWORD>",
];
if (process.env.STEAM_GUARD_CODE) {
    loginArgs.push("+set_steam_guard_code", process.env.STEAM_GUARD_CODE);
}
const steamArgs = [...loginArgs, "+run_app_build", appBuildVdf, "+quit"];
const steamcmdBin = process.env.STEAMCMD ?? "steamcmd";

console.log(`\n> ${steamcmdBin} ${steamArgs.join(" ")}`);

if (dryRun) {
    console.log("\nDry run: staging and VDFs are ready; steamcmd was not started.");
    process.exit(0);
}

if (!process.env.STEAM_USERNAME || !process.env.STEAM_PASSWORD) {
    console.error("Set STEAM_USERNAME and STEAM_PASSWORD for steamcmd login.");
    process.exit(1);
}

const steamcmd = resolveSteamcmd();
run(steamcmd, [
    "+login",
    process.env.STEAM_USERNAME,
    process.env.STEAM_PASSWORD,
    ...(process.env.STEAM_GUARD_CODE ? ["+set_steam_guard_code", process.env.STEAM_GUARD_CODE] : []),
    "+run_app_build",
    appBuildVdf,
    "+quit",
], { cwd: generatedDir, shell: false });
console.log(`\nSteam build output: ${outputDir}`);
