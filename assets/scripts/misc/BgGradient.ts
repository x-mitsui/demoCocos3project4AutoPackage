import { _decorator, Component, Enum, Sprite } from "cc";
import { BGColorEnum, GradientConfig, SkinsManager } from "../configs/Skins/SkinsManager";
import { Logger } from "../utils/logger";
import { eventManager, GameEvent } from "../managers/EventManager";

const { ccclass, property } = _decorator;

/**
 * 背景渐变组件
 * 自动从配置读取背景渐变色并应用
 * 要求：节点上需要有一个 1x1 白色 Sprite
 */
@ccclass("BgGradient")
export class BgGradient extends Component {
    private bgGradientDatas: GradientConfig;
    @property({ type: Enum(BGColorEnum) })
    bgName: BGColorEnum = BGColorEnum.gameBgColor;
    @property
    isExtend = false;

    onLoad() {
        // 初始化背景渐变
        this.changeBgGradient();

        eventManager.on(GameEvent.GAME_COLOR_CHANGE, this.changeBgGradient, this);
    }

    private changeBgGradient() {
        // 从配置读取背景颜色
        this.bgGradientDatas = SkinsManager.getInstance().getBgColor(this.bgName);
        const sprite = this.getComponent(Sprite);
        if (!sprite) {
            Logger.warn("[BgGradient] 当前节点没有 Sprite 组件！");
            return;
        }

        if (!sprite.spriteFrame) {
            Logger.error("[BgGradient] Sprite 没有 spriteFrame！请在编辑器中设置一个 1x1 白色纹理。");
            return;
        }

        const material = sprite.getMaterialInstance(0);
        if (!material) {
            Logger.warn("[BgGradient] 无法获取材质实例！");
            return;
        }

        // 获取并调整渐变颜色
        const startColor = SkinsManager.hexToColor(this.bgGradientDatas.gradientStart);
        const endColor = SkinsManager.hexToColor(this.bgGradientDatas.gradientEnd);

        const delta = this.isExtend ? 25 : 0;
        // 调整起始色：r、g 增加（变白），范围 0-255
        startColor.r = Math.min(255, startColor.r + delta);
        startColor.g = Math.min(255, startColor.g + delta);

        // 调整结束色：r、g 减少（变暗），范围 0-255
        endColor.r = Math.max(0, endColor.r - delta);
        endColor.g = Math.max(0, endColor.g - delta);

        // 设置渐变属性
        material.setProperty("startColor", startColor);
        material.setProperty("endColor", endColor);
        material.setProperty("gradientAngle", this.bgGradientDatas.angle);
        material.setProperty("gradientIntensity", this.bgGradientDatas.intensity);

        Logger.info(
            "BgGradient:initBgGradient:",
            "[BgGradient] 背景渐变已设置:",
            "起始色:",
            this.bgGradientDatas.gradientStart,
            "-> RGBA(",
            startColor.r,
            ", ",
            startColor.g,
            ", ",
            startColor.b,
            ", ",
            startColor.a,
            ")",
        );
    }
}
