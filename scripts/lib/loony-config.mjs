import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getProjectRoot(fromUrl = import.meta.url) {
    return resolve(dirname(fileURLToPath(fromUrl)), "../..");
}

export function loadLoonyConfig(root = getProjectRoot()) {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (!pkg.loony) {
        console.error("package.json is missing a loony section.");
        process.exit(1);
    }
    return { root, pkg, loony: pkg.loony };
}

export function assertItchConfig(loony) {
    const itch = loony.itch;
    if (!itch?.user || !itch?.game) {
        console.error("Set loony.itch.user and loony.itch.game in package.json.");
        process.exit(1);
    }
    if (itch.user === "your-itch-username") {
        console.error("Replace loony.itch.user with your itch.io username in package.json.");
        process.exit(1);
    }
    const channels = itch.channels ?? { web: "html", windows: "windows", linux: "linux" };
    return { ...itch, channels };
}

export function assertSteamConfig(loony) {
    const steam = loony.steam;
    if (!steam?.appId || !steam?.depots?.windows || !steam?.depots?.linux) {
        console.error("Set loony.steam.appId and loony.steam.depots (windows, linux) in package.json.");
        process.exit(1);
    }
    if (steam.appId === "000000") {
        console.error("Replace loony.steam.appId with your Steamworks app ID in package.json.");
        process.exit(1);
    }
    return steam;
}
