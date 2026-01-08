import { _decorator, Animation, Component, Node } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("Tip")
export class Tip extends Component {
    start() {
        eventManager.once(GameEvent.FIRST_OPTION_LANDED, this.onFirstOptionLanded, this);
    }
    onFirstOptionLanded() {
        this.node.active = false;
        // Animation动画停止
        const animation = this.getComponent(Animation);
        if (animation) {
            animation.stop();
        }
    }
    onDestroy() {
        eventManager.off(GameEvent.FIRST_OPTION_LANDED, this.onFirstOptionLanded, this);
    }
}
