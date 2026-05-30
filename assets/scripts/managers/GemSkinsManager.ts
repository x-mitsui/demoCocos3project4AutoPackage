import { _decorator, Component, SpriteFrame } from "cc";
const { ccclass, property } = _decorator;

export const GEM_SKINS_START_INDEX = 101;
@ccclass("GemSkinsManager")
export class GemSkinsManager extends Component {
    public static get instance(): GemSkinsManager {
        return this._instance;
    }
    private static _instance: GemSkinsManager = null;
    @property({ type: SpriteFrame })
    skins: SpriteFrame[] = [];
    onLoad() {
        if (GemSkinsManager._instance) {
            this.node.destroy();
            return;
        }
        GemSkinsManager._instance = this;
    }
    getSpriteFrameByBlockIndex(blockIndex: number) {
        return this.skins[blockIndex - GEM_SKINS_START_INDEX];
    }
}
