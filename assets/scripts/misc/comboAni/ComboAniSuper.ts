import { _decorator, Component, find, Vec3 } from "cc";
import { ScreenShake } from "../ScreenShake";

const { ccclass, property } = _decorator;

@ccclass("ComboAniSuper")
export abstract class ComboAniSuper extends Component {
    abstract playComboAnimation(blockIndex: number, comboCount: number, position: Vec3, callback: () => void);

    shakeCamera() {
        const mainCamera = find("Canvas/Camera");
        if (mainCamera) {
            const shake = mainCamera.getComponent(ScreenShake);
            shake?.shake(10);
        }
    }
}
