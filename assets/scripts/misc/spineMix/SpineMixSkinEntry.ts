import { _decorator, CCBoolean, CCFloat, CCString, Enum } from "cc";
import { sp } from "../../utils/spineCompat";
import { SpineMixLayoutMode, SpineMixPlayMode } from "./SpineMixTypes";

const { ccclass, property } = _decorator;

Enum(SpineMixPlayMode);
Enum(SpineMixLayoutMode);

const SLOT_DEFAULT_ANIM_HORIZONTAL = "in_x";
const SLOT_DEFAULT_ANIM_VERTICAL = "in_x";

export const DEFAULT_SPINE_MIX_SCALE = 1.08;

export function resolveSlotSpineScale(slot: SpineMixSlotConfig): number {
    const s = slot.scale;
    return s > 0 ? s : DEFAULT_SPINE_MIX_SCALE;
}

export function resolveEntrySpineScale(entry: SpineMixSkinEntry): number {
    const s = entry.scale;
    return s > 0 ? s : DEFAULT_SPINE_MIX_SCALE;
}

/** 将 entry 的 SingleSpine 字段转为槽位配置（供 Runtime 统一走 slot 播放入口） */
export function entryToSingleSpineSlot(entry: SpineMixSkinEntry): SpineMixSlotConfig {
    return {
        nodeName: "Spine",
        layoutMode: entry.layoutMode,
        scale: resolveEntrySpineScale(entry),
        isLoop: entry.isLoop,
        skeletonData: entry.skeletonData,
        colorAnims: entry.colorAnims,
        phaseHandoffDelay: 0,
    };
}

@ccclass("SpineMixColorAnimPair")
export class SpineMixColorAnimPair {
    @property({ type: CCString, tooltip: "行消除 direction=0" })
    horizontal = "";

    @property({ type: CCString, tooltip: "列消除 direction=1" })
    vertical = "";
}

@ccclass("SpineMixSlotConfig")
export class SpineMixSlotConfig {
    @property({
        type: Enum(SpineMixLayoutMode),
        tooltip: "LineLayout：整段行列中心播；PerNode：沿 lineIndex 每格独立 Spine",
    })
    layoutMode: SpineMixLayoutMode = SpineMixLayoutMode.LineLayout;

    @property({
        tooltip:
            "挂点子节点名；与另一槽相同时共用节点串行播，不同时各节点同时播，必须要以Spine开头，不然回收到内存池前无法处理",
    })
    nodeName = "Spine";

    @property({
        type: CCFloat,
        tooltip: "单Spine缩放,PerNode模式下是每个节点的缩放比例，LineLayout模式下是Spine节点的缩放比例",
    })
    scale = DEFAULT_SPINE_MIX_SCALE;

    @property({
        type: CCBoolean,
        tooltip: "动作是否循环",
    })
    isLoop: boolean = false;

    @property(sp.SkeletonData)
    skeletonData: sp.SkeletonData | null = null;

    @property({
        type: [SpineMixColorAnimPair],
        tooltip: "blockIndex 1~8 对应下标 0~7；横/竖消除动画名",
    })
    colorAnims: SpineMixColorAnimPair[] = [];

    @property({
        tooltip: "PerNode 阶段：开始后经过该秒数即进入下一阶段（与「全部播完」取较早者）；0 表示必须等本阶段全部播完",
    })
    phaseHandoffDelay = 0;
}

@ccclass("SpineMixSkinEntry")
export class SpineMixSkinEntry {
    @property({ type: Enum(SpineMixPlayMode) })
    playMode: SpineMixPlayMode = SpineMixPlayMode.SingleSpine;

    @property({
        type: Enum(SpineMixLayoutMode),
        tooltip: "SingleSpine 专用；Dual 请配置 spineA / spineB 各自的 layoutMode",
        visible(this: SpineMixSkinEntry) {
            return this.playMode === SpineMixPlayMode.SingleSpine;
        },
    })
    layoutMode: SpineMixLayoutMode = SpineMixLayoutMode.LineLayout;

    @property({
        type: CCFloat,
        tooltip: "单 Spine 缩放；PerNode 为每格节点，LineLayout 为 Spine 节点",
        visible(this: SpineMixSkinEntry) {
            return this.playMode === SpineMixPlayMode.SingleSpine;
        },
    })
    scale = DEFAULT_SPINE_MIX_SCALE;

    @property({
        type: CCBoolean,
        tooltip: "动作是否循环（仅 SingleSpine）",
        visible(this: SpineMixSkinEntry) {
            return this.playMode === SpineMixPlayMode.SingleSpine;
        },
    })
    isLoop = false;

    @property({
        type: sp.SkeletonData,
        visible(this: SpineMixSkinEntry) {
            return this.playMode === SpineMixPlayMode.SingleSpine;
        },
    })
    skeletonData: sp.SkeletonData | null = null;

    @property({
        type: [SpineMixColorAnimPair],
        tooltip: "blockIndex 1~8 对应下标 0~7；横/竖消除动画名（仅 SingleSpine 生效，Dual 请配 spineA/B）",
        // 勿对 CCClass 数组使用 visible()：编辑器可改长度但无法展开子项
    })
    colorAnims: SpineMixColorAnimPair[] = [];

    @property({
        type: SpineMixSlotConfig,
        visible(this: SpineMixSkinEntry) {
            return this.playMode === SpineMixPlayMode.DualSpine;
        },
    })
    spineA: SpineMixSlotConfig = new SpineMixSlotConfig();

    @property({
        type: SpineMixSlotConfig,
        visible(this: SpineMixSkinEntry) {
            return this.playMode === SpineMixPlayMode.DualSpine;
        },
    })
    spineB: SpineMixSlotConfig = new SpineMixSlotConfig();
}

export function slotIsPerNode(slot: SpineMixSlotConfig): boolean {
    return slot.layoutMode === SpineMixLayoutMode.PerNode;
}

export function dualSpineNeedsLineCells(entry: SpineMixSkinEntry): boolean {
    if (entry.playMode !== SpineMixPlayMode.DualSpine) return false;
    return slotIsPerNode(entry.spineA) || slotIsPerNode(entry.spineB);
}

export function resolveSlotAnimName(
    slot: SpineMixSlotConfig,
    blockIndex: number,
    direction: number,
    fallbackHorizontal = SLOT_DEFAULT_ANIM_HORIZONTAL,
    fallbackVertical = SLOT_DEFAULT_ANIM_VERTICAL,
): string {
    const pair = slot.colorAnims[blockIndex - 1];
    if (pair) {
        const name = direction === 1 ? pair.vertical : pair.horizontal;
        return name || pair.horizontal || pair.vertical || fallbackHorizontal;
    }
    return direction === 1 ? fallbackVertical : fallbackHorizontal;
}

export function resolveEntryAnimName(
    entry: SpineMixSkinEntry,
    blockIndex: number,
    direction: number,
    fallbackHorizontal = SLOT_DEFAULT_ANIM_HORIZONTAL,
    fallbackVertical = SLOT_DEFAULT_ANIM_VERTICAL,
): string {
    const pair = entry.colorAnims[blockIndex - 1];
    if (pair) {
        const name = direction === 1 ? pair.vertical : pair.horizontal;
        return name || pair.horizontal || pair.vertical || fallbackHorizontal;
    }
    return direction === 1 ? fallbackVertical : fallbackHorizontal;
}
