import { _decorator, Component, find, Label, Node, sp } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
const { ccclass } = _decorator;

enum ScoreBlinkHeartState {
    IDLE = "init_2",
    ACTIVE = "in_2",
    END = "out_2",
}
@ccclass("ScoreBlinkHeartMelon")
export class ScoreBlinkHeartMelon extends Component {
    private _scoreLabel: Node = null;
    private _amature: sp.Skeleton = null;

    onLoad() {
        this._amature = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this._scoreLabel = find("Node/Score", this._amature.node);

        this._amature.node.x = -100000;
        eventManager.on(GameEvent.GAME_HEART_SHOW, this.onComboActive, this);
        eventManager.on(GameEvent.GAME_HEART_HIDE, this.onComboEnd, this);
        eventManager.on(GameEvent.GAME_SCORE_UPDATE, this.onScoreUpdate, this);
    }

    onComboActive() {
        Logger.info("ScoreBlinkHeartMelon:onComboActive:", "onComboActive");
        this._amature.node.x = 0;

        // 用 setCompleteListener：动画一次播完时触发（setEndListener 是轨道条目被移出时，切动画时顺序易混）
        this._amature.setCompleteListener((trackEntry: sp.spine.TrackEntry) => {
            const finishedName = trackEntry?.animation?.name ?? "";
            const playingNow = this._amature.getCurrent(0)?.animation?.name ?? "";
            Logger.info(
                "ScoreBlinkHeartMelon:onComboActive:",
                "本次结束的动画:",
                finishedName,
                "| 当前轨道动画:",
                playingNow,
            );
            if (finishedName === ScoreBlinkHeartState.ACTIVE) {
                this._amature.setAnimation(0, ScoreBlinkHeartState.IDLE, true);
            }
        });
        this._amature.setAnimation(0, ScoreBlinkHeartState.ACTIVE, false);
    }

    onComboEnd() {
        this._amature.setAnimation(0, ScoreBlinkHeartState.END, false);
        this._amature.setCompleteListener((trackEntry: sp.spine.TrackEntry) => {
            const finishedName = trackEntry?.animation?.name ?? "";
            const playingNow = this._amature.getCurrent(0)?.animation?.name ?? "";
            Logger.info(
                "ScoreBlinkHeartMelon:onComboEnd:",
                "本次结束的动画:",
                finishedName,
                "| 当前轨道动画:",
                playingNow,
            );
            if (finishedName === ScoreBlinkHeartState.END) {
                this._amature.node.x = -100000;
            }
        });
    }
    onScoreUpdate(score: number) {
        this._scoreLabel.getComponent(Label).string = score.toString();
    }
}
