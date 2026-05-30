import { _decorator, Component, Node } from "cc";
import { Tool } from "./tool";
const { ccclass, property } = _decorator;

@ccclass("AdaptHeight")
export class AdaptHeight extends Component {
    start() {
        Tool.adaptHeight(this.node);
    }
}
