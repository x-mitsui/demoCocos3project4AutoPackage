import { _decorator, Color, Component, dragonBones, Label, Node } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { SkinsManager } from "../configs/Skins/SkinsManager";
const { ccclass } = _decorator;

enum ScoreBlinkHeartState {
    IDLE = "newAnimation",
    ACTIVE = "newAnimation_2",
    END = "newAnimation_1",
}
@ccclass("ScoreBlinkHeart")
export class ScoreBlinkHeart extends Component {
    private _scoreLabel: Node = null;
    private _amature: dragonBones.ArmatureDisplay = null;

    onLoad() {
        this._scoreLabel = this.node.getChildByName("Score");
        this._amature = this.node.getChildByName("Dragon").getComponent(dragonBones.ArmatureDisplay);

        this._amature.node.x = -100000;
        eventManager.on(GameEvent.GAME_HEART_SHOW, this.onComboActive, this);
        eventManager.on(GameEvent.GAME_HEART_HIDE, this.onComboEnd, this);
        eventManager.on(GameEvent.GAME_SCORE_UPDATE, this.onScoreUpdate, this);
    }
    initColors() {
        const tipColor = SkinsManager.getInstance().getTipColor(1);
        if (tipColor) {
            this._amature.color = new Color().fromHEX(tipColor.initColor);
        }
    }

    onComboActive() {
        this._amature.node.x = 0;

        this._amature.once(
            dragonBones.EventObject.COMPLETE,
            (event: dragonBones.EventObject) => {
                if (event.animationState.name === ScoreBlinkHeartState.ACTIVE) {
                    this._amature.playAnimation(ScoreBlinkHeartState.IDLE, 0);
                }
            },
            this
        );
        this._amature.playAnimation(ScoreBlinkHeartState.ACTIVE, 1);
    }

    onComboEnd() {
        this._amature.playAnimation(ScoreBlinkHeartState.END, 1);
        this._amature.once(
            dragonBones.EventObject.COMPLETE,
            (event: dragonBones.EventObject) => {
                if (event.animationState.name === ScoreBlinkHeartState.END) {
                    this._amature.node.x = -100000;
                }
            },
            this
        );
    }
    onScoreUpdate(score: number) {
        this._scoreLabel.getComponent(Label).string = score.toString();
    }
}
