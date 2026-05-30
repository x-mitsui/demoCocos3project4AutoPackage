import { _decorator, Component, Node, sp, Vec3 } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("SpineExecutor")
export abstract class SpineExecutor extends Component {
    /** 与 eventManager.emit 传入的参数一致，可多参 */
    abstract onCallback(...args: unknown[]): void;
}
