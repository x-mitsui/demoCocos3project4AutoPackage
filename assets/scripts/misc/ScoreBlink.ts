import { _decorator, Color, Component, dragonBones, Label } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { SkinsManager } from "../configs/Skins/SkinsManager";
import { Node } from "cc";
const { ccclass } = _decorator;

// 无特效
// enum ScoreBlinkState {
//     IDLE = "blue_init",
//     ACTIVE = "blue_in_1",
//     END = "blue_out",
// }
// 幻影晃动
// enum ScoreBlinkState {
//     IDLE = "cyan_init",
//     ACTIVE = "cyan_in_1",
//     END = "cyan_out",
// }
// 旋转冒气儿哈哈
enum ScoreBlinkState {
    IDLE = "yellow_init",
    ACTIVE = "yellow_in_1",
    END = "yellow_out",
}
@ccclass("ScoreBlink")
export class ScoreBlink extends Component {
    private _4acitve: Node = null;
    private _4idle: Node = null;
    private _scoreLabel: Node = null;
    onLoad() {
        this._4acitve = this.node.getChildByName("Active");
        this._4idle = this.node.getChildByName("Idle");
        this._scoreLabel = this.node.getChildByName("Score");
        this.initColors();
        this._4acitve.x = -100000;
        this._4idle.x = -100000;
        eventManager.on(GameEvent.GAME_HEART_SHOW, this.onComboActive, this);
        eventManager.on(GameEvent.GAME_HEART_HIDE, this.onComboEnd, this);
        eventManager.on(GameEvent.GAME_SCORE_UPDATE, this.onScoreUpdate, this);
    }
    initColors() {
        const tipColor = SkinsManager.getInstance().getTipColor(1);
        if (tipColor) {
            this._4acitve.getComponent(dragonBones.ArmatureDisplay).color = new Color().fromHEX(tipColor.inColor);
            this._4idle.getComponent(dragonBones.ArmatureDisplay).color = new Color().fromHEX(tipColor.initColor);
        }
    }

    onComboActive() {
        this._4acitve.x = 0;
        this._4idle.x = 0;
        this._4acitve.getComponent(dragonBones.ArmatureDisplay).playAnimation(ScoreBlinkState.ACTIVE, 1);
        this._4idle.getComponent(dragonBones.ArmatureDisplay).playAnimation(ScoreBlinkState.IDLE, 0);
    }

    onComboEnd() {
        this._4idle.getComponent(dragonBones.ArmatureDisplay).playAnimation(ScoreBlinkState.END, 1);
        this._4idle.getComponent(dragonBones.ArmatureDisplay).once(
            dragonBones.EventObject.COMPLETE,
            (event: dragonBones.EventObject) => {
                if (event.animationState.name === ScoreBlinkState.END) {
                    this._4idle.x = -100000;
                    this._4acitve.x = -100000;
                }
            },
            this
        );
    }
    onScoreUpdate(score: number) {
        this._scoreLabel.getComponent(Label).string = score.toString();
    }
}
