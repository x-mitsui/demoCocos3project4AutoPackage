import {
    _decorator,
    Animation,
    AnimationClip,
    Component,
    dragonBones,
    Label,
    log,
    Node,
    Vec3
} from "cc";

const { ccclass, property } = _decorator;

@ccclass("ComboAni")
export class ComboAni extends Component {
    // 发光效果的龙骨动画
    bgAni: Node = null!;
    onLoad() {
        this.bgAni = this.node.getChildByName("bgAni");
    }

    playComboAnimation(comboCount: number, position: Vec3, callback: () => void) {
        log(
            "playComboAnimation",
            this.node.getChildByName("ComboCountLabel").getComponent(Label).string,
            comboCount
        );
        this.node.getChildByName("ComboCountLabel").getComponent(Label).string =
            comboCount.toString();
        this.node.setPosition(position);
        const animation = this.node.getComponent(Animation);
        if (animation) {
            animation.play("combo");
        }

        if (this.bgAni) {
            const armatureDisplay = this.bgAni.getComponent(dragonBones.ArmatureDisplay);
            if (armatureDisplay) {
                armatureDisplay.playAnimation("newAnimation", 1);
                armatureDisplay.on(
                    dragonBones.EventObject.COMPLETE,
                    () => {
                        // this.node.parent.removeChild(this.node);
                        // this.node.destroy();
                        this.node.position = new Vec3(0, 100000, 0);
                        callback();
                    },
                    this
                );
            }
        }
    }
}
