import { _decorator, Enum, sp } from "cc";
import { PreClearActions, PreClearSkinPlayMode } from "./cfgs/types";
import {
    SpineMixColorAnimPair,
    SpineMixSkinEntry,
    SpineMixSlotConfig,
    resolveEntryAnimName,
    resolveSlotAnimName,
    slotIsPerNode,
} from "../../spineMix/SpineMixSkinEntry";

const { ccclass, property } = _decorator;

Enum(PreClearSkinPlayMode);

@ccclass("PreClearColorAnimPair")
export class PreClearColorAnimPair extends SpineMixColorAnimPair {}

@ccclass("PreClearSpineSlotConfig")
export class PreClearSpineSlotConfig extends SpineMixSlotConfig {}

@ccclass("PreClearSkinEntry")
export class PreClearSkinEntry extends SpineMixSkinEntry {
    @property({
        tooltip: "单 Spine：勾选后用 Tween",
        visible(this: PreClearSkinEntry) {
            return this.playMode === PreClearSkinPlayMode.SingleSpine;
        },
    })
    useTweenAction = false;

    @property({
        type: Enum(PreClearActions),
        visible(this: PreClearSkinEntry) {
            return this.playMode === PreClearSkinPlayMode.SingleSpine && this.useTweenAction;
        },
    })
    tweenAction: PreClearActions = PreClearActions.DUANG;

    @property({
        type: [PreClearColorAnimPair],
        tooltip: "blockIndex 1~8 对应下标 0~7（仅 SingleSpine 且未勾选 useTweenAction 时生效）",
    })
    override colorAnims: PreClearColorAnimPair[] = [];

    @property({
        type: PreClearSpineSlotConfig,
        visible(this: PreClearSkinEntry) {
            return this.playMode === PreClearSkinPlayMode.DualSpine;
        },
    })
    override spineA: PreClearSpineSlotConfig = new PreClearSpineSlotConfig();

    @property({
        type: PreClearSpineSlotConfig,
        visible(this: PreClearSkinEntry) {
            return this.playMode === PreClearSkinPlayMode.DualSpine;
        },
    })
    override spineB: PreClearSpineSlotConfig = new PreClearSpineSlotConfig();
}

export { resolveEntryAnimName, resolveSlotAnimName, slotIsPerNode };
