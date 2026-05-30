import { _decorator, Button, Component, find, Node, tween } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { jump2DownloadPage, Tool } from "../../utils/tool";
import { Logger } from "../../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("FakingSetting")
export class FakingSetting extends Component {
    private _reminderStopped = false;
    @property
    isInduce: boolean = true;

    protected onLoad(): void {
        if (this.isInduce) {
            Tool.addBadgeDotAtRightTop(this.node, { offsetX: -10, offsetY: -10 });
            eventManager.once(GameEvent.GAME_ELIMINATE, this.onGameEliminate, this);
        }
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    onTouchEnd() {
        jump2DownloadPage();
        Tool.removeBadgeDotAtRightTop(this.node);
    }
    onDestroy() {
        this._reminderStopped = true;

        tween(this.node).stop();
    }

    onGameEliminate() {
        Logger.info("FakingSetting:onGameEliminate:");
        // 与 LocalImgToSprite 一致：10 秒后再开始循环提醒
        // this.scheduleOnce(() => {
        Tool.playBadgeDot(this.node, () => this._reminderStopped);
        // }, 10);
    }
}
