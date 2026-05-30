import { _decorator, Node, Sprite, Vec4 } from "cc";
import { themeConfig } from "../../configs/config";
import { BlockColorPackageID, SkinsManager, SkinSystemId } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { SuperBlock } from "./SuperBlock";
import { GemSkinsManager } from "../../managers/GemSkinsManager";
import { GameManager } from "../../managers/GameManager";

const { ccclass, property } = _decorator;

/**
 * ShaderBlock 皮肤应用组件
 * 用法：
 * 1. 挂载到带有 Sprite 组件的 ShaderBlock 节点上
 * 2. 在编辑器选择默认皮肤系统和颜色
 * 3. 代码里调用 applySkin(skinId, colorId) 动态切换皮肤
 */
@ccclass("ShaderBlock")
export class ShaderBlock extends SuperBlock {
    @property({ tooltip: "只为了调试，皮肤系统索引" })
    skinSystemIndex: number = 0;

    private _currentSkinSystemId: string = "skin_1000";
    public blockIndex: number = 1;
    onLoad() {
        super.onLoad();
        // 防止后续没设置导致找不到
        this._currentSkinSystemId = themeConfig.SkinSystemID as SkinSystemId;
    }

    /**
     * 应用皮肤
     * @param skinId 皮肤系统代号，如 "skin_1000", "skin_1001"
     * @param colorPackageId 颜色代号，如 "block1", "block2", "block3"
     */
    public init(blockIndex: number = 1, skinSystemIndex?: number) {
        const center = this.switchSkin(blockIndex, skinSystemIndex);
        this.initSize();
        return center;
    }

    switchSkin(blockIndex: number, skinSystemIndex?: number) {
        Logger.info("ShaderBlock:switchSkin:", `[BlockShaderSkin] 应用皮肤x: ${blockIndex}, ${skinSystemIndex} `);
        if (!skinSystemIndex) {
            skinSystemIndex = parseInt(themeConfig.SkinSystemID.split("_")[1]);
            this.skinSystemIndex = skinSystemIndex;
        }
        let config = null;
        // 钻石底色
        if (blockIndex > 10) {
            config = SkinsManager.getInstance().getGemstoneSubstrateColor();
            this.equipGemstone(blockIndex);
        } else {
            const colorPackageId = ("block" + blockIndex) as BlockColorPackageID;
            config = SkinsManager.getInstance().getSkinConfig("skin_" + skinSystemIndex, colorPackageId);
            if (!config) {
                Logger.error(
                    "ShaderBlock:switchSkin:",
                    `[BlockShaderSkin] 皮肤 ${skinSystemIndex}/${colorPackageId} 不存在`,
                );
                return;
            }
        }

        if (!this._materialInstance) {
            Logger.error("ShaderBlock:switchSkin:", "[BlockShaderSkin] 材质实例未初始化");
            return;
        }
        Logger.info("ShaderBlock:switchSkin:", `[BlockShaderSkin] 应用皮肤: ${blockIndex}, ${JSON.stringify(config)} `);

        // Logger.info(
        //     "ShaderBlock:switchSkin:",
        //     `[BlockShaderSkin] 应用皮肤: ${config.name} (skin_${skinSystemIndex}/${colorPackageId})`,
        // );

        // 记录当前皮肤
        this._currentSkinSystemId = "skin_" + skinSystemIndex;
        this.blockIndex = blockIndex;

        // 应用外框配置
        this._materialInstance.setProperty("frameOuterColor", SkinsManager.hexToColor(config.frameOuterColor));
        this._materialInstance.setProperty("borderWidth", config.borderWidth);
        this._materialInstance.setProperty("bevelWidth", config.bevelWidth);

        // 应用中心渐变
        this._applyGradient("center", config.center);

        // 应用四个梯形渐变
        this._applyGradient("top", config.top);
        this._applyGradient("bottom", config.bottom);
        this._applyGradient("left", config.left);
        this._applyGradient("right", config.right);

        this.blockIndex = blockIndex;
        this.resetBright();
        return config.center;
    }

