/**
 * The game's top-level settings. Start here: rename the game (package.json `loony.title`), add
 * your own screens to {@link SCREENS}, and pick which one each platform starts on.
 */
import type { Screen } from "@loony/loony/screen";
import pkg from "../package.json";

/** Set in package.json (`loony.title`), which the native builds also use for the window title. */
export const GAME_TITLE: string = pkg.loony.title;

/** Every screen the game can start on. Lazy imports keep the first load small on the web. */
export const SCREENS = {
    fps: async (): Promise<Screen> => new (await import("./screens/FpsDemoScreen")).FpsDemoScreen(),
    vr: async (): Promise<Screen> => new (await import("./screens/VrDemoScreen")).VrDemoScreen(),
} satisfies Record<string, () => Promise<Screen>>;

export type StartMode = keyof typeof SCREENS;

/** Web: the screen used when the page URL has no `?mode=` (the start menu offers every mode). */
export const DEFAULT_WEB_MODE: StartMode = "fps";

/**
 * Babylon Native builds: the screen the app boots straight into when the build does not pick one.
 * `pnpm build:desktop` boots `fps` and `pnpm build:quest` boots `vr` (LOONY_START_MODE).
 */
export const DEFAULT_NATIVE_MODE: StartMode = "vr";

export function isStartMode(value: string | null | undefined): value is StartMode {
    return value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(SCREENS, value);
}
