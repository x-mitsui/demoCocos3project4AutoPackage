import { _decorator, Component, find, Label, log, Node, UITransform } from "cc";
import { GameEvent } from "../managers/EventManager";
import { eventManager } from "../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("CountDown")
export class CountDown extends Component {
    x_end = 158;
    x_start = -182;
    @property
    totalTime = 60;
    @property
    countDownStep = 1;
    maskTotalLength = 412;
    /** 倒计时开始时的总时长，用于计算进度条比例 */
    private initialTotalTime = 60;

    protected onLoad(): void {
        this.maskTotalLength = find("BarMask/Bar", this.node).getComponent(UITransform).width;
        this.updateBar();

        eventManager.once(GameEvent.GAME_START_COUNT_DOWN, this.beginCountDown, this);
    }
    beginCountDown() {
        log("beginCountDown");
        this.initialTotalTime = this.totalTime;
        this.schedule((dt) => {
            this.totalTime -= this.countDownStep;
            this.updateBar();
            if (this.totalTime <= 0) {
                this.unscheduleAllCallbacks();
                eventManager.emit(GameEvent.GAME_END);
            }
        }, 1);
    }
    updateBar() {
        const barMask = find("BarMask", this.node);
        const remainingRatio = Math.max(0, this.totalTime) / this.initialTotalTime;
        barMask.getComponent(UITransform).width = this.maskTotalLength * remainingRatio;

        const labelTimeLeft = find("TimeLeft", this.node);
        labelTimeLeft.getComponent(Label).string = parseInt(this.totalTime.toString()) + "s";
    }
}
