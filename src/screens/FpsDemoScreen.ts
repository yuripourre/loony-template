import { FpsGameScreen, registerFpsCoreActors } from "@loony/loony-gameplay-fps";
import { buildArenaGeometry, createArenaWorld } from "../levels/arena";

// Makes the FPS actor types (fpsEnemy, fpsCollectible, fpsDoor, fpsTeleporter, ...) available
// to levels. Register your own actor types the same way with `registerSceneActorType`.
registerFpsCoreActors();

/**
 * First-person shooter demo: WASD to move, mouse to look (click to lock the pointer),
 * click to shoot, Space to jump.
 *
 * `FpsGameScreen` brings the movement physics, weapon, crosshair, HUD, damage feedback,
 * enemy AI and death/respawn; this screen only chooses the level and tunes the numbers.
 */
export class FpsDemoScreen extends FpsGameScreen {
    constructor() {
        super({
            worldSource: createArenaWorld(),
            populateScene: (scene) => {
                buildArenaGeometry(scene);
            },
            playerSpeed: 0.25,
            playerHealth: 100,
            playerLives: 3,
            startingAmmo: 50,
            weaponDamage: 25,
            weaponCooldownMs: 200,
            hudConfig: { showHealth: true, showAmmo: true, showScore: true, showLives: true },
            // Add sound files under public/ and point at them here, e.g. fire: "/assets/sfx/fire.mp3".
            sounds: {},
        });
    }
}
