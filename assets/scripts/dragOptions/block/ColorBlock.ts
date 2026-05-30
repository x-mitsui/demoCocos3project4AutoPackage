import { _decorator, Color, Material, Sprite, SpriteFrame, Tween, Vec4, tween } from "cc";
import { Logger } from "../../utils/logger";
import { SuperBlock } from "./SuperBlock";
import { GEM_SKINS_START_INDEX, GemSkinsManager } from "../../managers/GemSkinsManager";
import { GameManager } from "../../managers/GameManager";

const { ccclass, property } = _decorator;

interface ColorPair {
    top: Color;
    bottom: Color;
}

/**
 * ColorBlock — 第三种方块渲染风格
 *
 * 材质：colorBlock.mtl（colorBlock.effect）
 * 效果：顶色→底色双色线性渐变 + 可选 Sprite 木纹叠加 + brightness
 *
 * 使用前提：节点 Sprite 的 customMaterial 设为 colorBlock.mtl
 *
 * 核心 API：
 *   setGradientColors(top, bottom)  —— 直接指定顶色和底色
 *   setTileColor(color)             —— 单色模式（自动推导顶亮底暗）
 *   switchSkin(blockIndex)          —— 内置 7 色彩虹双色表（1-7）
 *   setBrightness(val)              —— 亮度（hint 高亮用）
 *   setTextureBlend(val)            —— 木纹可见度（0=纯渐变, 1=完全木纹叠加）
 */
@ccclass("ColorBlock")
export class ColorBlock extends SuperBlock {
    @property({ type: SpriteFrame, tooltip: "底图精灵帧（木纹方块），textureBlend > 0 时生效" })
    defaultSkin: SpriteFrame = null;
    @property({ type: Material, tooltip: "colorBlock.mtl 材质资源，用于动态临时替换拖拽选项块的材质" })
    colorBlockMaterial: Material = null;

    /** 8 色双色渐变表（可从 DragOption 直接读取，循环使用） */
    static readonly LINE_PALETTE: ColorPair[] = [
        { top: new Color(158, 123, 224, 255), bottom: new Color(128, 128, 230, 255) }, // 1: 紫蓝
        { top: new Color(128, 128, 230, 255), bottom: new Color(204, 128, 255, 255) }, // 2: 蓝紫
        { top: new Color(30, 179, 146, 255), bottom: new Color(68, 175, 207, 255) }, // 3: 青
        { top: new Color(50, 209, 69, 255), bottom: new Color(48, 209, 152, 255) }, // 4: 绿
        { top: new Color(116, 180, 11, 255), bottom: new Color(57, 214, 54, 255) }, // 5: 黄绿
        { top: new Color(216, 168, 8, 255), bottom: new Color(166, 193, 9, 255) }, // 6: 黄
        { top: new Color(229, 100, 29, 255), bottom: new Color(251, 211, 57, 255) }, // 7: 橙
        { top: new Color(203, 24, 15, 255), bottom: new Color(243, 122, 63, 255) }, // 8: 红橙
    ];

    onLoad() {
        super.onLoad();
    }

    // ─────────────────────────────── SuperBlock interface ────────────────────

    public init(blockIndex: number): void {
        this.switchSkin(blockIndex);
        this.initSize();
    }

    /** 按位置索引（0-based）循环取 LINE_PALETTE，可传列数或行数 */
    public switchSkin(blockIndex: number): void {
        // this.applyColorBlockMaterial(posIndex);
    }

    /** preClear 渐变动画：颜色上下流动 + 亮度脉冲，两者同步驱动 */
    private _animTween: Tween<{ phase: number }> | null = null;

    public applyColorBlockMaterial(posIndex: number): void {
        const sprite = this.node.getComponent(Sprite);
        sprite.customMaterial = this.colorBlockMaterial;

        // technique 0=线性, 1=径向, 2=风车（优先级：风车 > 径向 > 线性）
        const gm = GameManager.instance;
        const techniqueIndex = gm.enableWindmillColorBlock ? 2 : gm.enableRadialColorBlock ? 1 : 0;
        const matInst = sprite.getMaterialInstance(0);
        matInst.initialize({
            effectAsset: this.colorBlockMaterial.effectAsset,
            technique: techniqueIndex,
        });
        this._materialInstance = matInst;

        const pair = ColorBlock.LINE_PALETTE[posIndex % ColorBlock.LINE_PALETTE.length];
        const alt = ColorBlock.LINE_PALETTE[(posIndex + 4) % ColorBlock.LINE_PALETTE.length];
        this.blockIndex = posIndex;

        if (techniqueIndex === 2) {
            // 风车模式：初始化参数，然后驱动旋转动画
            this._materialInstance.setProperty("topColor", pair.top);
            this._materialInstance.setProperty("bottomColor", pair.bottom);
            this._materialInstance.setProperty("bladeColorC", alt.top);
            this._materialInstance.setProperty("bladeColorD", alt.bottom);
            this._materialInstance.setProperty("tileParams", new Vec4(0.02, 1.51, 0.35, 0.85));
            if (gm.enableColorfulPreEliminateAnimation) {
                this._startWindmillAni(pair);
            }
        } else {
            this.setProperties(pair.top, pair.bottom, 1, 1.51, 0.35, 0.02);
            if (gm.enableColorfulPreEliminateAnimation) {
                this._startGradientAni(pair);
            }
        }
    }

