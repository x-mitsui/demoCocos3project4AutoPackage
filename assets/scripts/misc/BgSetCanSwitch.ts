import { _decorator, SpriteFrame, UITransform } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { BgSet } from "./BgSet";
import { MixStateManager } from "./eliminateAni/EliminateSpineMix/MixStateManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("BgSetCanSwitch")
export class BgSetCanSwitch extends BgSet {
    @property(SpriteFrame)
    bgSpriteFrames4Switch: SpriteFrame[] = [];
    protected onLoad(): void {
        super.onLoad();
        eventManager.on(GameEvent.GAME_ALL_ELIMINATE_START, this.switchBG, this);
    }

    protected onDestroy(): void {
        eventManager.off(GameEvent.GAME_ALL_ELIMINATE_START, this.switchBG, this);
        super.onDestroy();
    }

    switchBG() {
        Logger.info("day", this.bgs.length);
        const bgSpriteFrame =
            this.bgSpriteFrames4Switch[MixStateManager.instance.skinCfgCounter % this.bgSpriteFrames4Switch.length];
        this.bgs.forEach((bg) => {
            Logger.info("day bg::", bg.name);
            const uiTransform = bg.node.getComponent(UITransform);
            const size = uiTransform.contentSize;
            bg.spriteFrame = bgSpriteFrame;
            uiTransform.setContentSize(size);
        });
    }
}
