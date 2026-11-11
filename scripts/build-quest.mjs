// `pnpm build:quest`: bundles the game for Babylon Native and builds a Meta Quest APK with the
// engine's Quest host (../loony-engine/native/quest). Needs the Android SDK + NDK (see the engine's
// native/quest/CMakeLists.txt). Install with: adb install -r <printed apk path>
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const android = resolve(root, "../loony-engine/native/quest/android");
const { loony } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function run(command, args, options = {}) {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

run("pnpm", ["exec", "vite", "build", "--config", "vite.native.config.ts"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production", LOONY_START_MODE: process.env.LOONY_START_MODE ?? "vr" },
});
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(gradlew, [
    ":app:assembleDebug",
    `-PBUNDLE_DIR=${join(root, "dist-native")}`,
    "-PQUEST_ENTRY_NAME=game",
    `-PAPP_ID=${loony.appId}`,
], { cwd: android });
console.log(`\nAPK ready: ${join(android, "app/build/outputs/apk/debug/app-debug.apk")}`);
