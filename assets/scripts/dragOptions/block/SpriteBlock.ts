import { _decorator, Sprite, SpriteFrame, UITransform } from "cc";
import { BlockSize } from "../../configs/config";
import { SuperBlock } from "./SuperBlock";
import { GameManager } from "../../managers/GameManager";
import { GEM_SKINS_START_INDEX, GemSkinsManager } from "../../managers/GemSkinsManager";

const { ccclass, property } = _decorator;

/**
 * 通过颜色类型获取对应的 SpriteFrame 索引
 */
@ccclass("SpriteBlock")
export class SpriteBlock extends SuperBlock {
    @property({ type: SpriteFrame })
    skins: SpriteFrame[] = [];
    onLoad() {
        super.onLoad();
    }
    init(blockIndex: number) {
        this.switchSkin(blockIndex);
        this.initSize();
    }
    switchSkin(blockIndex: number) {
        const compSprite = this.node.getComponent(Sprite);
        if (!compSprite) return;
        let spBlockIndex = blockIndex;
        if (blockIndex > 10) {
            this.equipGemstone(blockIndex);
            spBlockIndex = blockIndex - GEM_SKINS_START_INDEX;
        }
        compSprite.spriteFrame = this.skins[spBlockIndex];
        this.blockIndex = blockIndex;
        this.resetBright();
    }
    equipGemstone(blockIndex: number) {
        const gemstoneNode = this.node.getChildByName("Gem");
        gemstoneNode.active = true;
        // 因为整个block才120，所以要缩小gem
        const scale = 0.7;
        gemstoneNode.setScale(scale, scale, 1);
        const sprite = gemstoneNode.getComponent(Sprite);
        sprite.spriteFrame = GemSkinsManager.instance.getSpriteFrameByBlockIndex(blockIndex);
    }
    initSize() {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(BlockSize.width, BlockSize.height);
        }
    }
    dissolve() {}
}
