import { _decorator, Component, Node, Vec3 } from "cc";

import { Board } from "../../../board/Board";
import { eventManager, GameEvent } from "../../../managers/EventManager";
import { Logger } from "../../../utils/logger";
import { ensureSpineSupport, sp } from "../../../utils/spineCompat";
import { SpineMixLayoutMode, SpineMixPlayMode } from "../../spineMix/SpineMixTypes";
import {
    dualSpineNeedsLineCells,
    entryToSingleSpineSlot,
    resolveEntryAnimName,
    resolveSlotAnimName,
} from "../../spineMix/SpineMixSkinEntry";
import { EliminateSkinEntry } from "./EliminateSkinEntry";
import type { SpineMixSkinEntry } from "../../spineMix/SpineMixSkinEntry";
import {
    applySkeletonData,
    applySlotSpineScale,
    buildEliminateLineCells,
    findSpineMixCompOnNode,
    playDualSpineMixed,
    playSingleSpinePerNodes,
    playSpineAnimation,
    prepareSlotLineSpine,
    resolveSlotLineSpine,
    resolveSpineSkeleton,
    setSpineNodeAtWorld,
    type SpineLineCell,
} from "../../spineMix/SpineMixRuntime";
import { MixStateManager } from "./MixStateManager";
import { AudioManager } from "../../../managers/AudioManager";

const { property } = _decorator;

const LOG_TAG = "EliminateSpineMix";
const ELIMINATE_FALLBACK_H = "in_x";
const ELIMINATE_FALLBACK_V = "in_y";

export type EliminateSpinePayload = {
    worldPos: Vec3;
    direction: number;
    blockIndex: number;
    skinGroupIndex?: number;
    /** 仅由本实例处理（避免全局事件误触其它 Eliminate 节点） */
    eliminateNode?: Node;
    /** 行消除：clearRow>=0；列消除：clearCol>=0 */
    clearRow?: number;
    clearCol?: number;
    lineCells?: SpineLineCell[];
};

/** 运行时查找 EliminateSpineMix / EliminateSpineMix2 */
export function getEliminateSpineMixComp(node: Node | null | undefined): EliminateSpineMixBase | null {
    return findSpineMixCompOnNode(node, EliminateSpineMixBase);
}

/** 消除 Spine：根挂组件，子节点 Spine；Dual 为同一 Spine 上 A→B */
export abstract class EliminateSpineMixBase extends Component {
    spSkeleton: sp.Skeleton | null = null;

    private _spine: sp.Skeleton | null = null;

    @property({
        type: [EliminateSkinEntry],
        tooltip: "每套皮肤一组，下标对应 skinCfgCounter",
    })
    skinEntries: EliminateSkinEntry[] = [];

    onLoad() {
        if (!ensureSpineSupport(LOG_TAG + ":onLoad")) return;
        eventManager.on(GameEvent.GAME_ELIMINATE_START, this.onGameEliminateStart, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ELIMINATE_START, this.onGameEliminateStart, this);
    }

    private onGameEliminateStart(payload: EliminateSpinePayload) {
        if (payload.eliminateNode && payload.eliminateNode !== this.node) return;
        this.playEliminateDirect(this.resolvePayload(payload));
    }

    private resolvePayload(payload: EliminateSpinePayload): EliminateSpinePayload {
        if (payload.lineCells?.length) return payload;

        const skinCfgIndex =
            typeof payload.skinGroupIndex === "number"
                ? payload.skinGroupIndex
                : MixStateManager.instance && this.skinEntries.length > 0
                  ? MixStateManager.instance.skinCfgCounter % this.skinEntries.length
                  : 0;

        if (!this.needsLineCells(skinCfgIndex)) return payload;

        const row = payload.clearRow ?? -1;
        const col = payload.clearCol ?? -1;
        const board = this.node.parent?.getComponent(Board);
        if (!board?.originNode) return payload;

        const origin = board.originNode;
        const originPos = new Vec3(origin.x, origin.y, origin.z);
        return {
            ...payload,
            lineCells: buildEliminateLineCells(board.node, originPos, row, col, payload.blockIndex),
        };
    }

    private resolveTemplateSkeletonData(entry: SpineMixSkinEntry): sp.SkeletonData | null {
        if (entry.playMode === SpineMixPlayMode.DualSpine) {
            return entry.spineA.skeletonData ?? entry.spineB.skeletonData;
        }
        return entry.skeletonData;
    }

    getActiveSkinEntry(skinCfgIndex?: number): SpineMixSkinEntry | null {
        if (!this.skinEntries.length) return null;
        const idx =
            typeof skinCfgIndex === "number"
                ? skinCfgIndex
                : MixStateManager.instance
                  ? MixStateManager.instance.skinCfgCounter % this.skinEntries.length
                  : 0;
        return this.skinEntries[idx % this.skinEntries.length];
    }

