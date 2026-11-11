import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { hasSceneActorType } from "@loony/loony/scene/sceneActorRegistry";
import { registerFpsCoreActors } from "@loony/loony-gameplay-fps";
import { ARENA_SIZE, buildArenaGeometry, createArenaWorld } from "../src/levels/arena";

describe("arena level", () => {
    it("only uses registered actor types", () => {
        registerFpsCoreActors();
        for (const actor of createArenaWorld().sceneActors ?? []) {
            expect(hasSceneActorType(actor.type), actor.type).toBe(true);
        }
    });

    it("keeps the spawn point and every actor inside the walls", () => {
        const world = createArenaWorld();
        const inside = (x: number, z: number) => Math.abs(x) < ARENA_SIZE / 2 && Math.abs(z) < ARENA_SIZE / 2;
        for (const spawn of world.spawnPoints ?? []) expect(inside(spawn.x, spawn.z)).toBe(true);
        for (const actor of world.sceneActors ?? []) expect(inside(actor.transform[0], actor.transform[2])).toBe(true);
    });

    it("builds solid geometry the player collides with", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const meshes = buildArenaGeometry(scene);
        expect(meshes.length).toBeGreaterThan(5);
        expect(meshes.every((m) => m.checkCollisions)).toBe(true);
        scene.dispose();
        engine.dispose();
    });
});
