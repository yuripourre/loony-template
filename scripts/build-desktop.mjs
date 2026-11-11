// `pnpm build:desktop`: bundles the game for Babylon Native and builds the desktop executable with
// the engine's host (../loony-engine/native/desktop). Output: build/desktop/<executableName>.
// Needs CMake and a C++20 compiler (and X11 development headers on Linux); the first build also
// downloads and compiles Babylon Native's dependencies, which takes a while.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engine = resolve(root, "../loony-engine");
const host = join(engine, "native/desktop");
const buildDir = join(root, "build/desktop");
const { loony } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const startMode = process.env.LOONY_START_MODE ?? "fps";

function run(command, args, options = {}) {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(join(engine, "native/external/BabylonNative/CMakeLists.txt"))) {
    console.error("Babylon Native is missing. In ../loony-engine run: git submodule update --init native/external/BabylonNative");
    process.exit(1);
}

run("pnpm", ["exec", "vite", "build", "--config", "vite.native.config.ts"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production", LOONY_START_MODE: startMode },
});
run("cmake", [
    "-S", host,
    "-B", buildDir,
    "-DCMAKE_BUILD_TYPE=Release",
    `-DLOONY_EXECUTABLE_NAME=${loony.executableName}`,
    `-DLOONY_GAME_TITLE=${loony.title}`,
    `-DLOONY_GAME_BUNDLE=${join(root, "dist-native/game.js")}`,
    `-DLOONY_GAME_ASSETS=${join(root, "public")}`,
]);
run("cmake", ["--build", buildDir, "--config", "Release", "--parallel"]);
console.log(`\nDesktop build ready: ${join(buildDir, loony.executableName)} (run it from that folder)`);
