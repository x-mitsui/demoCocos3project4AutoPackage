import { _decorator, Animation, CCString, Component, Node, Vec3 } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
const { ccclass, property } = _decorator;

import { EliminateAnimNamePair } from "./EliminateAnimNamePair";

@ccclass("EliminateSpriteFrame")
export class EliminateSpriteFrame extends Component {
    @property({ type: [EliminateAnimNamePair], tooltip: "blockIndex 1~8 对应下标 0~7" })
    animationNames: EliminateAnimNamePair[] = [];

    spriteFrame: Node = null;
    private _animation: Animation = null;

    onLoad() {
        this.spriteFrame = this.node.getChildByName("SpriteFrame");
        this._animation = this.spriteFrame?.getComponent(Animation) ?? null;
        while (this.animationNames.length < 8) {
            this.animationNames.push(new EliminateAnimNamePair());
        }
        // 每实例只响应紧随其后的那一次 emit（Board 每列/行 instantiate 后立即发事件）
        eventManager.once(GameEvent.GAME_ELIMINATE_START, this.play, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ELIMINATE_START, this.play, this);
        this._animation?.off(Animation.EventType.FINISHED, this._onAnimationFinished, this);
    }

    play({ blockIndex, direction, worldPos }: { blockIndex: number; direction: number; worldPos: Vec3 }) {
        const pair = this.animationNames[blockIndex - 1];
        if (!pair || !this._animation) return;
        this.node.setWorldPosition(worldPos);
        const animationName = direction === 0 ? pair.horizontal : pair.vertical;
        this._animation.off(Animation.EventType.FINISHED, this._onAnimationFinished, this);
        this._animation.on(Animation.EventType.FINISHED, this._onAnimationFinished, this);
        this._animation.play(animationName);
    }

    private _onAnimationFinished() {
        this._animation?.off(Animation.EventType.FINISHED, this._onAnimationFinished, this);
        this.node.destroy();
    }
}
