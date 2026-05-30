import { _decorator, Color } from "cc";
import { SkinsConfig } from "./skins_config";
import { themeConfig } from "../config";
import { Logger } from "../../utils/logger";

const { ccclass } = _decorator;
/**
 * 块颜色枚举
 */
export enum BlockColorPackageID {
    block1 = "block1",
    block2 = "block2",
    block3 = "block3",
    block4 = "block4",
    block5 = "block5",
    block6 = "block6",
    block7 = "block7",
}

/**
 * 皮肤系统枚举
 */
export enum SkinSystemId {
    skin_1000 = "skin_1000",
    skin_1001 = "skin_1001",
    skin_1002 = "skin_1002",
    skin_1003 = "skin_1003",
}

/**
 * 背景颜色枚举
 */
export enum BGColorEnum {
    gameBgColor = "gameBgColor",
    winEndPage = "winEndPage",
    loseEndPage = "loseEndPage",
}
export interface FrameOuterColorConfig {
    name: string;
    frameOuterColor: string;
    borderWidth: number;
    bevelWidth: number;
    center: GradientConfig;
    top: GradientConfig;
    bottom: GradientConfig;
    left: GradientConfig;
    right: GradientConfig;
}
/**
 * 渐变配置
 */
export interface GradientConfig {
    name?: string;
    gradientStart: string; // 十六进制颜色 #RRGGBB
    gradientEnd: string;
    angle: number; // 角度 0-360
    intensity: number; // 强度 0-1
}

/**
 * 单个皮肤配置
 */
export interface BlockSkinConfig {
    name: string;
    aniPrefix?: string; // 消除动画前缀
    frameOuterColor: string; // 外框颜色
    borderWidth: number; // 边框宽度
    bevelWidth: number; // 斜面宽度
    center: GradientConfig; // 中心正方形
    top: GradientConfig; // 上梯形
    bottom: GradientConfig; // 下梯形
    left: GradientConfig; // 左梯形
    right: GradientConfig; // 右梯形
    clear?: { top: string; middle: string; bottom: string }; // 消除动画
    preClear?: string; // 消除动画前颜色
    encourageAni?: {
        label: [string, number];
        outline: [string, number];
        light: [string, number];
        star: [string, number];
    }; // 鼓励动画
    combo?: {
        comboSp: [string, number];
        comboSpBg: [string, number];
        comboCount: [string, number];
        comboCountBg: [string, number];
    }; // 连击动画
}

/**
 * Block 皮肤配置管理器
 */
@ccclass("SkinsManager")
export class SkinsManager {
    private static _instance: SkinsManager = null;

    public static getInstance(): SkinsManager {
        if (!this._instance) {
            this._instance = new SkinsManager();
        }
        return this._instance;
    }

    /**
     * 根据皮肤系统ID和颜色ID获取配置
     * @param skinSystemId 皮肤系统ID，如 "skin_1000"
     * @param colorPackageId 颜色ID，如 "block1", "block2", "block3"
     */
    public getSkinConfig(skinSystemId: string, colorPackageId: BlockColorPackageID): BlockSkinConfig | null {
        const theme = SkinsConfig[skinSystemId];
        if (!theme) {
            Logger.warn(`[BlockSkinsManager] 找不到皮肤系统: ${skinSystemId}`);
            return null;
        }

        const config = theme.colors[colorPackageId];
        if (!config) {
            Logger.warn(`[BlockSkinsManager] 皮肤系统 ${skinSystemId} 中找不到颜色: ${colorPackageId}`);
            return null;
        }

        return config;
    }

    /**
     * 获取所有皮肤系统 ID 列表
     */
    public getAllSkinSystemIds(): string[] {
        return Object.keys(SkinsConfig);
    }

    /**
     * 获取指定皮肤系统下的所有颜色 ID 列表
     */
    public getColorIds(skinSystemId: string): string[] {
        const theme = SkinsConfig[skinSystemId];
        if (!theme) return [];
        return Object.keys(theme.colors);
    }

    /**
     * 获取清除动画前缀
     * @param skinSystemId 皮肤系统ID
     * @param colorPackageId 颜色ID
     * @returns 清除动画前缀，如 "blue", "yellow" 等
     */
    public getEliminateAniConfig(skinSystemId: SkinSystemId, colorPackageId: BlockColorPackageID) {
        const config = this.getSkinConfig(skinSystemId, colorPackageId);
        return config.clear;
    }

    /**
     * 根据颜色索引获取清除动画前缀（兼容旧代码）
     * @param blockIndex 颜色索引 0-6
     * @param skinSystemId 可选，皮肤系统ID，默认使用 skin_1000
     * @returns 清除动画前缀
     */
    public getEliminateConfigByBlockIndex(blockIndex: number, skinSystemId?: SkinSystemId) {
        if (!skinSystemId) {
            skinSystemId = themeConfig.SkinSystemID as SkinSystemId;
        }
        const colorPackageId = `block${blockIndex}` as BlockColorPackageID;
        return this.getEliminateAniConfig(skinSystemId, colorPackageId);
    }

    /**
     * 获取鼓励动画后缀
     * @param skinSystemId 皮肤系统ID
     * @param colorPackageId 颜色ID
     * @returns 鼓励动画后缀，如 "blue", "yellow" 等
     */
    public getEncourageAniConfig(skinSystemId: SkinSystemId, colorPackageId: BlockColorPackageID) {
        const config = this.getSkinConfig(skinSystemId, colorPackageId);
        return config.encourageAni;
    }

