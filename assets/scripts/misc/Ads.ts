import { _decorator, Component, EventTouch, Node, Sprite, sys, UITransform, view } from "cc";
import { isPlatformGoogle, jump2DownloadPage, Tool } from "../utils/tool";
import { SkinsManager } from "../configs/Skins/SkinsManager";
import { eventManager, GameEvent } from "../managers/EventManager";
import { GameManager } from "../managers/GameManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("Ads")
export class Ads extends Component {
    onLoad() {
        if (isPlatformGoogle()) {
            this.node.getComponent(Sprite).spriteFrame = null;
            this.node.getChildByName("icon").active = false;
            this.node.getChildByName("Label").active = false;
            this.node.getChildByName("buttonSp").active = false;
            this.node.getChildByName("decorateBorder").active = true;
        } else {
            this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }
        const uiTransform = this.getComponent(UITransform);

        uiTransform.setAnchorPoint(0.5, 0);

        if (GameManager.instance.enableChangeColor) {
            eventManager.on(GameEvent.GAME_COLOR_CHANGE, this.changeColor, this);
        }
    }

    start() {
        // 延迟一帧确保适配已完成 1E264A
        this.scheduleOnce(() => {
            this.changeColor();
            this.updateAdsNodePosition();
        }, 0);

        // 监听窗口尺寸变化（Web 平台）
        if (sys.isBrowser && typeof window !== "undefined") {
            window.addEventListener("resize", this.onResize.bind(this));
        }
    }
    changeColor() {
        const color = SkinsManager.getInstance().getBorderColor();
        Logger.info("Ads:changeColor:", color);
        Tool.setNodeGradient(this.node, color);
    }

    /**
     * 更新 adsNode 位置，使其贴紧可见区域底部（黑边下沿）
     */
    private updateAdsNodePosition() {
        if (!this.node) {
            return;
        }
        const frameSize = view.getFrameSize();
        // log("frameSize", frameSize);
        const visibleSize = view.getVisibleSize();
        // log("visibleSize", visibleSize);
        const designWidthScale = frameSize.width / visibleSize.width;
        const designHeightScale = frameSize.height / visibleSize.height;
        // log("designWidthScale", designWidthScale);
        // log("designHeightScale", designHeightScale);
        if (designWidthScale > designHeightScale) {
            this.node.setPosition(this.node.position.x, -visibleSize.height / 2, this.node.position.z);
        } else {
            this.node.setPosition(this.node.position.x, -frameSize.height / 2 / designWidthScale, this.node.position.z);
        }
    }

    /**
     * 窗口尺寸变化时的回调
     */
    private onResize() {
        // 延迟一帧确保 view 已更新
        this.scheduleOnce(() => {
            this.updateAdsNodePosition();
        }, 0);
    }

    onDestroy() {
        // 移除事件监听
        if (sys.isBrowser && typeof window !== "undefined") {
            window.removeEventListener("resize", this.onResize.bind(this));
        }
        if (GameManager.instance.enableChangeColor) {
            eventManager.off(GameEvent.GAME_COLOR_CHANGE, this.changeColor, this);
        }
    }

    onTouchEnd(event: EventTouch) {
        event.propagationStopped = true;
        jump2DownloadPage();
    }
}
