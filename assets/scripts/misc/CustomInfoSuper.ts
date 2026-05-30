import { _decorator, Component, Node, sys } from "cc";
import super_html_playable from "../utils/super_html_playable";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

export class CustomInfoSuper extends Component {
    constructor(appName: string, androidUrl: string, iosUrl: string) {
        super();
        this.init(appName, androidUrl, iosUrl);
        this.setJumpUrl();
    }
    init(appName: string, androidUrl: string, iosUrl: string): void {
        this.appName = appName;
        this.androidUrl = androidUrl;
        this.iosUrl = iosUrl;
    }
    appName = "";
    iosUrl = "";
    androidUrl = "";
    getJumpUrl(): string {
        // 在 playable 项目中，根据操作系统判断跳转链接
        // sys.os 可以检测 iOS、Android 等操作系统
        if (sys.os === sys.OS.IOS || sys.os === sys.OS.OSX) {
            // iOS 或 macOS 设备，跳转到 App Store
            return this.iosUrl;
        } else if (sys.os === sys.OS.ANDROID) {
            // Android 设备，跳转到 Google Play
            return this.androidUrl;
        } else {
            // 其他平台（如 Windows、Linux 等），默认返回 iOS 链接
            // 或者可以根据 User Agent 进一步判断
            const userAgent =
                sys.isBrowser && typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
            if (userAgent.includes("android")) {
                return this.androidUrl;
            } else {
                return this.iosUrl;
            }
        }
    }
    setJumpUrl() {
        Logger.info("config:setJumpUrl:", "setJumpUrl-------------------");
        super_html_playable.set_app_store_url(this.iosUrl);
        super_html_playable.set_google_play_url(this.androidUrl);
    }
}
