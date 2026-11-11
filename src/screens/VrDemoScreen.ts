import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import type { App } from "@loony/loony/app";
import { InitialConfig, Screen } from "@loony/loony/screen";
import type { WebXRInputHandler } from "@loony/loony/input/webXRInputHandler";
import { GrabController, type HandSide } from "../vr/grabController";

/** Room size in metres. */
const ROOM_SIZE = 12;
const TABLE_HEIGHT = 0.8;

const INSTRUCTIONS =
    "VR demo\n\n" +
    "Thumbstick / point at the floor: teleport\n" +
    "Grip near an object: grab it\n" +
    "Release grip: drop it\n\n" +
    "Desktop preview: drag to look around,\nthen press the VR button to enter VR.";

/**
 * Virtual-reality demo: a room with a table of objects to pick up, teleport locomotion and a
 * floating instruction panel. Works with headset controllers and tracked hands, and previews on
 * desktop without a headset.
 *
 * The screen is its own {@link WebXRInputHandler}: the engine forwards controller trigger, grip
 * and thumbstick events to `app.inputHandler`, and this class turns grip into grab/release.
 */
export class VrDemoScreen extends Screen implements WebXRInputHandler {
    private ground: Mesh | null = null;
    private readonly grab = new GrabController();

    override initialConfig(): InitialConfig {
        return InitialConfig.vrGame({
            enableTeleport: true,
            enablePhysics: false,
            enableHandTracking: true,
            handMeshMode: "babylon",
        });
    }

    override show(app: App, scene: Scene): void {
        this.buildRoom(scene);

        if (app.xrEnabled) {
            app.inputHandler = this;
        } else {
            // Desktop preview: stand at the edge of the room looking at the table.
            app.camera.position.set(0, 1.6, -3);
            app.camera.setTarget(new Vector3(0, 1, 0));
            app.camera.attachControl(app.canvas, true);
        }
    }

    override hide(app: App, scene: Scene): void {
        this.grab.releaseAll();
        this.grab.clear();
        app.camera.detachControl();
        super.hide(app, scene);
    }

    /** Called by the engine once the headset session is running. */
    override initXR(app: App): void {
        app.inputHandler = this;
        if (this.ground) {
            app.xr?.teleportation?.addFloorMesh(this.ground);
        }
    }

    // ── Controller input (WebXRInputHandler) ─────────────────────────────

    onLeftSqueezePressed(app: App): void {
        this.grabWith(app, "left");
    }

    onLeftSqueezeReleased(): void {
        this.grab.release("left");
    }

    onRightSqueezePressed(app: App): void {
        this.grabWith(app, "right");
    }

    onRightSqueezeReleased(): void {
        this.grab.release("right");
    }

    onLeftTriggerPressed(): void {}
    onLeftTriggerReleased(): void {}
    onRightTriggerPressed(): void {}
    onRightTriggerReleased(): void {}
    onLeftAxisChange(): void {}
    onRightAxisChange(): void {}
    onLeftButtonChanged(): void {}
    onRightButtonChanged(): void {}

    private grabWith(app: App, side: HandSide): void {
        const hand = side === "left" ? app.player.leftHand : app.player.rightHand;
        const node = hand.controller?.grip ?? hand.controller?.pointer;
        if (node) {
            this.grab.grab(side, node);
        }
    }

    // ── Scene ────────────────────────────────────────────────────────────

    private buildRoom(scene: Scene): void {
        const track = <T extends { dispose(): void }>(thing: T): T => {
            this.sceneScope.trackFn(() => thing.dispose());
            return thing;
        };
        const mat = (name: string, color: Color3): StandardMaterial => {
            const m = track(new StandardMaterial(name, scene));
            m.diffuseColor = color;
            return m;
        };

        const hemi = track(new HemisphericLight("vrHemi", new Vector3(0, 1, 0), scene));
        hemi.intensity = 0.7;
        const sun = track(new DirectionalLight("vrSun", new Vector3(-0.5, -1, 0.4), scene));
        sun.intensity = 0.6;

        this.ground = track(CreateGround("vrGround", { width: ROOM_SIZE, height: ROOM_SIZE }, scene));
        this.ground.material = mat("vrGroundMat", new Color3(0.3, 0.42, 0.35));

        const table = track(CreateBox("vrTable", { width: 1.6, height: TABLE_HEIGHT, depth: 0.8 }, scene));
        table.position.set(0, TABLE_HEIGHT / 2, 0.6);
        table.material = mat("vrTableMat", new Color3(0.5, 0.35, 0.22));

        const shapes: Array<[string, Mesh, Color3]> = [
            ["cube", CreateBox("vrCube", { size: 0.15 }, scene), new Color3(0.9, 0.3, 0.25)],
            ["ball", CreateSphere("vrBall", { diameter: 0.15 }, scene), new Color3(0.25, 0.55, 0.9)],
            ["can", CreateCylinder("vrCan", { diameter: 0.1, height: 0.18 }, scene), new Color3(0.95, 0.8, 0.2)],
        ];
        shapes.forEach(([name, mesh, color], i) => {
            track(mesh);
            mesh.material = mat(`vr-${name}-mat`, color);
            mesh.position.set(-0.5 + i * 0.5, TABLE_HEIGHT + 0.1, 0.5);
            this.grab.addGrabbable(mesh);
        });

        // A 3D panel in the world (Babylon GUI works the same in VR and on native hosts).
        const panel = track(CreatePlane("vrInstructions", { width: 1.6, height: 1 }, scene));
        panel.position.set(0, 1.7, 1.6);
        const ui = track(AdvancedDynamicTexture.CreateForMesh(panel, 1024, 640));
        const text = new TextBlock("vrInstructionsText", INSTRUCTIONS);
        text.color = "white";
        text.fontSize = 44;
        ui.background = "#1d2733cc";
        ui.addControl(text);
    }
}
