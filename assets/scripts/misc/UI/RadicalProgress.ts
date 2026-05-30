import { _decorator, Component, find, Node, ProgressBar } from "cc";
import { Logger } from "../../utils/logger";
import { AudioManager } from "../../managers/AudioManager";
const { ccclass, property } = _decorator;

@ccclass("RadicalProgress")
export class RadicalProgress extends Component {
    endCallback: Function = null;
    bar: ProgressBar = null;
    @property({ tooltip: "倒计时时长" })
    duration: number = 5;
    onLoad(): void {
        this.bar = find("Bar", this.node).getComponent(ProgressBar);
    }
    onDestroy() {
        this.unschedule(this._onCountdownTick);
    }
    startCountdown(duration?: number, endCallback?: Function) {
        if (duration) {
            this.duration = duration;
        }
        if (endCallback) {
            this.endCallback = endCallback;
        }
        this.bar.progress = 0;
        this.schedule(this._onCountdownTick, 0);
    }
    currentTotalTime = 0;
    private _lastPlayedSecond = -1;
    private _onCountdownTick(dt: number) {
        this.currentTotalTime += dt;
        // 每过一个整秒播放一次音效
        const currentSecond = Math.floor(this.currentTotalTime);
        Logger.info(
            "RadicalProgress:_onCountdownTick:",
            "currentSecond",
            currentSecond,
            this._lastPlayedSecond,
            currentSecond !== this._lastPlayedSecond,
        );
        if (currentSecond !== this._lastPlayedSecond) {
            Logger.info("RadicalProgress:_onCountdownTick:play countdown effect");
            this._lastPlayedSecond = currentSecond;
            AudioManager.instance.playCountdownEffect();
        }
        this.bar.progress += (1.25 * dt) / this.duration;
        Logger.info(
            "RadicalProgress:_onCountdownTick:",
            "progress",
            this.bar.progress,
            "current total time",
            this.currentTotalTime,
        );
        if (this.bar.progress >= 1) {
            this.bar.progress = 1;
            this.unschedule(this._onCountdownTick);
            this.endCallback && this.endCallback();
        }
    }
}
