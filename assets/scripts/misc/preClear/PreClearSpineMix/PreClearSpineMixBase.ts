import { _decorator, Component, Node } from "cc";
import { Logger } from "../../../utils/logger";
import { PreClearActions, PreClearSkinPlayMode } from "./cfgs/types";
import { MixStateManager } from "../../eliminateAni/EliminateSpineMix/MixStateManager";
import { startLineHintSyncRotationShake, startLineHintWaveShake } from "../../../dragOptions/lineHintShake";
import { startLineHintDuang } from "../../../dragOptions/lineHintShake/LineHintShakeDuang";
import { ensureSpineSupport, sp } from "../../../utils/spineCompat";
import { SpineMixLayoutMode, SpineMixPlayMode } from "../../spineMix/SpineMixTypes";
import {
    applySkeletonData,
    applySlotSpineScale,
    findSpineMixCompOnNode,
    playDualSpineMixed,
    playDualSpineSequential,
    playSpineAnimation,
    setupSpineAnimComplete,
    prepareSlotLineSpine,
    resolveSlotLineSpine,
    resolveSpineSkeleton,
    slotsUseSameSpineNode,
} from "../../spineMix/SpineMixRuntime";
import { entryToSingleSpineSlot } from "../../spineMix/SpineMixSkinEntry";
import { PreClearSkinEntry, resolveEntryAnimName, resolveSlotAnimName, slotIsPerNode } from "./PreClearSkinEntry";
import type { SpineMixSlotConfig } from "../../spineMix/SpineMixSkinEntry";

const { property } = _decorator;

const LOG_TAG = "PreClearSpineMix";

export type PreClearSpawnPlan = {
    /** 在 hint 上每格挂实例（播 PerNode 槽） */
    spawnPerNodeHints: boolean;
    /** 在行列中心挂实例（播 LineLayout 槽） */
    spawnLineCenter: boolean;
};

/** 运行时查找 PreClearSpineMix / PreClearSpineMix2 */
export function getPreClearSpineMixComp(node: Node | null | undefined): PreClearSpineMixBase | null {
    return findSpineMixCompOnNode(node, PreClearSpineMixBase);
}

/** 预消除 Spine：spineA / spineB 各自 layoutMode 决定挂点与播法 */
export abstract class PreClearSpineMixBase extends Component {
    spSkeleton: sp.Skeleton | null = null;

    private _spine: sp.Skeleton | null = null;

    @property({
        type: [PreClearSkinEntry],
        tooltip: "每套皮肤一组，下标对应 skinCfgCounter",
    })
    skinEntries: PreClearSkinEntry[] = [];

    onLoad() {
        if (!ensureSpineSupport(LOG_TAG + ":onLoad")) return;
        this._spine = resolveSpineSkeleton(this.node, LOG_TAG);
        this.spSkeleton = this._spine;
    }

    getActiveSkinEntry(skinCfgIndex?: number): PreClearSkinEntry | null {
        if (!this.skinEntries.length) return null;
        const idx =
            typeof skinCfgIndex === "number"
                ? skinCfgIndex
                : MixStateManager.instance
                  ? MixStateManager.instance.skinCfgCounter % this.skinEntries.length
                  : 0;
        return this.skinEntries[idx % this.skinEntries.length];
    }

    static getPreClearSpawnPlan(prefabRoot: Node, skinCfgIndex?: number): PreClearSpawnPlan {
        const entry = getPreClearSpineMixComp(prefabRoot)?.getActiveSkinEntry(skinCfgIndex);
        if (!entry) {
            return { spawnPerNodeHints: false, spawnLineCenter: true };
        }
        if (entry.playMode === SpineMixPlayMode.DualSpine) {
            return {
                spawnPerNodeHints: slotIsPerNode(entry.spineA) || slotIsPerNode(entry.spineB),
                spawnLineCenter: !slotIsPerNode(entry.spineA) || !slotIsPerNode(entry.spineB),
            };
        }
        const per = entry.layoutMode === SpineMixLayoutMode.PerNode;
        return { spawnPerNodeHints: per, spawnLineCenter: !per };
    }

    private playOneSlot(
        sk: sp.Skeleton,
        slot: SpineMixSlotConfig,
        blockIndex: number,
        direction: number,
        onComplete?: () => void,
    ): void {
        sk.node.active = true;
        applySlotSpineScale(sk, slot);
        applySkeletonData(sk, slot.skeletonData);
        const anim = resolveSlotAnimName(slot, blockIndex, direction);
        setupSpineAnimComplete(sk, anim, slot.isLoop, onComplete ? () => onComplete() : undefined);
        playSpineAnimation(sk, anim, 0, slot.isLoop);
    }

    private playDualAtHint(entry: PreClearSkinEntry, blockIndex: number, direction: number): void {
        const localCenter = this.node.position.clone();
        const resolveAnim = (slot: SpineMixSlotConfig, bi: number, dir: number) => resolveSlotAnimName(slot, bi, dir);

        if (!slotsUseSameSpineNode(entry.spineA, entry.spineB)) {
            playDualSpineMixed(
                this.node,
                entry.spineA,
                entry.spineB,
                direction,
                localCenter,
                blockIndex,
                undefined,
                LOG_TAG,
                resolveAnim,
            );
            return;
        }

        const sk = this._spine;
        if (!sk?.node) return;
        const animA = resolveSlotAnimName(entry.spineA, blockIndex, direction);
        const animB = resolveSlotAnimName(entry.spineB, blockIndex, direction);
        playDualSpineSequential(sk, entry.spineA, entry.spineB, animA, animB, LOG_TAG);
    }

