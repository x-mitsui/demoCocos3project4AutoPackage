import { _decorator, Component, Sprite, tween, Tween } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { GameManager } from "../../managers/GameManager";
const { ccclass, property } = _decorator;

@ccclass("Breathe")
export class Breathe extends Component {
    @property({ tooltip: "呼吸峰值亮度" })
    peakBrightness: number = 1.1;

    @property({ tooltip: "单次呼吸时长（秒）" })
    duration: number = 2;

    private _tween: Tween<{ brightness: number }> | null = null;

    onLoad(): void {
        eventManager.on(GameEvent.GAME_CLEAR_ANIMATION_START, this.play, this);
    }
    onDestroy(): void {
        eventManager.off(GameEvent.GAME_CLEAR_ANIMATION_START, this.play, this);
        this._stop();
    }

    play(_blockIndex: number) {
        if (!GameManager.instance.enableBackgroundBreatheAnimation) return;
        const mat = this.node.getComponent(Sprite)?.getMaterialInstance(0);
        if (!mat) return;

        // brightness.mtl 的 brightness 是独立 float property，直接 setProperty 即可
        const applyBrightness = (b: number) => mat.setProperty("brightness", b);

        this._stop();
        const proxy = { brightness: 1.0 };
        this._tween = tween(proxy)
            .to(
                this.duration,
                { brightness: this.peakBrightness },
                {
                    easing: "sineOut",
                    onUpdate: () => applyBrightness(proxy.brightness),
                },
            )
            .to(
                this.duration,
                { brightness: 1.0 },
                {
                    easing: "sineIn",
                    onUpdate: () => applyBrightness(proxy.brightness),
                },
            )
            .call(() => applyBrightness(1.0))
            .start();
    }

    private _stop() {
        this._tween?.stop();
        this._tween = null;
    }
}
