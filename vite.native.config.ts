import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vite";
import { createNativeBundleConfig } from "@loony/loony/vite/config";

// One-file bundle for the Babylon Native hosts (desktop app and Meta Quest APK).
// LOONY_START_MODE picks the screen the app boots into (see DEFAULT_NATIVE_MODE in src/game.config.ts).
export default defineConfig(
    mergeConfig(
        createNativeBundleConfig({
            entry: resolve(import.meta.dirname, "src/native-entry.ts"),
            outDir: resolve(import.meta.dirname, "dist-native"),
            name: "game",
        }),
        { define: { __LOONY_START_MODE__: JSON.stringify(process.env.LOONY_START_MODE ?? "") } }
    )
);