    isDualSpineMode(skinCfgIndex?: number): boolean {
        return this.getActiveSkinEntry(skinCfgIndex)?.playMode === SpineMixPlayMode.DualSpine;
    }

    needsLineCells(skinCfgIndex?: number): boolean {
        const entry = this.getActiveSkinEntry(skinCfgIndex);
        if (!entry) return false;
        if (entry.playMode === SpineMixPlayMode.DualSpine) {
            return dualSpineNeedsLineCells(entry);
        }
        return entry.layoutMode === SpineMixLayoutMode.PerNode;
    }

    private disposeEliminateRoot(): void {
        if (!this.node?.isValid) return;
        this.node.destroy();
    }

    /** 动画结束：事件仅在校验通过时发出，节点始终销毁，避免 Eliminate 堆积 */
    private onEliminateAnimComplete(worldPos: Vec3, expectedAnimName: string, actualAnimName: string): void {
        const animOk =
            !actualAnimName || !expectedAnimName || actualAnimName === expectedAnimName;
        if (animOk) {
            eventManager.emit(GameEvent.GAME_ELIMINATE, worldPos.clone());
        } else {
            Logger.warn(LOG_TAG, "complete anim mismatch, still dispose", expectedAnimName, actualAnimName);
        }
        const mix = MixStateManager.instance;
        if (mix) {
            mix.addToken(
                1,
                () => {
                    Logger.info(LOG_TAG, "达到 token 限制");
                },
                () => this.disposeEliminateRoot(),
            );
        } else {
            this.disposeEliminateRoot();
        }
    }

    private bindEliminateCompleteListener(
        sk: sp.Skeleton,
        worldPos: Vec3,
        animName: string,
        loop: boolean,
    ): void {
        if (loop) {
            sk.setCompleteListener(() => {});
            return;
        }
        sk.setCompleteListener((trackEntry) => {
            this.onEliminateAnimComplete(worldPos, animName, trackEntry?.animation?.name ?? "");
        });
    }

    /** 调试：blockIndex ↔ colorAnims 下标 ↔ 实际动画名 */
    private logEliminateAnimResolve(
        slotLabel: string,
        slot: SpineMixSkinEntry["spineA"],
        blockIndex: number,
        direction: number,
        lineIndex?: number,
    ): string {
        const pair = slot.colorAnims[blockIndex - 1];
        const anim = resolveSlotAnimName(slot, blockIndex, direction, ELIMINATE_FALLBACK_H, ELIMINATE_FALLBACK_V);
        const dirLabel = direction === 1 ? "vertical" : "horizontal";
        const idx = lineIndex ?? "-";
        Logger.info(
            LOG_TAG,
            `[${slotLabel}] lineIndex=${idx} blockIndex=${blockIndex} colorAnims[${blockIndex - 1}]=`,
            pair ? `{h:${pair.horizontal},v:${pair.vertical}}` : "undefined",
            `→ anim="${anim}" (${dirLabel})`,
        );
        return anim;
    }

    private playDualSpine(entry: SpineMixSkinEntry, payload: EliminateSpinePayload): void {
        const { blockIndex, direction, worldPos, lineCells } = payload;
        const slotA = entry.spineA;
        const slotB = entry.spineB;
        const resolveAnim = (slot: typeof slotA, bi: number, dir: number) =>
            resolveSlotAnimName(slot, bi, dir, ELIMINATE_FALLBACK_H, ELIMINATE_FALLBACK_V);

        Logger.info(LOG_TAG, "playDualSpine direction=", direction, "payload.blockIndex=", blockIndex);
        if (lineCells?.length) {
            lineCells.forEach((cell, lineIndex) => {
                this.logEliminateAnimResolve("spineA", slotA, cell.blockIndex, direction, lineIndex);
                this.logEliminateAnimResolve("spineB", slotB, cell.blockIndex, direction, lineIndex);
            });
        }
        this.logEliminateAnimResolve("spineA@center", slotA, blockIndex, direction);
        this.logEliminateAnimResolve("spineB@center", slotB, blockIndex, direction);

        const last = lineCells?.length ? lineCells[lineCells.length - 1] : null;
        const completePos = last?.worldPos ?? worldPos;
        const completeBlockIndex = last?.blockIndex ?? blockIndex;
        const lastAnimB = resolveAnim(slotB, completeBlockIndex, direction);
        playDualSpineMixed(
            this.node,
            slotA,
            slotB,
            direction,
            worldPos,
            blockIndex,
            lineCells,
            LOG_TAG,
            resolveAnim,
            (trackEntry) => {
                this.onEliminateAnimComplete(completePos, lastAnimB, trackEntry?.animation?.name ?? lastAnimB);
            },
        );
    }

