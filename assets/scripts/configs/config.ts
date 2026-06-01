import { sys } from "cc";
import super_html_playable from "../utils/super_html_playable";
import { Logger } from "../utils/logger";

export const GameCustomInfo = {
    name: "BlockBrush",
    androidUrl: "https://play.google.com/store/apps/details?id=com.wood.block.sudoku.puzzle.bm",
    iosUrl: "https://apps.apple.com/us/app/block-crush-travel-master/id1638139403"
};

export const themeConfig = {
    SkinSystemID: "skin_1000" // 由 gen-index.js 自动维护，勿手动修改
};
const edgeLength = GameCustomInfo.name === "BlockBrush" ? 120.5 : 120;
/** 块大小 */
export const BlockSize = {
    width: edgeLength,
    height: edgeLength
};

export const getJumpUrl = () => {
    if (sys.os === sys.OS.IOS || sys.os === sys.OS.OSX) {
        return GameCustomInfo.iosUrl;
    } else if (sys.os === sys.OS.ANDROID) {
        return GameCustomInfo.androidUrl;
    } else {
        const userAgent =
            sys.isBrowser && typeof navigator !== "undefined"
                ? navigator.userAgent.toLowerCase()
                : "";
        if (userAgent.includes("android")) {
            return GameCustomInfo.androidUrl;
        } else {
            return GameCustomInfo.iosUrl;
        }
    }
};
export const setJumpUrl = () => {
    Logger.info("config:setJumpUrl:", "setJumpUrl-------------------");
    super_html_playable.set_app_store_url(GameCustomInfo.iosUrl);
    super_html_playable.set_google_play_url(GameCustomInfo.androidUrl);
};
setJumpUrl();

export type Answer = {
    shapes: number[][][];
    blockIndex?: number; // 选择性配置，如果不配置就取shapes中的值
};

// i18n 数据和工具函数已拆分到独立文件：
//   数据: configs/i18nData.ts
//   工具: configs/getI18N.ts
// 此处重新导出以保持向后兼容
export { getI18N } from "./getI18N";
