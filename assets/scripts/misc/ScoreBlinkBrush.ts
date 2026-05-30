import { _decorator, Component, dragonBones, Label, Node } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { isPlatformTiktok } from "../utils/tool";

const { ccclass, property } = _decorator;

enum ScoreBlinkBrushState {
    IDLE = "newAnimation",
    ACTIVE = "newAnimation_2",
    END = "newAnimation_1",
}
@ccclass("ScoreBlinkBrush")
export class ScoreBlinkBrush extends Component {
    private _amature: dragonBones.ArmatureDisplay = null;
    private _scoreLabel: Node = null;

    onLoad() {
        if (isPlatformTiktok()) {
            this.node.y -= 35;
        }
        this._amature = this.node.getChildByName("Dragon").getComponent(dragonBones.ArmatureDisplay);
        this._scoreLabel = this.node.getChildByName("Score");
        this._amature.node.x = -100000;
        eventManager.on(GameEvent.GAME_HEART_SHOW, this.onComboActive, this);
        eventManager.on(GameEvent.GAME_HEART_HIDE, this.onComboEnd, this);
        eventManager.on(GameEvent.GAME_SCORE_UPDATE, this.onScoreUpdate, this);
    }

    onComboActive() {
        this._amature.node.x = 0;
        this._amature.once(
            dragonBones.EventObject.COMPLETE,
            (event: dragonBones.EventObject) => {
                if (event.animationState.name === ScoreBlinkBrushState.ACTIVE) {
                    this._amature.playAnimation(ScoreBlinkBrushState.IDLE, 0);
                }
            },
            this,
        );
        this._amature.playAnimation(ScoreBlinkBrushState.ACTIVE, 1);
    }

    onComboEnd() {
        this._amature.playAnimation(ScoreBlinkBrushState.END, 1);
        this._amature.once(
            dragonBones.EventObject.COMPLETE,
            (event: dragonBones.EventObject) => {
                if (event.animationState.name === ScoreBlinkBrushState.END) {
                    this._amature.node.x = -100000;
                }
            },
            this,
        );
    }
    onScoreUpdate(score: number) {
        this._scoreLabel.getComponent(Label).string = score.toString();
    }
}
