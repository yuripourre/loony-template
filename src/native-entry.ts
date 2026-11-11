// Babylon Native entry point (desktop app and Meta Quest APK), bundled into one script by
// `pnpm build:native`. This polyfill must stay the first import: see its header for why.
import "@loony/loony/xr/nativeEventTargetPolyfill";
import { bootNativeGame } from "@loony/loony/core/bootNativeGame";
import { DEFAULT_NATIVE_MODE, SCREENS, isStartMode } from "./game.config";

declare const __LOONY_START_MODE__: string | undefined;

const requested = typeof __LOONY_START_MODE__ === "string" ? __LOONY_START_MODE__ : undefined;
const mode = isStartMode(requested) ? requested : DEFAULT_NATIVE_MODE;

bootNativeGame({
    screen: SCREENS[mode],
    // Babylon Native draws GUI text only with a registered font; public/ is copied beside the app.
    fonts: [{ family: "Liberation Sans", url: "fonts/LiberationSans-Regular.ttf" }],
}).catch((error: unknown) => {
    console.error("[native-entry] boot failed", error);
});