    private playSingleSpine(entry: SpineMixSkinEntry, payload: EliminateSpinePayload): void {
        const { blockIndex, direction, worldPos, lineCells } = payload;

        if (lineCells?.length) {
            lineCells.forEach((cell, lineIndex) => {
                const pair = entry.colorAnims[cell.blockIndex - 1];
                const anim = resolveEntryAnimName(
                    entry,
                    cell.blockIndex,
                    direction,
                    ELIMINATE_FALLBACK_H,
                    ELIMINATE_FALLBACK_V,
                );
                Logger.info(
                    LOG_TAG,
                    `[Single] lineIndex=${lineIndex} blockIndex=${cell.blockIndex} colorAnims[${cell.blockIndex - 1}]=`,
                    pair ? `{h:${pair.horizontal},v:${pair.vertical}}` : "undefined",
                    `→ anim="${anim}"`,
                );
            });
        } else {
            const pair = entry.colorAnims[blockIndex - 1];
            const anim = resolveEntryAnimName(entry, blockIndex, direction, ELIMINATE_FALLBACK_H, ELIMINATE_FALLBACK_V);
            Logger.info(
                LOG_TAG,
                `[Single@center] blockIndex=${blockIndex} colorAnims[${blockIndex - 1}]=`,
                pair ? `{h:${pair.horizontal},v:${pair.vertical}}` : "undefined",
                `→ anim="${anim}"`,
            );
        }

        if (entry.layoutMode === SpineMixLayoutMode.PerNode && lineCells?.length) {
            const last = lineCells[lineCells.length - 1];
            const lastAnim = resolveEntryAnimName(
                entry,
                last.blockIndex,
                direction,
                ELIMINATE_FALLBACK_H,
                ELIMINATE_FALLBACK_V,
            );
            playSingleSpinePerNodes(
                this.node,
                entryToSingleSpineSlot(entry),
                direction,
                lineCells,
                LOG_TAG,
                (bi, dir) => resolveEntryAnimName(entry, bi, dir, ELIMINATE_FALLBACK_H, ELIMINATE_FALLBACK_V),
                undefined,
                () => {
                    this.onEliminateAnimComplete(last.worldPos, lastAnim, lastAnim);
                },
            );
            return;
        }

        const templateData = this.resolveTemplateSkeletonData(entry);
        const sk = resolveSpineSkeleton(this.node, LOG_TAG, templateData);
        this._spine = sk;
        this.spSkeleton = sk;
        if (!sk?.node) {
            Logger.warn(LOG_TAG + ":playSingleSpine", "无法创建 LineLayout Spine");
            this.disposeEliminateRoot();
            return;
        }

        const singleSlot = entryToSingleSpineSlot(entry);
        prepareSlotLineSpine(this.node, singleSlot);
        sk.node.active = true;
        this.node.setRotationFromEuler(0, 0, 0);
        sk.node.setRotationFromEuler(0, 0, 0);
        applySlotSpineScale(sk, singleSlot);
        setSpineNodeAtWorld(this.node, sk, worldPos);
        applySkeletonData(sk, entry.skeletonData);

        const animName = resolveEntryAnimName(entry, blockIndex, direction, ELIMINATE_FALLBACK_H, ELIMINATE_FALLBACK_V);
        this.bindEliminateCompleteListener(sk, worldPos, animName, singleSlot.isLoop);
        playSpineAnimation(sk, animName, 0, singleSlot.isLoop);
    }

    playEliminateDirect(payload: EliminateSpinePayload) {
        if (!payload.worldPos) {
            this.disposeEliminateRoot();
            return;
        }

        // Board 列消除会对根节点转 90°（旧 Spine 单动画方案）；Mix 用 h/v 分轨动画名，需清零旋转
        this.node.setRotationFromEuler(0, 0, 0);

        const skinCfgIndex =
            typeof payload.skinGroupIndex === "number"
                ? payload.skinGroupIndex
                : MixStateManager.instance && this.skinEntries.length > 0
                  ? MixStateManager.instance.skinCfgCounter % this.skinEntries.length
                  : 0;

        const entry = this.getActiveSkinEntry(skinCfgIndex);
        if (!entry) {
            Logger.warn(LOG_TAG, "无可用 skinEntries");
            this.disposeEliminateRoot();
            return;
        }

        if (entry.playMode === SpineMixPlayMode.DualSpine) {
            this.playDualSpine(entry, payload);
            return;
        }

        this.playSingleSpine(entry, payload);
    }

    playEliminateAnimation(payload: EliminateSpinePayload) {
        this.playEliminateDirect(payload);
    }
}
