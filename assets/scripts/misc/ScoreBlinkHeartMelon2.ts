import { _decorator, Component, find, Label, Node, sp } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
const { ccclass } = _decorator;

enum ScoreBlinkHeartState1 {
    IDLE = "init_1",
    ACTIVE = "in_1",
    END = "out_1",
}
enum ScoreBlinkHeartState2 {
    IDLE = "init_2",
    ACTIVE = "in_2",
    END = "out_2",
}
enum ScoreBlinkHeartState3 {
    IDLE = "init_3",
    ACTIVE = "in_3",
    END = "out_3",
}
const BlinkHeartStates = [ScoreBlinkHeartState1, ScoreBlinkHeartState2, ScoreBlinkHeartState3];
@ccclass("ScoreBlinkHeartMelon2")
export class ScoreBlinkHeartMelon2 extends Component {
    private _scoreLabel: Node = null;
    private _amature: sp.Skeleton = null;
    private _scoreBlinkHeartStateIndex = 1;
    private _scoreBlinkHeartState = null;
    private _isPlaying = false;

    onLoad() {
        this._scoreBlinkHeartState = BlinkHeartStates[this._scoreBlinkHeartStateIndex];
        this._amature = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this._scoreLabel = find("Node/Score", this._amature.node) || find("Score", this.node);

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
            if (finishedName === this._scoreBlinkHeartState.ACTIVE) {
                this._amature.setAnimation(0, this._scoreBlinkHeartState.IDLE, true);
            }
        });
        this._amature.setAnimation(0, this._scoreBlinkHeartState.ACTIVE, false);
        this._isPlaying = true;
    }

    onComboEnd() {
        if (!this._isPlaying) return;
        this._amature.setAnimation(0, this._scoreBlinkHeartState.END, false);
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
            if (finishedName === this._scoreBlinkHeartState.END) {
                this._scoreBlinkHeartStateIndex = (this._scoreBlinkHeartStateIndex + 1) % BlinkHeartStates.length;
                Logger.info("ScoreBlinkHeartMelon2:onComboEnd:", "切换到下一个动画:", this._scoreBlinkHeartStateIndex);
                this._scoreBlinkHeartState = BlinkHeartStates[this._scoreBlinkHeartStateIndex];
                this._amature.node.x = -100000;
                this._isPlaying = false;
            }
        });
    }
    onScoreUpdate(score: number) {
        this._scoreLabel.getComponent(Label).string = score.toString();
    }
}
