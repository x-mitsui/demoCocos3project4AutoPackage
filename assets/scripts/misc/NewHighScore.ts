import { _decorator, Color, Component, dragonBones, Node } from "cc";
import { eventManager } from "../managers/EventManager";
import { GameEvent } from "../managers/EventManager";
import { SkinsManager } from "../configs/Skins/SkinsManager";
import { AudioManager } from "../managers/AudioManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("NewHighScore")
export class NewHighScore extends Component {
    private outline: Node = null;
    private pause: Node = null;
    private pause1: Node = null;
    private light: Node = null;
    private show: Node = null;
    onLoad() {
        this.node.x = -10000;
        this.outline = this.node.getChildByName("Outline");
        this.pause = this.node.getChildByName("Pause");
        this.pause1 = this.node.getChildByName("Pause-001");
        this.light = this.node.getChildByName("Light");
        this.show = this.node.getChildByName("Show");
        this.initColors();
        eventManager.on(GameEvent.GAME_HIGH_ANI_PLAY, this.onHighAniPlay, this);
    }

    initColors() {
        const newHighScoreAniConfig = SkinsManager.getInstance().getNewHighScoreAniConfig();
        if (newHighScoreAniConfig) {
            this.setArmatureColor(this.outline, newHighScoreAniConfig.outline);
            this.setArmatureColor(this.light, newHighScoreAniConfig.light);
            this.setArmatureColor(this.show, newHighScoreAniConfig.show);
            this.setArmatureColor(this.pause, newHighScoreAniConfig.pause);
            this.setArmatureColor(this.pause1, newHighScoreAniConfig.pause);
        }
    }

    /**
     * 设置龙骨组件的颜色
     * @param node 目标节点
     * @param colorConfig [hexColor, alpha] 格式的颜色配置
     */
    private setArmatureColor(node: Node, colorConfig: [string, number]) {
        if (node) {
            const armature = node.getComponent(dragonBones.ArmatureDisplay);
            if (armature) {
                const color = new Color().fromHEX(colorConfig[0]);
                color.a = colorConfig[1];
                armature.color = color;
            }
        }
    }
    onHighAniPlay() {
        AudioManager.instance.playNewHighScoreEffect();
        this.node.x = 0;
        this.outline.getComponent(dragonBones.ArmatureDisplay).once(
            dragonBones.EventObject.COMPLETE,
            () => {
                this.node.x = -10000;
            },
            this,
        );
        this.outline.getComponent(dragonBones.ArmatureDisplay).playAnimation("newhighscore_4", 1);
        this.pause.getComponent(dragonBones.ArmatureDisplay).playAnimation("newhighscore_2", 1);
        this.pause1.getComponent(dragonBones.ArmatureDisplay).playAnimation("newhighscore_2", 1);
        this.light.getComponent(dragonBones.ArmatureDisplay).playAnimation("newhighscore_1", 1);
        this.show.getComponent(dragonBones.ArmatureDisplay).playAnimation("newhighscore_1", 1);
    }
}
