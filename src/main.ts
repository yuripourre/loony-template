import { defineGame } from "@loony/loony";
import { DEFAULT_WEB_MODE, GAME_TITLE, SCREENS, isStartMode, type StartMode } from "./game.config";

/**
 * Web entry point. `index.html` shows a start menu; picking a mode starts the engine on that
 * screen. A `?mode=fps` / `?mode=vr` URL skips the menu (handy while developing).
 */
async function start(mode: StartMode): Promise<void> {
    document.getElementById("start-menu")?.remove();
    await defineGame({ canvas: "#renderCanvas", screen: SCREENS[mode] });
}

function showMenu(): void {
    document.title = GAME_TITLE;
    const title = document.getElementById("game-title");
    if (title) title.textContent = GAME_TITLE;
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
        const mode = button.dataset.mode;
        if (isStartMode(mode)) {
            button.addEventListener("click", () => void start(mode), { once: true });
        }
    }
}

const requested = new URLSearchParams(window.location.search).get("mode");
if (isStartMode(requested)) {
    void start(requested);
} else if (document.getElementById("start-menu")) {
    showMenu();
} else {
    void start(DEFAULT_WEB_MODE);
}
