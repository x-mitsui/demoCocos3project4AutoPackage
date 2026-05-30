import { _decorator, Animation, Color, dragonBones, Label, Node, Sprite, Vec3 } from "cc";
import { SkinsManager } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { ComboAniSuper } from "./ComboAniSuper";

const { ccclass, property } = _decorator;

@ccclass("ComboAni")
export class ComboAni extends ComboAniSuper {
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
        this.setColors(blockIndex);
        // log("playComboAnimation", this.node.getChildByName("ComboCountBg").getComponent(Label).string, comboCount);
        const comboCountStr = comboCount === 1 ? "" : comboCount.toString();
        this.comboCountBg.getComponent(Label).string = comboCountStr;
        this.comboCount.getComponent(Label).string = comboCountStr;
        this.node.setPosition(position);
        const animation = this.node.getComponent(Animation);
        if (animation) {
            animation.play("combo");
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
            const armatureDisplay = this.bgAni.getComponent(dragonBones.ArmatureDisplay);
            if (armatureDisplay) {
                armatureDisplay.playAnimation("newAnimation", 1);
                armatureDisplay.on(
                    dragonBones.EventObject.COMPLETE,
                    () => {
                        this.node.position = new Vec3(0, 100000, 0);
                        callback();
                    },
                    this,
                );
            }
        }
    }

    setColors(blockIndex: number) {
        const comboAniConfig = SkinsManager.getInstance().getComboAniConfigByBlockIndex(blockIndex);
        if (comboAniConfig) {
            const comboSpBgColor = comboAniConfig.comboSpBg;
            const color1 = new Color().fromHEX(comboSpBgColor[0]);
            color1.a = comboSpBgColor[1];
            this.comboSpBg.getComponent(Sprite).color = color1;
            const comboSpColor = comboAniConfig.comboSp;
            const color2 = new Color().fromHEX(comboSpColor[0]);
            color2.a = comboSpColor[1];
            this.comboSp.getComponent(Sprite).color = color2;
            const comboCountBgColor = comboAniConfig.comboCountBg;
            const color3 = new Color().fromHEX(comboCountBgColor[0]);
            color3.a = comboCountBgColor[1];
            this.comboCountBg.getComponent(Label).color = color3;
            const comboCountColor = comboAniConfig.comboCount;
            const color4 = new Color().fromHEX(comboCountColor[0]);
            color4.a = comboCountColor[1];
            this.comboCount.getComponent(Label).color = color4;
        }
    }
}