    /**
     * 根据颜色索引获取鼓励动画后缀（兼容旧代码）
     * @param blockIndex 颜色索引 0-6
     * @param skinSystemId 可选，皮肤系统ID，默认使用 skin_1000
     * @returns 鼓励动画后缀
     */
    public getEncourageAniConfigByBlockIndex(blockIndex: number, skinSystemId?: SkinSystemId) {
        if (!skinSystemId) {
            skinSystemId = themeConfig.SkinSystemID as SkinSystemId;
        }
        const colorPackageId = `block${blockIndex}` as BlockColorPackageID;
        return this.getEncourageAniConfig(skinSystemId, colorPackageId);
    }
    getComboAniConfig(skinSystemId: SkinSystemId, colorPackageId: BlockColorPackageID) {
        const config = this.getSkinConfig(skinSystemId, colorPackageId);
        return config.combo;
    }
    public getComboAniConfigByBlockIndex(blockIndex: number, skinSystemId?: SkinSystemId) {
        if (!skinSystemId) {
            skinSystemId = themeConfig.SkinSystemID as SkinSystemId;
        }
        const colorPackageId = `block${blockIndex}` as BlockColorPackageID;
        return this.getComboAniConfig(skinSystemId, colorPackageId);
    }
    getPreClearAniConfig(skinSystemId: SkinSystemId, colorPackageId: BlockColorPackageID) {
        const config = this.getSkinConfig(skinSystemId, colorPackageId);
        return config.preClear;
    }
    public getPreClearAniConfigByBlockIndex(blockIndex: number, skinSystemId?: SkinSystemId) {
        if (!skinSystemId) {
            skinSystemId = themeConfig.SkinSystemID as SkinSystemId;
        }
        const colorPackageId = `block${blockIndex}` as BlockColorPackageID;
        return this.getPreClearAniConfig(skinSystemId, colorPackageId);
    }

    /**
     * 十六进制颜色转 Cocos Color
     */
    public static hexToColor(hex: string): Color {
        // 移除 # 号
        hex = hex.replace("#", "");

        // 解析 RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return new Color(r, g, b, 255);
    }

    getWinEndPageColors() {
        return SkinsConfig[themeConfig.SkinSystemID].winEndPage;
    }

    getLoseEndPageColors() {
        return SkinsConfig[themeConfig.SkinSystemID].loseEndPage;
    }
    getNewHighScoreAniConfig() {
        return SkinsConfig[themeConfig.SkinSystemID].newHighScore;
    }

    /**
     *
     * 之所以添加这个方法，是为了方便BgGradient组件使用，统一获取背景颜色
     * @param bgName
     * @returns
     */
    getBgColor(bgName: BGColorEnum) {
        if (bgName === "winEndPage") {
            return SkinsConfig[themeConfig.SkinSystemID].winEndPage.bestscore_bg;
        } else if (bgName === "loseEndPage") {
            return SkinsConfig[themeConfig.SkinSystemID].loseEndPage.gameover_bg;
        } else if (bgName === "gameBgColor") {
            return SkinsConfig[themeConfig.SkinSystemID].game_bg;
        }
        return null;
    }
    getBorderColor() {
        return SkinsConfig[themeConfig.SkinSystemID].board_out_line;
    }
    getBoardColor() {
        return SkinsConfig[themeConfig.SkinSystemID].board_bg;
    }
    getLineColor() {
        return SkinsConfig[themeConfig.SkinSystemID].board_line;
    }
    getTipColor(index: number) {
        if (index === 1) {
            return SkinsConfig[themeConfig.SkinSystemID].comboTips1;
        } else if (index === 2) {
            return SkinsConfig[themeConfig.SkinSystemID].comboTips2;
        } else if (index === 3) {
            return SkinsConfig[themeConfig.SkinSystemID].comboTips3;
        }
    }
    getCrownColor() {
        return SkinsConfig[themeConfig.SkinSystemID].crown;
    }
    getCrownScoreColor() {
        return SkinsConfig[themeConfig.SkinSystemID].crown_score;
    }
    getGemstoneSubstrateColor() {
        return SkinsConfig[themeConfig.SkinSystemID].travel_gemstone_substrate;
    }
    getTargetRibbonUpColor() {
        return SkinsConfig[themeConfig.SkinSystemID].travel_target_ribbon_up;
    }
    getTargetRibbonDownColor() {
        return SkinsConfig[themeConfig.SkinSystemID].travel_target_ribbon_down;
    }
    getTopNodeColor() {
        Logger.info("SkinsManager:getTopNodeColor:", themeConfig.SkinSystemID);
        return SkinsConfig[themeConfig.SkinSystemID].travel_target_ribbon_up;
    }
    getBottomNodeColor() {
        return SkinsConfig[themeConfig.SkinSystemID].travel_target_ribbon_down;
    }
    getReviveCountdownColors() {
        return SkinsConfig[themeConfig.SkinSystemID].revive_countdown;
    }
    getReviveBtnColors() {
        return SkinsConfig[themeConfig.SkinSystemID].revive_btn;
    }
    getReviveProgressbarColors() {
        const theme = SkinsConfig[themeConfig.SkinSystemID];
        return {
            progressbar: theme.revive_progressbar,
            progressbarLine: theme.revive_progressbar_line,
            progressbarBg: theme.revive_progressbar_bg,
        };
    }
    getEliminateAnimationConfig(blockIndex: number) {
        Logger.info("SkinsManager:getEliminateAnimationConfig:", themeConfig.SkinSystemID, blockIndex);
        return SkinsConfig[themeConfig.SkinSystemID].colors[`block${blockIndex}`].aniPrefix;
    }
}
