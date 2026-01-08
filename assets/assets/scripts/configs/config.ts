import { sys } from "cc";

/** 块大小 */
export const BlockSize = {
    width: 120,
    height: 120,
};

/** 网格大小 */
export const GridSize = {
    width: 10,
    height: 10,
};

export const GameCustomInfo = {
    name: "BlockBrush",
};

export const Colors = ["yellow", "blue", "red", "green", "purple", "orange"];

const appUrls = {
    blockblast: {
        android:
            "https://play.google.com/store/apps/details?id=com.block.juggle",
        ios: "https://apps.apple.com/us/app/block-blast/id1617391485",
    },
    BlockBrush: {
        android:
            "https://play.google.com/store/apps/details?id=com.wood.block.sudoku.puzzle.bm",
        ios: "https://apps.apple.com/us/app/block-crush-travel-master/id1638139403",
    },
};

export const getJumpUrl = () => {
    const projectName = GameCustomInfo.name;
    // 在 playable 项目中，根据操作系统判断跳转链接
    // sys.os 可以检测 iOS、Android 等操作系统
    if (sys.os === sys.OS.IOS || sys.os === sys.OS.OSX) {
        // iOS 或 macOS 设备，跳转到 App Store
        return appUrls[projectName].ios;
    } else if (sys.os === sys.OS.ANDROID) {
        // Android 设备，跳转到 Google Play
        return appUrls[projectName].android;
    } else {
        // 其他平台（如 Windows、Linux 等），默认返回 iOS 链接
        // 或者可以根据 User Agent 进一步判断
        const userAgent =
            sys.isBrowser && typeof navigator !== "undefined"
                ? navigator.userAgent.toLowerCase()
                : "";
        if (userAgent.includes("android")) {
            return appUrls[projectName].android;
        } else {
            return appUrls[projectName].ios;
        }
    }
};
