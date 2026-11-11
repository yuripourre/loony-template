import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { SceneActorEntry } from "@loony/loony/scene/sceneFile";
import type { WorldSceneRuntime } from "@loony/loony/scene/worldTypes";

/**
 * The FPS demo level, written as code: a walled arena with cover, three enemies and pickups.
 *
 * A level has two halves:
 * - {@link createArenaWorld}: the gameplay data the engine reads (spawn point, scene settings,
 *   and `sceneActors` — enemies, pickups, doors, triggers — by their registered actor type).
 * - {@link buildArenaGeometry}: the Babylon meshes. Anything with `checkCollisions` blocks the
 *   player. Replace this with loaded models (`SceneLoader.ImportMeshAsync`) for real levels.
 */

/** Width and depth of the square arena floor, in metres. */
export const ARENA_SIZE = 40;
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 1;

/** Cover blocks: [x, z, width, height, depth]. */
const COVER: ReadonlyArray<readonly [number, number, number, number, number]> = [
    [-8, 4, 2, 1.2, 6],
    [8, 4, 2, 1.2, 6],
    [0, 10, 8, 2.5, 1],
    [-12, -8, 3, 3, 3],
    [12, -8, 3, 3, 3],
];

/** Builds a scene-actor entry at a ground position. `transform` is [pos, quaternion, scale]. */
function actorAt(id: string, type: string, x: number, y: number, z: number, properties: Record<string, unknown>): SceneActorEntry {
    return { id, type, name: id, transform: [x, y, z, 0, 0, 0, 1, 1, 1, 1], properties };
}

export function createArenaWorld(): WorldSceneRuntime {
    return {
        version: 1,
        sceneConfig: {
            enableVR: false,
            enablePhysics: false,
            clearColor: [0.55, 0.7, 0.85, 1],
            fogMode: "linear",
            fogColor: [0.55, 0.7, 0.85],
            fogStart: 25,
            fogEnd: 70,
            hemisphericLightIntensity: 0.9,
        },
        // The camera is placed at the spawn point plus eye height.
        spawnPoints: [{ x: 0, y: 0, z: -15, yawDeg: 0 }],
        sceneActors: [
            // Enemies are 1.8 m boxes centred on their position, so y = 0.9 stands them on the floor.
            actorAt("enemy-left", "fpsEnemy", -10, 0.9, 12, { health: 50, speed: 0.04, visionRadius: 18 }),
            actorAt("enemy-center", "fpsEnemy", 0, 0.9, 15, { health: 50, speed: 0.05, visionRadius: 18 }),
            actorAt("enemy-right", "fpsEnemy", 10, 0.9, 12, { health: 50, speed: 0.04, visionRadius: 18 }),
            actorAt("ammo-left", "fpsCollectible", -8, 0.5, -2, { collectibleType: "ammo", value: 15 }),
            actorAt("health-right", "fpsCollectible", 8, 0.5, -2, { collectibleType: "health", value: 25 }),
        ],
    };
}

function material(scene: Scene, name: string, color: Color3): StandardMaterial {
    const mat = new StandardMaterial(name, scene);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    return mat;
}

function solidBox(scene: Scene, name: string, size: Vector3, position: Vector3, mat: StandardMaterial): Mesh {
    const box = CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    box.position.copyFrom(position);
    box.material = mat;
    box.checkCollisions = true;
    return box;
}

/** Creates the arena meshes. Returns them so tests (and screens) can find or dispose them. */
export function buildArenaGeometry(scene: Scene): Mesh[] {
    const meshes: Mesh[] = [];
    const floorMat = material(scene, "arenaFloor", new Color3(0.35, 0.38, 0.33));
    const wallMat = material(scene, "arenaWall", new Color3(0.62, 0.58, 0.52));
    const coverMat = material(scene, "arenaCover", new Color3(0.45, 0.32, 0.22));

    const ground = CreateGround("arenaGround", { width: ARENA_SIZE, height: ARENA_SIZE }, scene);
    ground.material = floorMat;
    ground.checkCollisions = true;
    meshes.push(ground);

    const half = ARENA_SIZE / 2;
    const wallY = WALL_HEIGHT / 2;
    const walls: Array<[string, Vector3, Vector3]> = [
        ["north", new Vector3(ARENA_SIZE, WALL_HEIGHT, WALL_THICKNESS), new Vector3(0, wallY, half)],
        ["south", new Vector3(ARENA_SIZE, WALL_HEIGHT, WALL_THICKNESS), new Vector3(0, wallY, -half)],
        ["east", new Vector3(WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE), new Vector3(half, wallY, 0)],
        ["west", new Vector3(WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE), new Vector3(-half, wallY, 0)],
    ];
    for (const [name, size, position] of walls) {
        meshes.push(solidBox(scene, `arenaWall-${name}`, size, position, wallMat));
    }

    COVER.forEach(([x, z, w, h, d], i) => {
        meshes.push(solidBox(scene, `arenaCover-${i}`, new Vector3(w, h, d), new Vector3(x, h / 2, z), coverMat));
    });
    return meshes;
}
