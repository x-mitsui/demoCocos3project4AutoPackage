import { _decorator, CCInteger, Component, Vec3 } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { Logger } from "../../utils/logger";
import { disableSpinePremultipliedAlpha, ensureSpineSupport, sp } from "../../utils/spineCompat";

const { ccclass, property } = _decorator;

/**
 * Soap 消除 Spine：不修改 Board。
 * Board 在 GAME_ELIMINATE_START 之后仍会同步对子节点 Spine setAnimation(in_x 等) 且列消除会根节点转 90°，
 * 因此这里：先切换 skeleton / 算好 animName，再 scheduleOnce(0) 延后覆盖旋转与动画，避免被 Board 盖掉。
 */
@ccclass("EliminateSpineAni4Soap")
export class EliminateSpineAni4Soap extends Component {
    spSkeleton: sp.Skeleton | null = null;

    @property({
        type: [sp.SkeletonData],
        tooltip: "与 aniNameCfg 各行一一对应；有配置时播前按行下标切换 Spine.skeletonData",
    })
    skeletonDatas: sp.SkeletonData[] = [];

    @property({
        type: CCInteger,
        tooltip: "skeletonDatas 为空时仅作占位；有配置时以下标 rowIdx % length 取值",
    })
    curSkeletonDataIndex: number = 0;

    @property(String)
    aniName: string = "in";

    /** 行消除：每组一行，下标 = skinGroupIndex % 行数（payload 无则 0） */
    aniNameCfg = [["pink_x", "yellow_x", "pink_x", "yellow_x", "pink_x", "yellow_x", "pink_x"]];
    /** 列消除：竖直动作 */
    aniNameCfg2 = [["pink_y", "yellow_y", "pink_y", "yellow_y", "pink_y", "yellow_y", "pink_y"]];

    private _pendingSoapEliminate: { worldPos: Vec3; animName: string } | null = null;

    onLoad() {
        if (!ensureSpineSupport("EliminateSpineAni4Soap:onLoad")) return;

        const spineNode = this.node.getChildByName("Spine");
        this.spSkeleton =
            spineNode?.getComponent(sp.Skeleton) ?? this.node.getComponent(sp.Skeleton);
        disableSpinePremultipliedAlpha(this.spSkeleton);
        eventManager.once(GameEvent.GAME_ELIMINATE_START, this.playEliminateAnimation, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ELIMINATE_START, this.playEliminateAnimation, this);
        this.unschedule(this._applySoapEliminateDeferred);
        this._pendingSoapEliminate = null;
    }

    private getSkinPackRowIndex(skinGroupIndex: number): number {
        const rows = this.aniNameCfg;
        if (!rows.length) return 0;
        return ((skinGroupIndex % rows.length) + rows.length) % rows.length;
    }

    private applySkeletonDataForRow(rowIdx: number): void {
        if (!this.spSkeleton) return;
        const list = this.skeletonDatas;
        if (!list.length) return;

        const idx = rowIdx % list.length;
        const data = list[idx];
        if (!data) {
            Logger.warn(
                "EliminateSpineAni4Soap:applySkeletonDataForRow",
                "skeletonDatas[" + idx + "] 为空",
            );
            return;
        }
        if (this.spSkeleton.skeletonData !== data) {
            this.spSkeleton.skeletonData = data;
            this.spSkeleton.clearTracks();
            this.spSkeleton.setSkin("default");
            this.spSkeleton.setSlotsToSetupPose();
        }
    }

    private resolveAnimName(blockIndex: number, skinGroupIndex: number, isColumn: boolean): string {
        const rowIdx = this.getSkinPackRowIndex(skinGroupIndex);
        const primary = isColumn && this.aniNameCfg2.length ? this.aniNameCfg2 : this.aniNameCfg;
        const fallback = this.aniNameCfg;
        const rows = primary.length ? primary : fallback;
        if (!rows.length) return isColumn ? "in_y" : "in_x";

        const seq = rows[rowIdx % rows.length] ?? rows[0];
        if (!seq?.length) return isColumn ? "in_y" : "in_x";

        const col = Math.max(0, blockIndex - 1) % seq.length;
        return seq[col] ?? (isColumn ? "in_y" : "in_x");
    }

    private readonly _applySoapEliminateDeferred = (): void => {
        const pending = this._pendingSoapEliminate;
        if (!pending || !this.isValid || !this.spSkeleton?.isValid) return;
        this._pendingSoapEliminate = null;

        // 列消除时 Board 已对根节点转 90°，竖直动作需按资源朝向播放时清零
        this.node.setRotationFromEuler(0, 0, 0);
        this.spSkeleton.node.setRotationFromEuler(0, 0, 0);
        this.spSkeleton.node.setWorldPosition(pending.worldPos);

        this.spSkeleton.clearTracks();
        this.spSkeleton.setAnimation(0, pending.animName, false);
        this.spSkeleton.setCompleteListener((trackEntry) => {
            const finishedName = trackEntry?.animation?.name ?? "";
            if (finishedName === pending.animName) {
                eventManager.emit(GameEvent.GAME_ELIMINATE, pending.worldPos.clone());
            }
            this.node.destroy();
        });
    };

    playEliminateAnimation(payload: {
        worldPos: Vec3;
        direction: number;
        blockIndex: number;
        skinGroupIndex?: number;
        eliminateBatchToken?: unknown;
    }) {
        Logger.info(
            "EliminateSpineAni4Soap:playEliminateAnimation:",
            "-----播放消除动画",
            payload.worldPos,
            payload.blockIndex,
            "direction",
            payload.direction,
        );
        if (!this.spSkeleton) return;

        const { worldPos, direction, blockIndex } = payload;
        if (!worldPos) return;

        const skinGroupIndex =
            typeof payload.skinGroupIndex === "number" ? payload.skinGroupIndex : 0;
        const isColumn = direction === 1;
        const rowIdx = this.getSkinPackRowIndex(skinGroupIndex);
        this.applySkeletonDataForRow(rowIdx);
        const animName = this.resolveAnimName(blockIndex, skinGroupIndex, isColumn);

        const skeletonDataIdx = this.skeletonDatas.length
            ? rowIdx % this.skeletonDatas.length
            : this.curSkeletonDataIndex;
        Logger.info(
            "EliminateSpineAni4Soap:playEliminateAnimation:",
            "rowIdx",
            rowIdx,
            "skeletonDataIdx",
            skeletonDataIdx,
            "animName",
            animName,
            "(deferred apply: Board 会在 emit 后覆盖 Spine，此处下一帧再设)",
        );

        this.unschedule(this._applySoapEliminateDeferred);
        this._pendingSoapEliminate = { worldPos: worldPos.clone(), animName };
        this.scheduleOnce(this._applySoapEliminateDeferred, 0);
    }
}