    equipGemstone(blockIndex: number) {
        const gemstoneNode = this.node.getChildByName("Gem");
        gemstoneNode.active = true;
        // 因为整个block才120，所以要缩小gem
        const scale = 0.5;
        gemstoneNode.setScale(scale, scale, 1);

        const sprite = gemstoneNode.getComponent(Sprite);

        Logger.info("ShaderBlock:equipGemstone:", `[BlockShaderSkin] 应用皮肤: ${blockIndex} `);
        sprite.spriteFrame = GemSkinsManager.instance.getSpriteFrameByBlockIndex(blockIndex);
    }

    /**
     * 应用单个区域的渐变配置
     */
    private _applyGradient(
        region: string,
        gradient: { gradientStart: string; gradientEnd: string; angle: number; intensity: number },
    ) {
        this._materialInstance.setProperty(`${region}GradientStart`, SkinsManager.hexToColor(gradient.gradientStart));
        this._materialInstance.setProperty(`${region}GradientEnd`, SkinsManager.hexToColor(gradient.gradientEnd));
        this._materialInstance.setProperty(`${region}GradientDirection`, gradient.angle);
        this._materialInstance.setProperty(`${region}GradientIntensity`, gradient.intensity);
    }

    /**
     * 为 Photo 子节点应用 photoEdge 材质。
     * 各斜面亮度系数由皮肤渐变颜色的感知亮度相对中心亮度推导，无需单独配置颜色。
     */
    applyPhotoEdges() {
        if (!GameManager.instance.enablePhotoEdges) return;
        const mat = GameManager.instance.photoEdgeMaterial;
        if (!mat) return;
        const photoNode = this.node.getChildByName("Photo");
        if (!photoNode) return;
        const photoSprite = photoNode.getComponent(Sprite);
        if (!photoSprite) return;

        photoSprite.customMaterial = mat;
        const matInst = photoSprite.getMaterialInstance(0);
        if (!matInst) return;

        const config =
            this.blockIndex > 10
                ? SkinsManager.getInstance().getGemstoneSubstrateColor()
                : SkinsManager.getInstance().getSkinConfig(
                      this._currentSkinSystemId,
                      ("block" + GameManager.instance.pureBlockIndex || this.blockIndex) as BlockColorPackageID,
                  );
        if (!config) return;

        matInst.setProperty("frameOuterColor", SkinsManager.hexToColor(config.frameOuterColor));
        matInst.setProperty("borderWidth", config.borderWidth);
        matInst.setProperty("bevelWidth", config.bevelWidth);

        // 以中心渐变起始色亮度为基准，推导各斜面相对亮度系数，整体写入避免 target 覆盖问题
        const centerLum = Math.max(this._hexLuminance(config.center.gradientStart), 0.01);
        // 对比度放大：将各方向与 1.0 的偏差乘以该系数（>1 = 明暗差越明显）
        const BEVEL_CONTRAST = 2.0;
        const enhanceBevel = (raw: number) => Math.max(0, 1.0 + (raw - 1.0) * BEVEL_CONTRAST);
        matInst.setProperty(
            "bevelBrightness",
            new Vec4(
                enhanceBevel(this._hexLuminance(config.top.gradientStart) / centerLum),
                enhanceBevel(this._hexLuminance(config.bottom.gradientStart) / centerLum),
                enhanceBevel(this._hexLuminance(config.left.gradientStart) / centerLum),
                enhanceBevel(this._hexLuminance(config.right.gradientStart) / centerLum),
            ),
        );
    }

    /** 移除 Photo 子节点上的 photoEdge 材质，恢复默认显示 */
    clearPhotoEdges() {
        const photoNode = this.node.getChildByName("Photo");
        if (!photoNode) return;
        const photoSprite = photoNode.getComponent(Sprite);
        if (photoSprite) photoSprite.customMaterial = null;
    }

    /** 计算 hex 颜色的感知亮度（0~1） */
    private _hexLuminance(hex: string): number {
        const c = SkinsManager.hexToColor(hex);
        return 0.299 * (c.r / 255) + 0.587 * (c.g / 255) + 0.114 * (c.b / 255);
    }
}
