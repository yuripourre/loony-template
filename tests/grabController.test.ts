import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { GrabController } from "../src/vr/grabController";

describe("GrabController", () => {
    let engine: NullEngine;
    let scene: Scene;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    function handAt(x: number, y: number, z: number): TransformNode {
        const hand = new TransformNode("hand", scene);
        hand.position.set(x, y, z);
        hand.computeWorldMatrix(true);
        return hand;
    }

    it("picks up the nearest object within reach and drops it in place", () => {
        const near = CreateBox("near", { size: 0.1 }, scene);
        near.position.set(0.1, 1, 0);
        const far = CreateBox("far", { size: 0.1 }, scene);
        far.position.set(0.2, 1, 0);
        const grab = new GrabController(0.25);
        grab.addGrabbable(near);
        grab.addGrabbable(far);

        const hand = handAt(0, 1, 0);
        expect(grab.grab("right", hand)).toBe(near);
        expect(near.parent).toBe(hand);

        hand.position.set(1, 1, 0);
        hand.computeWorldMatrix(true);
        near.computeWorldMatrix(true);
        grab.release("right");
        expect(near.parent).toBeNull();
        expect(near.getAbsolutePosition().x).toBeCloseTo(1.1);
    });

    it("ignores objects out of reach", () => {
        const box = CreateBox("box", { size: 0.1 }, scene);
        box.position.set(2, 1, 0);
        const grab = new GrabController(0.25);
        grab.addGrabbable(box);
        expect(grab.grab("left", handAt(0, 1, 0))).toBeNull();
        expect(grab.heldBy("left")).toBeUndefined();
    });

    it("lets the other hand take an object over", () => {
        const box = CreateBox("box", { size: 0.1 }, scene);
        box.position.set(0, 1, 0);
        const grab = new GrabController(0.25);
        grab.addGrabbable(box);
        const left = handAt(0.05, 1, 0);
        const right = handAt(-0.05, 1, 0);
        grab.grab("left", left);
        expect(grab.grab("right", right)).toBe(box);
        expect(box.parent).toBe(right);
        expect(grab.heldBy("left")).toBeUndefined();
    });
});
