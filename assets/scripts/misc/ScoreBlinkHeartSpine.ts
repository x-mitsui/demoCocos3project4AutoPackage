import { _decorator, Component, Label, Node, sp } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("ScoreBlinkHeartSpine")
export class ScoreBlinkHeartSpine extends Component {
    private _scoreLabel: Node = null;
    private _amature: sp.Skeleton = null;

    @property({ tooltip: "闲置动画" })
    idle: string = "init_2";
    @property({ tooltip: "活跃动画" })
    active: string = "in_2";
    @property({ tooltip: "结束动画" })
    end: string = "out_2";
    onLoad() {
        this._amature = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this._scoreLabel = this._amature.node.getChildByName("Node").getChildByName("Score");

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
            if (finishedName === this.active) {
                this._amature.setAnimation(0, this.idle, true);
            }
        });
        this._amature.setAnimation(0, this.active, false);
    }

    onComboEnd() {
        this._amature.setAnimation(0, this.end, false);
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
            if (finishedName === this.end) {
                this._amature.node.x = -100000;
            }
        });
    }
    onScoreUpdate(score: number) {
        this._scoreLabel.getComponent(Label).string = score.toString();
    }
}
