// `pnpm build:desktop [--windows]`: bundles the game for Babylon Native and builds the desktop
// executable with the engine's host (../loony-engine/native/desktop).
//
//   pnpm build:desktop             for this computer (Linux, or Windows with Visual Studio)
//   pnpm build:desktop --windows   Windows .exe, cross-compiled from Linux (clang-cl + xwin)
//
// Output: build/desktop/ (or build/desktop-windows/) holding the executable, game.js and public/.
// Needs CMake and a C++20 compiler (on Linux also the X11 and JavaScriptCore development
// packages). The first build compiles Babylon Native and takes a while.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engine = resolve(root, "../loony-engine");
const host = join(engine, "native/desktop");
const { loony } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const startMode = process.env.LOONY_START_MODE ?? "fps";
const crossWindows = process.argv.includes("--windows") && process.platform !== "win32";
const targetsWindows = crossWindows || process.platform === "win32";
const buildDir = join(root, crossWindows ? "build/desktop-windows" : "build/desktop");

function run(command, args, options = {}) {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(join(engine, "native/external/BabylonNative/CMakeLists.txt"))) {
    console.error("Babylon Native is missing. In ../loony-engine run: git submodule update --init native/external/BabylonNative");
    process.exit(1);
}

const cmakeArgs = [
    "-S", host,
    "-B", buildDir,
    "-DCMAKE_BUILD_TYPE=Release",
    `-DLOONY_EXECUTABLE_NAME=${loony.executableName}`,
    `-DLOONY_GAME_TITLE=${loony.title}`,
    `-DLOONY_GAME_BUNDLE=${join(root, "dist-native/game.js")}`,
    `-DLOONY_GAME_ASSETS=${join(root, "public")}`,
];
if (crossWindows) {
    const xwin = process.env.XWIN_DIR ?? join(homedir(), "xwin");
    if (!existsSync(join(xwin, "sdk/include/um/windows.h"))) {
        console.error(
            `No Windows SDK at ${xwin}. Install xwin and unpack the SDK there (or set XWIN_DIR):\n\n` +
                "    cargo install xwin\n" +
                `    xwin --accept-license splat --output ${xwin}\n`
        );
        process.exit(1);
    }
    cmakeArgs.push("-G", "Ninja", `-DCMAKE_TOOLCHAIN_FILE=${join(host, "cmake/windows-clang-cl.cmake")}`, `-DXWIN_DIR=${xwin}`);
}

// Windows runs the game on Chakra, which understands JavaScript up to ES2017.
run("pnpm", ["exec", "vite", "build", "--config", "vite.native.config.ts"], {
    cwd: root,
    env: {
        ...process.env,
        NODE_ENV: "production",
        LOONY_START_MODE: startMode,
        ...(targetsWindows ? { LOONY_NATIVE_TARGET: "es2017" } : {}),
    },
});
run("cmake", cmakeArgs);
run("cmake", ["--build", buildDir, "--config", "Release", "--parallel"]);
const exe = targetsWindows ? `${loony.executableName}.exe` : loony.executableName;
console.log(`\nDesktop build ready: ${join(buildDir, exe)} (ship the whole folder)`);
