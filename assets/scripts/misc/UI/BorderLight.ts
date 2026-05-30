import { _decorator, Color, Component, dragonBones, Node } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { Logger } from "../../utils/logger";
import { SkinsManager } from "../../configs/Skins/SkinsManager";
import { GameManager } from "../../managers/GameManager";
const { ccclass, property } = _decorator;

@ccclass("BorderLight")
export class BorderLight extends Component {
    armatureDisplay: dragonBones.ArmatureDisplay = null;
    @property({ type: [String], tooltip: "指定动画名称列表" })
    specifiedAnimationNameList: string[] = [];
    animationIndex: number = 0;
    animationNames: string[] = [];

    @property({ tooltip: "彩虹变色速度（度/秒）" })
    colorCycleSpeed: number = 180;

    private _colorHue: number = 0;
    private _colorCycleFn: (() => void) | null = null;

    onLoad(): void {
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay);
        this.armatureDisplay.color = new Color().fromHEX("#FFFFFF00");

        // 优先从龙骨数据自动读取动画列表，读不到才降级用编辑器配置的
        if (this.specifiedAnimationNameList && this.specifiedAnimationNameList.length > 0) {
            this.animationNames = this.specifiedAnimationNameList;
        } else {
            const armature = this.armatureDisplay.armature();
            if (armature) {
                this.animationNames = armature.armatureData.animationNames;
            }
        }

        eventManager.on(GameEvent.GAME_CLEAR_ANIMATION_START, this.play, this);
    }

    onDestroy(): void {
        eventManager.off(GameEvent.GAME_CLEAR_ANIMATION_START, this.play, this);
        this._stopColorCycle();
    }

    play(blockIndex: number) {
        if (!GameManager.instance.enableColorfulBorderEliminateAnimation) {
            blockIndex = GameManager.instance.enableChangeColor ? 1 : blockIndex;
            const aniConfig = SkinsManager.getInstance().getEliminateConfigByBlockIndex(blockIndex);
            this.armatureDisplay.color = new Color().fromHEX(aniConfig.middle);
            Logger.info("BorderLight:play:", "aniConfig", "====================");
        } else {
            this._colorHue = 0;
            this._startColorCycle();
        }
        Logger.info(
            "BorderLight:play:",
            "animationNames",
            this.animationNames[this.animationIndex % this.animationNames.length],
            1,
        );
        this.armatureDisplay.playAnimation(this.animationNames[this.animationIndex % this.animationNames.length], 1);

        this.animationIndex++;
        this.armatureDisplay.on(
            dragonBones.EventObject.COMPLETE,
            () => {
                this._stopColorCycle();
                this.armatureDisplay.color = new Color().fromHEX("#FFFFFF00");
            },
            this,
        );
    }

    private _startColorCycle() {
        this._stopColorCycle();
        this._colorCycleFn = () => {
            this._colorHue = (this._colorHue + this.colorCycleSpeed * (1 / 60)) % 360;
            this.armatureDisplay.color = this._hslToColor(this._colorHue, 1.0, 0.6);
        };
        this.schedule(this._colorCycleFn, 0);
    }

    private _stopColorCycle() {
        if (this._colorCycleFn) {
            this.unschedule(this._colorCycleFn);
            this._colorCycleFn = null;
        }
    }

    private _hslToColor(h: number, s: number, l: number): Color {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0,
            g = 0,
            b = 0;
        if (h < 60) {
            r = c;
            g = x;
            b = 0;
        } else if (h < 120) {
            r = x;
            g = c;
            b = 0;
        } else if (h < 180) {
            r = 0;
            g = c;
            b = x;
        } else if (h < 240) {
            r = 0;
            g = x;
            b = c;
        } else if (h < 300) {
            r = x;
            g = 0;
            b = c;
        } else {
            r = c;
            g = 0;
            b = x;
        }
        return new Color(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), 255);
    }
}
