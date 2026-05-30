import { _decorator, Component, EventTouch, Node } from "cc";

const { ccclass, property } = _decorator;

@ccclass("Drag")
export class Drag extends Component {
    @property({ tooltip: "按下时是否将节点移到父节点子节点列表最后（显示在最上层）" })
    bringToFront = false;

    @property({ tooltip: "拖动时是否阻止触摸继续向下传递" })
    swallowTouch = true;

    private _dragging = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    private _onTouchStart(event: EventTouch) {
        this._dragging = true;
        if (this.bringToFront && this.node.parent) {
            this.node.setSiblingIndex(this.node.parent.children.length - 1);
        }
        if (this.swallowTouch) {
            event.propagationStopped = true;
        }
    }

    private _onTouchMove(event: EventTouch) {
        if (!this._dragging) {
            return;
        }
        const delta = event.getUIDelta();
        const p = this.node.position;
        this.node.setPosition(p.x + delta.x, p.y + delta.y, p.z);
        if (this.swallowTouch) {
            event.propagationStopped = true;
        }
    }

    private _onTouchEnd(event: EventTouch) {
        this._dragging = false;
        if (this.swallowTouch) {
            event.propagationStopped = true;
        }
    }
}
