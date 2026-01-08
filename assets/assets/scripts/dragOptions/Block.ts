import { _decorator, Color, Component, log, Sprite, SpriteFrame, UITransform } from "cc";
import { BlockSize } from "../configs/config";

const { ccclass, property } = _decorator;

/**
 * 通过颜色类型获取对应的 SpriteFrame 索引
 */

@ccclass("Block")
export class Block extends Component {
    @property
    colorIdx = 0;
    @property({ type: SpriteFrame })
    skins: SpriteFrame[] = [];
    isOffsetZero: boolean = false; // 是否是偏移量为0的块
    init(colorIdx: number) {
        // log("init color:", colorIdx);
        this.colorIdx = colorIdx;
        this.initSkin();
        this.initSize();
    }
    initSkin() {
        const compSprite = this.node.getComponent(Sprite);
        if (compSprite) {
            compSprite.spriteFrame = this.skins[this.colorIdx];
        }
    }
    initSize() {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(BlockSize.width, BlockSize.height);
        }
    }
    setOpacity(opacity: number) {
        const compSprite = this.node.getComponent(Sprite);
        if (compSprite) {
            compSprite.color = new Color(255, 255, 255, opacity);
        }
    }
}
