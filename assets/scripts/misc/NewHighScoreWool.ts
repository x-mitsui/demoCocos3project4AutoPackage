import { _decorator, Component, sp } from "cc";
import { eventManager } from "../managers/EventManager";
import { GameEvent } from "../managers/EventManager";
import { AudioManager } from "../managers/AudioManager";
const { ccclass, property } = _decorator;

@ccclass("NewHighScoreWool")
export class NewHighScoreWool extends Component {
    private sp: sp.Skeleton = null;
    onLoad() {
        this.node.x = -10000;
        this.sp = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        eventManager.on(GameEvent.GAME_HIGH_ANI_PLAY, this.onHighAniPlay, this);
    }

    onHighAniPlay() {
        AudioManager.instance.playNewHighScoreEffect();
        this.node.x = 0;
        this.sp.setEndListener(() => {
            this.node.x = -10000;
        });
        this.sp.setAnimation(0, "newhighscore", false);
    }
}
