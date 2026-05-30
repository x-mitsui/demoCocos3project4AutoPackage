import { _decorator, Button, Component, Node } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("ResetOptions")
export class ResetOptions extends Component {
    resetButton: Button = null!;
    onLoad() {
        this.resetButton = this.node.getComponent(Button);
    }

    onResetClick() {
        eventManager.emit(GameEvent.BTN_REPLAY_CLICK);
    }
}
