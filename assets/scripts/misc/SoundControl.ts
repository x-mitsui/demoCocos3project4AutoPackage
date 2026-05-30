import { _decorator, Component, log, Node } from "cc";
import { AudioManager } from "../managers/AudioManager";
import { eventManager, GameEvent } from "../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("SoundControl")
export class SoundControl extends Component {
    ToggleNode: Node = null!;
    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.ToggleNode = this.node.getChildByName("Toggle");
    }

    onTouchEnd() {
        AudioManager.instance.playClickBtnEffect();
        this.ToggleNode.active = !this.ToggleNode.active;
        const isSoundOn = !this.ToggleNode.active;
        eventManager.emit(GameEvent.GAME_SOUND_TOGGLE, isSoundOn);
    }
}
