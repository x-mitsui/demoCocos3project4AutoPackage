import { _decorator, Component, EventTouch, Node, UITransform } from "cc";
import { jump2DownloadPage } from "./tool";

const { ccclass, requireComponent } = _decorator;

@ccclass('AlignToBottom')
@requireComponent(UITransform)
export class AlignToBottom extends Component {
    private uiTransform: UITransform = null!;

    onLoad() {
        this.uiTransform = this.getComponent(UITransform);

        this.uiTransform.setAnchorPoint(0.5, 0);
    }

    start() {
        this.node.on(Node.EventType.TOUCH_END, this.onTouchStart, this);
    }
    onTouchStart(event: EventTouch) {
        event.propagationStopped = true;
        jump2DownloadPage();
    }


}