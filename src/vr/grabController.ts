import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export type HandSide = "left" | "right";

/** How close (metres) a hand must be to an object's centre to pick it up. */
export const DEFAULT_GRAB_RADIUS = 0.25;

/**
 * Pick-up-and-drop for VR hands, kept free of XR types so it is easy to test and reuse.
 *
 * `grab(side, handNode)` parents the nearest grabbable mesh within reach to the hand node
 * (a controller grip, or a tracked hand's wrist), so it follows the hand; `release(side)`
 * unparents it where it is. Each hand holds at most one object, and an object is held by at most
 * one hand (grabbing it with the other hand takes it over).
 */
export class GrabController {
    private readonly grabbables = new Set<AbstractMesh>();
    private readonly held = new Map<HandSide, AbstractMesh>();

    constructor(private readonly radius: number = DEFAULT_GRAB_RADIUS) {}

    addGrabbable(mesh: AbstractMesh): void {
        this.grabbables.add(mesh);
    }

    removeGrabbable(mesh: AbstractMesh): void {
        for (const [side, m] of this.held) {
            if (m === mesh) this.release(side);
        }
        this.grabbables.delete(mesh);
    }

    heldBy(side: HandSide): AbstractMesh | undefined {
        return this.held.get(side);
    }

    /** Picks up the nearest grabbable within reach of `hand`. Returns it, or null when none is near. */
    grab(side: HandSide, hand: TransformNode): AbstractMesh | null {
        if (this.held.has(side)) {
            return this.held.get(side) ?? null;
        }
        // Fresh world matrices: input events can arrive between frames, after things moved.
        const handPos = hand.computeWorldMatrix(true).getTranslation();
        let nearest: AbstractMesh | null = null;
        let nearestDist = this.radius;
        for (const mesh of this.grabbables) {
            const dist = mesh.computeWorldMatrix(true).getTranslation().subtract(handPos).length();
            if (dist <= nearestDist) {
                nearest = mesh;
                nearestDist = dist;
            }
        }
        if (!nearest) {
            return null;
        }
        for (const [otherSide, m] of this.held) {
            if (m === nearest) this.held.delete(otherSide);
        }
        nearest.setParent(hand);
        this.held.set(side, nearest);
        return nearest;
    }

    /** Drops whatever `side` holds, leaving it where it is in the world. */
    release(side: HandSide): void {
        const mesh = this.held.get(side);
        if (!mesh) return;
        mesh.setParent(null);
        this.held.delete(side);
    }

    releaseAll(): void {
        this.release("left");
        this.release("right");
    }

    /** Forgets every grabbable (call when the screen's meshes are disposed). */
    clear(): void {
        this.held.clear();
        this.grabbables.clear();
    }
}
