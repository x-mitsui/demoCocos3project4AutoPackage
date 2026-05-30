import { _decorator, Component, dragonBones, Label, tween, UIOpacity } from "cc";
import { eventManager } from "../managers/EventManager";
import { GameEvent } from "../managers/EventManager";
import { AudioManager } from "../managers/AudioManager";
import { GameManager } from "../managers/GameManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("NewHighScoreBrush")
export class NewHighScoreBrush extends Component {
    private mask: dragonBones.ArmatureDisplay = null;
    private dragon: dragonBones.ArmatureDisplay = null;
    private scoreLabel: Label = null; // 分数
    onLoad() {
        this.node.active = true;
        this.node.x = -10000;
        this.scoreLabel = this.node.getChildByName("Score").getComponent(Label);
        this.scoreLabel.addComponent(UIOpacity).opacity = 0;
        this.mask = this.node.getChildByName("Mask").getComponent(dragonBones.ArmatureDisplay);
        this.dragon = this.node.getChildByName("Dragon").getComponent(dragonBones.ArmatureDisplay);
        eventManager.on(GameEvent.GAME_HIGH_ANI_PLAY, this.onHighAniPlay, this);
    }

    onHighAniPlay(newBestScore: number) {
        Logger.info("NewHighScoreBrush:onHighAniPlay:", "-----播放新高分动画");
        AudioManager.instance.playNewHighScoreEffect();
        this.node.x = 0;
        this.mask.playAnimation("in_mask", 1);
        this.dragon.on(
            dragonBones.EventObject.COMPLETE,
            () => {
                tween(this.node.addComponent(UIOpacity)).to(0.2, { opacity: 0 }, { easing: "sineOut" }).start();
            },
            this,
        );
        this.dragon.playAnimation("in", 1);
        this.scoreLabel.string = newBestScore.toString();
        tween(this.scoreLabel.getComponent(UIOpacity))
            .delay(1)
            .to(0.3, { opacity: 255 }, { easing: "sineOut" })
            .start();
    }
}
