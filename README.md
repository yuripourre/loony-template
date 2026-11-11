# My Loony Game

A starter project for first-person and VR games on the **loony engine**. It runs in the browser
(desktop, phone, and headset browsers such as Meta Quest Browser), as a desktop app, and as a
native Meta Quest app. It comes with two playable demos:

- **FPS demo**: a walled arena with cover, enemies that chase and attack, ammo and health pickups,
  a HUD, damage feedback and respawning. WASD to move, mouse to look, click to shoot, Space to jump.
- **VR demo**: a room with objects to pick up, teleport locomotion and a floating instruction
  panel. It works with controllers and tracked hands, and previews on a desktop browser.

## Setup

The engine is a separate repository that lives **next to** this one:

```
my-games/
  loony-engine/
  my-loony-game/     (this project)
```

```bash
git clone <loony-engine repository> loony-engine
git clone <this repository> my-loony-game
(cd loony-engine && pnpm install)
cd my-loony-game && pnpm install
pnpm dev
```

You need Node.js 22+ and pnpm 10 (`corepack enable` sets it up). Open the printed URL and pick a demo.
Add `?mode=fps` or `?mode=vr` to the URL to skip the menu.

**Try VR:** open the dev server from a headset browser on the same network (`pnpm dev --host`;
WebXR needs HTTPS or `localhost`, so on Quest use `adb reverse tcp:5173 tcp:5173` and open
`http://localhost:5173`). Without a headset, the browser's WebXR emulator extension works too.

## Project layout

```
src/
  main.ts                 web entry: start menu, then defineGame() with the chosen screen
  native-entry.ts         desktop-app and Quest entry (Babylon Native)
  game.config.ts          game title, the screens the game can start on, default per platform
  screens/
    FpsDemoScreen.ts      the FPS demo (extends FpsGameScreen)
    VrDemoScreen.ts       the VR demo (a Screen that handles controller input)
  levels/arena.ts         the FPS level: gameplay data + meshes
  vr/grabController.ts    pick-up-and-drop for VR hands
public/                   files served as-is (models, sounds, textures, fonts)
tests/                    Vitest tests (headless Babylon via NullEngine)
```

## Making your game

**Screens** are the building blocks. A screen sets up a scene in `show()`, cleans up in `hide()`,
runs per-frame logic in `update()`, and says what it needs (VR, physics, teleport, hand tracking…)
in `initialConfig()`. Switch screens with `app.setScreen(new OtherScreen())`. Register the screens
the game can *start* on in `SCREENS` in `src/game.config.ts`.

**FPS games:** extend `FpsGameScreen` (see `FpsDemoScreen`) and describe levels as world data:
spawn points, scene settings and `sceneActors` such as `fpsEnemy`, `fpsCollectible`, `fpsDoor`,
`fpsTeleporter`, `fpsTriggerAction` and `fpsMessage`. Build level meshes in `populateScene`; set
`checkCollisions = true` on anything the player should not walk through. For a real level, load a
model there with `SceneLoader.ImportMeshAsync` (glTF loaders: `import "@babylonjs/loaders/glTF"`).
Tune feel with the config numbers (speed, gravity, jump, head bob, weapon damage and cooldown).

**VR games:** extend `Screen`, return `InitialConfig.vrGame({...})` from `initialConfig()`, and
set `app.inputHandler = this` to receive trigger, grip and thumbstick events (see `VrDemoScreen`).
Register teleport floors with `app.xr.teleportation.addFloorMesh(mesh)` in `initXR()`.

**Your own actor types:** `registerSceneActorType("myType", (entry) => new MyActor(...), schema)`
from `@loony/loony/scene/sceneActorRegistry`, then use `"myType"` in a level's `sceneActors`.

**More engine features** (all in `../loony-engine/packages`): gameplay components
(`@loony/loony-gameplay`: health, inventory, weapons, HUD…), AI (`@loony/loony-gameplay-ai`: state
machines, behavior trees, GOAP, steering), visual looks (`@loony/loony-looks`), gamepad input
(`@loony/loony-gamepad-input`), multiplayer (`@loony/loony-net-p2p`).

**Rename the game:** `loony.title`, `loony.appId` and `loony.executableName` in `package.json`, and
the `<title>` in `index.html`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build:web` | Production web build in `dist/` (host it on any static web server) |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm build:desktop` | Desktop app for this computer in `build/desktop/` (see below) |
| `pnpm build:desktop:windows` | Windows app cross-compiled from Linux, in `build/desktop-windows/` |
| `pnpm build:quest` | Meta Quest APK (see below) |
| `pnpm typecheck` / `pnpm test` | TypeScript check / unit tests |

## Native builds (Babylon Native)

`pnpm build:native` bundles the game into one script (`dist-native/game.js`) for the engine's
Babylon Native hosts. Before the first native build, fetch Babylon Native in the engine:
`(cd ../loony-engine && git submodule update --init native/external/BabylonNative)`.

**Desktop** (`pnpm build:desktop`): builds the executable for the computer you run it on and
copies `game.js` and `public/` beside it; ship that whole folder. It needs CMake and a C++20
compiler: Visual Studio 2022 on Windows; on Linux also the X11 and JavaScriptCore development
packages (Debian/Ubuntu: `libx11-dev libjavascriptcoregtk-4.1-dev`; Fedora: `libX11-devel
javascriptcoregtk4.1-devel`). The first build compiles Babylon Native and takes a while. It boots
the FPS demo (`LOONY_START_MODE=vr` boots the VR one). macOS is planned.

**Windows from Linux** (`pnpm build:desktop:windows`): cross-compiles the `.exe` with clang-cl. It
needs LLVM (clang-cl, lld-link, llvm-rc, llvm-lib), Ninja, and the Windows SDK unpacked by
[xwin](https://github.com/Jake-Shadle/xwin):

```bash
cargo install xwin
xwin --accept-license splat --output ~/xwin     # or set XWIN_DIR to another folder
```

The Windows app runs on any Windows 10/11 PC with no installer or redistributable. It uses
Windows' built-in JavaScript engine (Chakra), so the bundle is compiled down to ES2017
automatically. For Steam Deck and other Proton players, ship the Linux build: Proton does not
include Chakra. If the app does not start, run it from a terminal with `LOONY_HOST_TRACE=1` set to
see how far it gets.

**Meta Quest** (`pnpm build:quest`): needs the Android SDK and NDK. It builds a debug APK that boots
the VR demo; install it with `adb install -r <apk path>`.

What differs on native hosts: no Ammo physics, no Web Audio yet, no HTML UI (use Babylon GUI,
which the demos already do), mouse look works while a mouse button is held, and Babylon GUI text
needs a font registered in `native-entry.ts` (one is included in `public/fonts`).

## How the engine is wired in

- `package.json` links the engine packages from `../loony-engine` (`link:`), so engine changes
  apply immediately.
- `vite.config.ts` uses the engine's `createWebConfig`, which serves the engine's runtime files
  (physics, effects, hand meshes) and keeps a single copy of Babylon.js in the bundle.
- `tsconfig.json` maps `@babylonjs/*` and `vite` to this project's `node_modules`, so the engine's
  sources and your code share the same types.
- Keep Babylon.js at the engine's version (`pnpm.overrides` pins it, `9.35.0`).

## Third-party files

`public/fonts/LiberationSans-Regular.ttf`: Liberation Sans 2.1.5, SIL Open Font License 1.1
(`public/fonts/LiberationSans-LICENSE.txt`).