    public deleteColorBlockMaterial(): void {
        this._animTween?.stop();
        this._animTween = null;
        this.node.getComponent(Sprite).customMaterial = null;
        this._materialInstance = null;
    }

    private _startGradientAni(pair: { top: Color; bottom: Color }): void {
        this._animTween?.stop();
        const pass = this._materialInstance?.passes[0];
        if (!pass) return;

        const paramsHandle = pass.getHandle("tileParams");

        // 固定分量缓存，只每帧修改 y（brightness）
        const BW = 0.02,
            BD = 0.35,
            TB = 1.0;
        const BASE_B = 1.51;
        const AMP_B = Math.max(0, GameManager.instance.colorBlockBreathAmplitude ?? 0);
        const tileVec = new Vec4(BW, BASE_B, BD, TB);

        // 预分配复用，避免每帧 GC
        const animTop = new Color();
        const animBot = new Color();

        /** 线性插值颜色分量（Color 用 0-255 整数） */
        const lerpCol = (a: Color, b: Color, t: number, out: Color) => {
            out.r = (a.r + (b.r - a.r) * t) | 0;
            out.g = (a.g + (b.g - a.g) * t) | 0;
            out.b = (a.b + (b.b - a.b) * t) | 0;
            out.a = 255;
        };

        const proxy = { phase: 0 }; // 0→1：原始→对调；1→0：对调→原始

        const applyFrame = () => {
            const t = proxy.phase;
            // 颜色流动：t=0 保持原始，t=1 顶底颜色完全对调
            lerpCol(pair.top, pair.bottom, t, animTop);
            lerpCol(pair.bottom, pair.top, t, animBot);
            this._materialInstance?.setProperty("topColor", animTop);
            this._materialInstance?.setProperty("bottomColor", animBot);
            // 亮度脉冲：在流动中点（t≈0.5）时最亮，用余弦曲线映射
            tileVec.y = BASE_B + AMP_B * Math.sin(t * Math.PI);
            if (paramsHandle !== undefined) pass.setUniform(paramsHandle, tileVec);
        };

        this._animTween = tween(proxy)
            .to(2.5, { phase: 1 }, { easing: "sineInOut", onUpdate: applyFrame })
            .to(2.5, { phase: 0 }, { easing: "sineInOut", onUpdate: applyFrame })
            .union()
            .repeatForever()
            .start();
    }

    /**
     * 风车旋转动画：持续旋转相位 0→1（=一整圈），叠加亮度脉冲。
     * windmillParams: x=叶片数, y=扭曲, z=旋转相位, w=边缘柔和度
     */
    private _startWindmillAni(pair: { top: Color; bottom: Color }): void {
        this._animTween?.stop();
        const pass = this._materialInstance?.passes[0];
        if (!pass) return;

        const tileHandle  = pass.getHandle("tileParams");
        const windHandle  = pass.getHandle("windmillParams");

        const BASE_B = 1.51;
        const AMP_B = Math.max(0, GameManager.instance.colorBlockBreathAmplitude ?? 0);
        const tileVec = new Vec4(0.02, BASE_B, 0.35, 0.85);
        // x=叶片数, y=扭曲度, z=相位(动画), w=叶边柔和度
        const windVec = new Vec4(4.0, 0.4, 0, 0.12);

        const proxy = { phase: 0 }; // 0→1 = 整整转一圈

        const applyFrame = () => {
            windVec.z = GameManager.instance.enableWindmillClockwise ? 1 - proxy.phase : proxy.phase;
            if (windHandle  !== undefined) pass.setUniform(windHandle,  windVec);
            // 亮度脉冲与旋转同步（每半圈到峰值）
            tileVec.y = BASE_B + AMP_B * Math.sin(proxy.phase * Math.PI * 2);
            if (tileHandle !== undefined) pass.setUniform(tileHandle, tileVec);
        };

        this._animTween = tween(proxy)
            .to(3.0, { phase: 1 }, { easing: "linear", onUpdate: applyFrame })
            .call(() => {
                proxy.phase = 0;
                applyFrame();
            })
            .union()
            .repeatForever()
            .start();
    }

    // ──────────   ───────────────────── ColorBlock-only API ─────────────────────

    /**
     * 一次性写入所有 shader 参数，避免多次 setProperty(target) 分量互相覆盖的问题。
     *
     * tileParams 布局（与 colorBlock.effect 保持一致）：
     *   x = borderWidth, y = brightness, z = borderDarken, w = textureBlend
     *
     * ⚠️ 不要用 setProperty("brightness",…) 等单独的 target 属性分开写，
     *    在克隆材质实例上每次读-改-写同一 vec4 可能导致分量互相覆盖。
     */
    public setProperties(
        top: Color,
        bottom: Color,
        textureBlend: number,
        brightness: number,
        borderDarken: number,
        borderWidth: number,
    ): void {
        if (!this._materialInstance) return;
        this._materialInstance.setProperty("topColor", top);
        this._materialInstance.setProperty("bottomColor", bottom);
        // 整个 vec4 一次写入，x=borderWidth y=brightness z=borderDarken w=textureBlend
        this._materialInstance.setProperty("tileParams", new Vec4(borderWidth, brightness, borderDarken, textureBlend));
    }
    // 拦截父类的setBrightness方法
    setBrightness() {}
}
