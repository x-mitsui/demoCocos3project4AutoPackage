import { _decorator, dragonBones, Label, Node, tween, Vec3 } from "cc";
import { Logger } from "../../utils/logger";
import { ComboAniSuper } from "./ComboAniSuper";

const { ccclass, property } = _decorator;

@ccclass("ComboAniBrush")
export class ComboAniBrush extends ComboAniSuper {
    // 发光效果的龙骨动画
    bgAni: Node = null!;
    comboCountBg: Node = null!;
    comboCount: Node = null!;
    comboSpBg: Node = null!;
    comboSp: Node = null!;
    onLoad() {
        this.bgAni = this.node.getChildByName("bgAni");

        this.comboCountBg = this.node.getChildByName("ComboCountBg");
        this.comboCount = this.comboCountBg.getChildByName("Count");
        this.comboSpBg = this.node.getChildByName("ComboSpBg");
        this.comboSp = this.comboSpBg.getChildByName("Sp");
    }

    playComboAnimation(
        blockIndex: number,
        comboCount: number,
        position: Vec3,
        callback: () => void
    ) {
        // log("playComboAnimation", this.node.getChildByName("ComboCountBg").getComponent(Label).string, comboCount);
        const comboCountStr = comboCount === 1 ? "" : comboCount.toString();
        this.comboCountBg.getComponent(Label).string = comboCountStr;
        this.comboCount.getComponent(Label).string = comboCountStr;
        this.node.setPosition(position);

        this.comboCountBg.setScale(Vec3.ZERO);
        this.comboSpBg.setScale(Vec3.ZERO);

        tween(this.comboCountBg)
            .to(0.2, { scale: Vec3.ONE }, { easing: "backOut" })
            .delay(0.3)
            .to(0.2, { scale: Vec3.ZERO }, { easing: "backIn" })
            .start();

        tween(this.comboSpBg)
            .to(0.2, { scale: Vec3.ONE }, { easing: "backOut" })
            .delay(0.3)
            .to(0.2, { scale: Vec3.ZERO }, { easing: "backIn" })
            .start();

        if (comboCount > 1) {
            Logger.info("ComboAni:playComboAnimation:", "shakeCamera", comboCount);
            this.shakeCamera();
        }

        if (this.bgAni) {
            if (comboCount === 1) {
                this.bgAni.active = false;
                return;
            }
            this.bgAni.active = true;
            const armatureDisplay = this.bgAni.getComponent(dragonBones.ArmatureDisplay);
            if (armatureDisplay) {
                armatureDisplay.playAnimation("newAnimation", 1);
                armatureDisplay.on(
                    dragonBones.EventObject.COMPLETE,
                    () => {
                        this.node.position = new Vec3(0, 100000, 0);
                        callback();
                    },
                    this
                );
            }
        }
    }
}
