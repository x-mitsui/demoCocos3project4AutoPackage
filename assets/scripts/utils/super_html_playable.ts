import { Logger } from "./logger";

/**
 * super-html playable adapter
 * @help https://store.cocos.com/app/detail/3657
 * @home https://github.com/magician-f/cocos-playable-demo
 * @author https://github.com/magician-f
 */
class super_html_playable {
    download(url?: string) {
        Logger.info("download：", url);
        //@ts-ignore
        window.super_html && super_html.download(url);
    }

    game_end() {
        Logger.info("game end");
        //@ts-ignore
        window.super_html && super_html.game_end();
    }

    /**
     * 是否隐藏下载按钮，意味着使用平台注入的下载按钮
     * channel : google
     */
    is_hide_download() {
        //@ts-ignore
        if (window.super_html && super_html.is_hide_download) {
            //@ts-ignore
            return super_html.is_hide_download();
        }
        return false;
    }

    /**
     * 设置商店地址
     * channel : unity
     * @param url https://play.google.com/store/apps/details?id=com.unity3d.auicreativetestapp
     */
    set_google_play_url(url: string) {
        if (!url.startsWith("https://play.google.com")) {
            throw new Error("Invalid Google Play URL");
        }

        //@ts-ignore
        window.super_html && (super_html.google_play_url = url);
    }

    /**
     * 设置商店地址
     * channel : unity
     * @param url https://apps.apple.com/us/app/ad-testing/id1463016906
     */
    set_app_store_url(url: string) {
        // console.log("set_app_store_url-------------------", url);
        if (!url.startsWith("https://apps.apple.com")) {
            throw new Error("Invalid App Store URL");
        }
        //@ts-ignore
        window.super_html && (super_html.appstore_url = url);
    }

    /**
     * 是否开启声音
     * channel : ironsource
     */
    is_audio() {
        //prettier-ignore
        //@ts-ignore
        return (window.super_html && super_html.is_audio && super_html.is_audio()) || true
    }

    /**
     * 移除 index.html 中 id 为 loader-placeholder 的起量加载层（与组长 HTML 模版一致）。
     * 在首场景就绪后调用，避免引擎启动前纯黑屏。
     */
    remove_loader_placeholder() {
        //@ts-ignore
        if (typeof document === "undefined") {
            return;
        }
        //@ts-ignore
        const load = document.getElementById("loader-placeholder");
        if (load != null) {
            load.remove();
        }
    }
}
export default new super_html_playable();