    private playDualPerNodeSlots(entry: PreClearSkinEntry, blockIndex: number, direction: number): void {
        if (!slotsUseSameSpineNode(entry.spineA, entry.spineB)) {
            this.playDualAtHint(entry, blockIndex, direction);
            return;
        }
        const sk = this._spine;
        if (!sk?.node) return;
        const aNode = slotIsPerNode(entry.spineA);
        const bNode = slotIsPerNode(entry.spineB);
        if (aNode && bNode) {
            const animA = resolveSlotAnimName(entry.spineA, blockIndex, direction);
            const animB = resolveSlotAnimName(entry.spineB, blockIndex, direction);
            playDualSpineSequential(sk, entry.spineA, entry.spineB, animA, animB, LOG_TAG);
            return;
        }
        if (aNode) {
            this.playOneSlot(sk, entry.spineA, blockIndex, direction);
            return;
        }
        if (bNode) {
            this.playOneSlot(sk, entry.spineB, blockIndex, direction);
        }
    }

    private playDualLineSlots(entry: PreClearSkinEntry, blockIndex: number, direction: number): void {
        if (!slotsUseSameSpineNode(entry.spineA, entry.spineB)) {
            this.playDualAtHint(entry, blockIndex, direction);
            return;
        }
        const sk = this._spine;
        if (!sk?.node) return;
        prepareSlotLineSpine(this.node, entry.spineA);
        const aLine = !slotIsPerNode(entry.spineA);
        const bLine = !slotIsPerNode(entry.spineB);
        if (aLine && bLine) {
            const animA = resolveSlotAnimName(entry.spineA, blockIndex, direction);
            const animB = resolveSlotAnimName(entry.spineB, blockIndex, direction);
            playDualSpineSequential(sk, entry.spineA, entry.spineB, animA, animB, LOG_TAG);
            return;
        }
        if (aLine) {
            this.playOneSlot(sk, entry.spineA, blockIndex, direction);
            return;
        }
        if (bLine) {
            this.playOneSlot(sk, entry.spineB, blockIndex, direction);
        }
    }

    /** LineLayout 槽：行列中心单实例 */
    playPreClearLineAnimation(blockIndex: number, direction: number) {
        this.node.setRotationFromEuler(0, 0, 0);
        const mixState = MixStateManager.instance;
        const skinCfgIndex =
            mixState && this.skinEntries.length > 0 ? mixState.skinCfgCounter % this.skinEntries.length : 0;
        const entry = this.getActiveSkinEntry(skinCfgIndex);
        if (!entry) {
            Logger.warn(LOG_TAG + ":playPreClearLineAnimation", "无可用 skinEntries");
            return;
        }

        if (entry.playMode === SpineMixPlayMode.DualSpine) {
            this.playDualLineSlots(entry, blockIndex, direction);
            return;
        }

        prepareSlotLineSpine(this.node, entryToSingleSpineSlot(entry));
        this.playSingleSpine(entry, blockIndex, 0, direction);
    }

    /** PerNode 槽：hint 上单实例播该格 */
    playPreClearAnimation(blockIndex: number, lineIndex: number, direction: number) {
        this.node.setRotationFromEuler(0, 0, 0);

        const mixState = MixStateManager.instance;
        const skinCfgIndex =
            mixState && this.skinEntries.length > 0 ? mixState.skinCfgCounter % this.skinEntries.length : 0;

        const entry = this.getActiveSkinEntry(skinCfgIndex);
        if (!entry) {
            Logger.warn(LOG_TAG + ":playPreClearAnimation", "无可用 skinEntries");
            return;
        }

        if (entry.playMode === SpineMixPlayMode.DualSpine) {
            this.playDualPerNodeSlots(entry, blockIndex, direction);
            return;
        }

        this.playSingleSpine(entry, blockIndex, lineIndex, direction);
    }

    private playSingleSpine(entry: PreClearSkinEntry, blockIndex: number, lineIndex: number, direction: number): void {
        const sk = this._spine;
        if (!sk?.node) {
            Logger.warn(LOG_TAG + ":playSingleSpine", "未找到 Spine");
            return;
        }

        sk.node.active = true;
        sk.node.setRotationFromEuler(0, 0, 0);
        applySlotSpineScale(sk, entryToSingleSpineSlot(entry));
        applySkeletonData(sk, entry.skeletonData);

        const animName = this.resolveSingleAnim(entry, blockIndex, direction);
        Logger.info(
            LOG_TAG + "blockIndex:" + blockIndex + ":playPreClearAnimation",
            "mode:Single",
            "animName:",
            animName,
            typeof animName,
        );

        const slot = entryToSingleSpineSlot(entry);
        if (typeof animName === "string") {
            setupSpineAnimComplete(sk, animName, slot.isLoop);
            playSpineAnimation(sk, animName, 0, slot.isLoop);
        } else {
            this.playTweenAnimation(animName, lineIndex);
        }
    }

    private resolveSingleAnim(entry: PreClearSkinEntry, blockIndex: number, direction: number): string | number {
        if (entry.useTweenAction) {
            return entry.tweenAction;
        }
        return resolveEntryAnimName(entry, blockIndex, direction);
    }

    TweenAnimation = {
        [PreClearActions.SHAKE]: (orderIndex: number) => {
            const parent = this.node.parent;
            if (!parent) return;
            startLineHintWaveShake(parent, orderIndex);
        },
        [PreClearActions.DUANG]: (_orderIndex: number) => {
            const parent = this.node.parent;
            if (!parent) return;
            startLineHintDuang(parent, 0);
        },
        [PreClearActions.SYNC_ROTATION_SHAKE]: (lineIndex: number) => {
            const parent = this.node.parent;
            if (!parent) return;
            startLineHintSyncRotationShake(parent, lineIndex);
        },
    };

    private playTweenAnimation(animName: number, orderIndex: number) {
        this.TweenAnimation[animName](orderIndex);
    }
}
