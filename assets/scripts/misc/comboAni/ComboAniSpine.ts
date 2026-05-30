import { _decorator, Animation, Color, dragonBones, Label, Node, sp, Sprite, Vec3 } from "cc";
import { SkinsManager } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { ComboAniSuper } from "./ComboAniSuper";

const { ccclass, property } = _decorator;

@ccclass("ComboAniSpine")
export class ComboAniSpine extends ComboAniSuper {
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

    playComboAnimation(blockIndex: number, comboCount: number, position: Vec3, callback: () => void) {
        // log("playComboAnimation", this.node.getChildByName("ComboCountBg").getComponent(Label).string, comboCount);
        const comboCountStr = comboCount === 1 ? "" : comboCount.toString();
        this.comboCountBg.getComponent(Label).string = comboCountStr;
        this.comboCount.getComponent(Label).string = comboCountStr;
        this.node.setPosition(position);
        Logger.info("position:", position);
        const animation = this.node.getComponent(Animation);
        if (animation) {
            animation.play();
        }
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
            const skeleton = this.bgAni.getComponent(sp.Skeleton);
            if (skeleton) {
                skeleton.setAnimation(0, "in", false);
                skeleton.setEndListener(() => {
                    // this.node.position = new Vec3(0, 100000, 0);
                    callback();
                    this.bgAni.active = false;
                });
            }
        }
    }
}
