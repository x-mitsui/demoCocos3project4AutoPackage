import { _decorator, Sprite, SpriteFrame, UITransform } from "cc";
import { BlockSize } from "../../configs/config";
import { SuperBlock } from "./SuperBlock";
import { GEM_SKINS_START_INDEX } from "../../managers/GemSkinsManager";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { Logger } from "../../utils/logger";
import { MixStateManager } from "../../misc/eliminateAni/EliminateSpineMix/MixStateManager";

const { ccclass, property } = _decorator;

@ccclass("SkinConstruct")
class SkinConstruct {
    @property(SpriteFrame)
    skins: SpriteFrame[] = [];
}

/**
 * 通过颜色类型获取对应的 SpriteFrame 索引
 */
@ccclass("SpriteBlockMix")
export class SpriteBlockMix extends SuperBlock {
    @property({ type: [SkinConstruct] })
    skinConstructs: SkinConstruct[] = [];

    onLoad() {
        super.onLoad();
        eventManager.on(GameEvent.GAME_ALL_ELIMINATE_START, this.onSkinGroupChanged, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ALL_ELIMINATE_START, this.onSkinGroupChanged, this);
    }

    /** 全屏清盘后 skinCfgCounter 已递增，需与棋盘/背景同步到当前 skinConstruct */
    private onSkinGroupChanged() {
        if (this.blockIndex > 0) {
            this.switchSkin(this.blockIndex);
        }
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
        const skin = this.getSkinByBlockIndex(spBlockIndex);
        Logger.info("SpriteBlockMix:switchSkin:", "skin", skin?.name ?? "(null)");
        if (skin) {
            compSprite.spriteFrame = skin;
        } else {
            // 对象池复用块可能仍挂着上一套 skinConstruct 的贴图
            Logger.warn(
                "SpriteBlockMix:switchSkin:",
                "未找到皮肤，blockIndex=",
                blockIndex,
                "spBlockIndex=",
                spBlockIndex,
            );
        }
        this.blockIndex = blockIndex;
        this.resetBright();
    }

    private getSkinByBlockIndex(blockIndex: number): SpriteFrame | null {
        if (this.skinConstructs.length === 0) return null;
        const mixState = MixStateManager.instance;
        if (!mixState) return null;
        const skinCfgIndex = mixState.skinCfgCounter % this.skinConstructs.length;
        Logger.info("SpriteBlockMix:getSkinByBlockIndex:", "skinCfgIndex", skinCfgIndex);
        const skinConstruct = this.skinConstructs[skinCfgIndex];
        if (!skinConstruct?.skins?.length) return null;
        const idx = blockIndex - 1;
        if (idx < 0 || idx >= skinConstruct.skins.length) return null;
        return skinConstruct.skins[idx] ?? null;
    }

    // 我先把内容注释了，可能暂时不需要
    equipGemstone(blockIndex: number) {
        // const gemstoneNode = this.node.getChildByName("Gem");
        // if (!gemstoneNode) return;
        // gemstoneNode.active = true;
        // const scale = 0.7;
        // gemstoneNode.setScale(scale, scale, 1);
        // const sprite = gemstoneNode.getComponent(Sprite);
        // if (!sprite) return;
        // sprite.spriteFrame = GemSkinsManager.instance.getSpriteFrameByBlockIndex(blockIndex);
    }

    initSize() {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(BlockSize.width, BlockSize.height);
        }
    }

    dissolve() {}
}
