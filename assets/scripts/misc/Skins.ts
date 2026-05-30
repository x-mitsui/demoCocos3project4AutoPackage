import { _decorator, Component, Node, SpriteFrame } from "cc";
const { ccclass, property } = _decorator;

@ccclass("Skins")
export class Skins extends Component {
    @property(SpriteFrame)
    skins: SpriteFrame[] = [];

    getSpriteFrameByBlockIndex(blockIndex: number) {
        return this.skins[blockIndex - 1];
    }
}
