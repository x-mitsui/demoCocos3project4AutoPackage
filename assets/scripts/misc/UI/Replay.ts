import { _decorator, Component, Node } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("Replay")
export class Replay extends Component {
    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    onTouchEnd() {
        eventManager.emit(GameEvent.BTN_REPLAY_CLICK);
    }
}
