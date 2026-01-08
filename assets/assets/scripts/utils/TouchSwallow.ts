import { _decorator, Component, Node, EventTouch } from 'cc';
const { ccclass } = _decorator;

/**
 * 触摸吞噬辅助脚本
 * 用于让 sprite 蒙板吞噬下面的触摸事件，阻止事件向下传播
 */
@ccclass('TouchSwallow')
export class TouchSwallow extends Component {
    onLoad() {
        // 注册所有触摸事件监听，吞噬所有触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onTouch, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouch, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouch, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouch, this);
    }

    onDestroy() {
        // 移除触摸事件监听
        this.node.off(Node.EventType.TOUCH_START, this.onTouch, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouch, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouch, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouch, this);
    }

    /**
     * 触摸事件处理 - 阻止事件向下传播
     */
    private onTouch(event: EventTouch) {
        event.propagationStopped = true;
    }
}

