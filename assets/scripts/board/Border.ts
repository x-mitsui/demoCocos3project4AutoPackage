import { _decorator, Color, Component, Material, Sprite } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
import {
    initGradientMat,
    initRotateMat,
    initWaveMat,
    initBreathMat,
    initGlitterMat,
    initRippleMat,
    initBurstMat,
} from "./BorderShaderInit";
import { SkinsManager } from "../configs/Skins/SkinsManager";
import { Tool } from "../utils/tool";
const { ccclass, property } = _decorator;

// technique 索引与 colorfulBorder.effect 中的顺序一一对应
const enum Technique {
    Plain = 0,
    Gradient = 1,
    ColorfulRotate = 2,
    ColorfulWave = 3,
    ColorfulBreath = 4,
    ColorfulGlitter = 5,
    ColorfulRipple = 6,
    ColorfulBurst = 7, // 专用于 burstAura 节点，加法混合
}

@ccclass("Border")
export class Border extends Component {
    @property({ tooltip: "彩色特效持续时间（秒）" })
    effectDuration: number = 1.5;

    /**
     * 可选：比边框更大的透明精灵节点，用于 colorful-burst 效果。
     * 将一个子节点（Sprite，使用相同的 colorfulBorder.effect 材质）
     * 设为边框的 1.4~2 倍大小并拖入此处；初始状态无需手动隐藏。
     */
    @property({ type: Sprite, tooltip: "光环幅散光晕节点（比边框大 1.4-2 倍的透明精灵）" })
    burstAura: Sprite = null;

    /** burstAura 节点中边框边缘的归一化 UV 距离（配合节点缩放调整） */
    @property({ tooltip: "burst 边框半径（节点=1.4× 边框时约 0.36）" })
    burstBorderRadius: number = 0.35;

    private _sprite: Sprite = null;
    private _mats: Partial<Record<Technique, Material>> = {};
    private _burstMat: Material = null;

    protected onLoad(): void {
        this._sprite = this.getComponent(Sprite);
        const shared = this._sprite.getSharedMaterial(0);
        this.changeColor();

        // 为每个 technique 创建独立 Material（只初始化一次，避免 "already initialized" 警告）
        const techniqueList: Technique[] = [
            Technique.Plain,
            Technique.Gradient,
            Technique.ColorfulRotate,
            Technique.ColorfulWave,
            Technique.ColorfulBreath,
            Technique.ColorfulGlitter,
            Technique.ColorfulRipple,
        ];
        for (const t of techniqueList) {
            const mat = new Material();
            mat.initialize({ effectAsset: shared.effectAsset, technique: t });
            this._mats[t] = mat;
        }

        // 初始化各 technique 的默认属性
        initGradientMat(this._mats[Technique.Gradient]);
        initRotateMat(this._mats[Technique.ColorfulRotate]);
        initWaveMat(this._mats[Technique.ColorfulWave]);
        initBreathMat(this._mats[Technique.ColorfulBreath]);
        initGlitterMat(this._mats[Technique.ColorfulGlitter]);
        initRippleMat(this._mats[Technique.ColorfulRipple]);

        // burstAura 单独初始化（加法混合 technique）
        if (this.burstAura) {
            this._burstMat = new Material();
            this._burstMat.initialize({ effectAsset: shared.effectAsset, technique: Technique.ColorfulBurst });
            initBurstMat(this._burstMat, this.burstBorderRadius);
            this.burstAura.setSharedMaterial(this._burstMat, 0);
            this.burstAura.node.active = false;
        }

        eventManager.on(GameEvent.GAME_COLOR_CHANGE, this.changeColor, this);
        // eventManager.on(GameEvent.GAME_HEART_SHOW, this.playColorfulRotateShader, this);
        // eventManager.on(GameEvent.GAME_COMBO_ANIMATION_END, this.resetShader, this);
    }

    changeColor() {
        const borderConfig = SkinsManager.getInstance().getBorderColor();
        Logger.info("Border:changeColor:", "borderConfig:", borderConfig);
        if (borderConfig) {
            Tool.setNodeGradient(this.node, borderConfig);
        }
    }

    protected onDestroy(): void {
        eventManager.off(GameEvent.GAME_HEART_SHOW, this.playColorfulRotateShader, this);
        eventManager.off(GameEvent.GAME_COMBO_ANIMATION_END, this.resetShader, this);
        this.unschedule(this._hideBurstAura);
    }

    // ─── 核心切换 ────────────────────────────────────────────────────────────

    private _playEffect(technique: Technique): void {
        Logger.info("Border", "playEffect", technique);
        this._sprite.setSharedMaterial(this._mats[technique], 0);
        this.unschedule(this.resetShader);
        this.scheduleOnce(this.resetShader, this.effectDuration);
    }

    resetShader(): void {
        this._sprite.setSharedMaterial(this._mats[Technique.Gradient], 0);
        this.unschedule(this.resetShader);
    }

    // ─── 公开播放接口 ────────────────────────────────────────────────────────

    playGradientShader() {
        this._playEffect(Technique.Gradient);
    }
    playColorfulRotateShader() {
        this._playEffect(Technique.ColorfulRotate);
    }
    playColorfulWaveShader() {
        this._playEffect(Technique.ColorfulWave);
    }
    /** 呼吸灯：色相缓慢循环 + 亮度 sin 呼吸 */
    playColorfulBreathShader() {
        this._playEffect(Technique.ColorfulBreath);
    }
    /** 星光闪烁：UV 格子独立随机亮灭 */
    playColorfulGlitterShader() {
        this._playEffect(Technique.ColorfulGlitter);
    }
    /** 彩色涟漪：多圈光环从中心向四周扩散（边框范围内） */
    playColorfulRippleShader() {
        this._playEffect(Technique.ColorfulRipple);
    }

    /**
     * 彩色光环爆发：光环脱离边框向外幅散（需配置 burstAura 节点）。
     * shapeBlend: 0=圆形，1=正方形，可在运行时动态修改
     */
    playColorfulBurstShader(shapeBlend?: number): void {
        if (!this.burstAura) {
            Logger.warn("Border", "burstAura 未设置，请在 Inspector 中指定光晕节点");
            return;
        }
        if (shapeBlend !== undefined) {
            this._burstMat.setProperty("shapeBlend", shapeBlend);
        }
        this.burstAura.node.active = true;
        this.unschedule(this._hideBurstAura);
        this.scheduleOnce(this._hideBurstAura, this.effectDuration);
    }

    private _hideBurstAura(): void {
        if (this.burstAura) this.burstAura.node.active = false;
    }
}
