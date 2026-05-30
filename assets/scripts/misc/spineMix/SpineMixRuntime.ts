import { instantiate, Node, UITransform, Vec3 } from "cc";
import { BlockSize } from "../../configs/config";
import { Logger } from "../../utils/logger";
import { disableSpinePremultipliedAlpha, sp } from "../../utils/spineCompat";
import { DEFAULT_SPINE_MIX_SCALE, resolveSlotSpineScale, slotIsPerNode, SpineMixSlotConfig } from "./SpineMixSkinEntry";

type SpineTrackEntryLike = { animation?: { name?: string } } | null;

const DEFAULT_SPINE_NODE = "Spine";

export function slotLineNodeName(slot: SpineMixSlotConfig): string {
    const name = slot.nodeName?.trim();
    return name || DEFAULT_SPINE_NODE;
}

/** PerNode 子节点：Spine0~7 或 SpineA0~7 */
export function slotPerNodeChildName(slot: SpineMixSlotConfig, lineIndex: number): string {
    const base = slotLineNodeName(slot);
    const i = Math.max(0, Math.min(7, lineIndex | 0));
    if (base === DEFAULT_SPINE_NODE && i === 0) return DEFAULT_SPINE_NODE;
    return `${base}${i}`;
}

export function slotsUseSameSpineNode(slotA: SpineMixSlotConfig, slotB: SpineMixSlotConfig): boolean {
    return slotLineNodeName(slotA) === slotLineNodeName(slotB);
}

/** @deprecated 使用 slotPerNodeChildName(slot, lineIndex) */
export function perNodeSpineChildName(lineIndex: number): string {
    return slotPerNodeChildName({ nodeName: DEFAULT_SPINE_NODE } as SpineMixSlotConfig, lineIndex);
}

export function ensureSpineChild(
    root: Node,
    childName: string,
    skeletonData: sp.SkeletonData | null,
    logTag: string,
): sp.Skeleton | null {
    let child = root.getChildByName(childName);
    if (!child) {
        child = new Node(childName);
        child.parent = root;
        child.setPosition(0, 0, 0);
        child.addComponent(UITransform);
        const sk = child.addComponent(sp.Skeleton);
        disableSpinePremultipliedAlpha(sk);
        if (skeletonData) {
            sk.skeletonData = skeletonData;
            sk.setSkin("default");
            sk.setSlotsToSetupPose();
        }
        Logger.info(logTag, "动态创建", childName);
        return sk;
    }
    const sk = child.getComponent(sp.Skeleton);
    disableSpinePremultipliedAlpha(sk);
    if (sk && skeletonData && sk.skeletonData !== skeletonData) {
        applySkeletonData(sk, skeletonData);
    }
    return sk;
}

/** LineLayout：按槽位 nodeName 解析/创建 */
export function resolveSlotLineSpine(root: Node, slot: SpineMixSlotConfig, logTag: string): sp.Skeleton | null {
    const name = slotLineNodeName(slot);
    const sk = ensureSpineChild(root, name, slot.skeletonData, logTag);
    if (!sk) Logger.warn(logTag, `无法创建/解析 LineLayout ${name}`);
    return sk;
}

/** @deprecated 使用 resolveSlotLineSpine */
export function resolveSpineSkeleton(
    root: Node,
    logTag: string,
    skeletonData: sp.SkeletonData | null = null,
): sp.Skeleton | null {
    return ensureSpineChild(root, DEFAULT_SPINE_NODE, skeletonData, logTag);
}

export function buildEliminateLineCells(
    boardNode: Node,
    boardOrigin: Vec3,
    row: number,
    col: number,
    blockIndex: number,
): SpineLineCell[] {
    const cells: SpineLineCell[] = [];
    const boardUi = boardNode.getComponent(UITransform);
    for (let i = 0; i < 8; i++) {
        const r = row >= 0 ? row : i;
        const c = col >= 0 ? col : i;
        const local = new Vec3(boardOrigin.x + c * BlockSize.width, boardOrigin.y - r * BlockSize.height, 0);
        const worldPos = boardUi ? boardUi.convertToWorldSpaceAR(local) : local.clone();
        cells.push({ worldPos, blockIndex });
    }
    return cells;
}

export function setSpineNodeAtWorld(root: Node, sk: sp.Skeleton, worldPos: Vec3): void {
    const ui = root.getComponent(UITransform);
    if (ui) {
        sk.node.setPosition(ui.convertToNodeSpaceAR(worldPos));
    } else {
        sk.node.setWorldPosition(worldPos);
    }
}

function resetPerNodeChildren(root: Node, slot: SpineMixSlotConfig, active: boolean): void {
    for (let i = 0; i < 8; i++) {
        const n = root.getChildByName(slotPerNodeChildName(slot, i));
        if (n) n.active = active;
    }
}

export function prepareSlotLineSpine(root: Node, slot: SpineMixSlotConfig): void {
    const lineName = slotLineNodeName(slot);
    for (let i = 0; i < 8; i++) {
        const n = root.getChildByName(slotPerNodeChildName(slot, i));
        if (n && n.name !== lineName) n.active = false;
    }
    const line = root.getChildByName(lineName);
    if (line) {
        line.active = true;
        line.setPosition(0, 0, 0);
    }
}

export function prepareSlotPerNodeSpines(root: Node, slot: SpineMixSlotConfig): void {
    const lineName = slotLineNodeName(slot);
    const line = root.getChildByName(lineName);
    if (line && slotPerNodeChildName(slot, 0) !== lineName) {
        line.active = false;
    }
    resetPerNodeChildren(root, slot, false);
}

/** @deprecated */
export function prepareLineLayoutSpines(root: Node): void {
    prepareSlotLineSpine(root, { nodeName: DEFAULT_SPINE_NODE } as SpineMixSlotConfig);
}

/** @deprecated */
export function preparePerNodeSpines(root: Node): void {
    prepareSlotPerNodeSpines(root, { nodeName: DEFAULT_SPINE_NODE } as SpineMixSlotConfig);
}

export function resolveSlotPerNodeSpine(
    root: Node,
    slot: SpineMixSlotConfig,
    lineIndex: number,
    logTag: string,
): sp.Skeleton | null {
    const i = Math.max(0, Math.min(7, lineIndex | 0));
    const name = slotPerNodeChildName(slot, i);
    if (i === 0) {
        const sk =
            ensureSpineChild(root, name, slot.skeletonData, logTag) ??
            (name !== DEFAULT_SPINE_NODE
                ? ensureSpineChild(root, DEFAULT_SPINE_NODE, slot.skeletonData, logTag)
                : null);
        return sk;
    }

    let child = root.getChildByName(name);
    const template = root.getChildByName(slotPerNodeChildName(slot, 0)) ?? root.getChildByName(slotLineNodeName(slot));
    if (!child && template) {
        child = instantiate(template);
        child.name = name;
        child.parent = root;
        child.setPosition(0, 0, 0);
    } else if (!child) {
        return ensureSpineChild(root, name, slot.skeletonData, logTag);
    }
    const sk = child.getComponent(sp.Skeleton);
    disableSpinePremultipliedAlpha(sk);
    if (!sk) Logger.warn(logTag, `未找到 ${name} 上的 sp.Skeleton`);
    return sk;
}

/** @deprecated */
export function resolvePerNodeSpine(
    root: Node,
    lineIndex: number,
    logTag: string,
    skeletonData: sp.SkeletonData | null = null,
): sp.Skeleton | null {
    return resolveSlotPerNodeSpine(
        root,
        { nodeName: DEFAULT_SPINE_NODE, skeletonData } as SpineMixSlotConfig,
        lineIndex,
        logTag,
    );
}

export function applySpineNodeScale(sk: sp.Skeleton | null, scale: number): void {
    if (!sk?.node) return;
    const s = scale > 0 ? scale : DEFAULT_SPINE_MIX_SCALE;
    sk.node.setScale(s, s, 1);
}

export function applySlotSpineScale(sk: sp.Skeleton | null, slot: SpineMixSlotConfig): void {
    applySpineNodeScale(sk, resolveSlotSpineScale(slot));
}

export function applySkeletonData(sk: sp.Skeleton | null, data: sp.SkeletonData | null): void {
    if (!sk) return;
    disableSpinePremultipliedAlpha(sk);
    if (!data) return;
    if (sk.skeletonData !== data) {
        sk.skeletonData = data;
        sk.clearTracks();
        sk.setSkin("default");
        sk.setSlotsToSetupPose();
    }
}

export function playSpineAnimation(
    sk: sp.Skeleton | null,
    animName: string,
    trackIndex = 0,
    loop = false,
): void {
    if (!sk?.node?.active) return;
    disableSpinePremultipliedAlpha(sk);
    sk.setAnimation(trackIndex, animName, loop);
}

/** 非循环时监听播完；循环时清监听，并由 notifySpineCompleteIfLoop 处理仍需回调的场景 */
export function setupSpineAnimComplete(
    sk: sp.Skeleton,
    animName: string,
    loop: boolean,
    onComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    if (loop || !onComplete) {
        sk.setCompleteListener(() => {});
        return;
    }
    sk.setCompleteListener((trackEntry) => {
        const finishedName = trackEntry?.animation?.name ?? "";
        if (finishedName !== animName) return;
        sk.setCompleteListener(() => {});
        onComplete(trackEntry);
    });
}

export function notifySpineCompleteIfLoop(
    loop: boolean,
    onComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    if (loop && onComplete) {
        onComplete(null);
    }
}

export interface SpineLineCell {
    worldPos: Vec3;
    blockIndex: number;
}

function createParallelCompleteGate(
    parts: number,
    onAllComplete?: (trackEntry: SpineTrackEntryLike) => void,
): (trackEntry?: SpineTrackEntryLike) => void {
    let done = 0;
    let lastTrack: SpineTrackEntryLike = null;
    return (trackEntry?: SpineTrackEntryLike) => {
        if (trackEntry) lastTrack = trackEntry;
        done++;
        if (done >= parts) onAllComplete?.(lastTrack);
    };
}

function runPerNodeThenNextPhase(
    root: Node,
    perNodeSlot: SpineMixSlotConfig,
    direction: number,
    cells: SpineLineCell[],
    logTag: string,
    resolveAnim: (slot: SpineMixSlotConfig, blockIndex: number, direction: number) => string,
    nextPhase: (trackEntry: SpineTrackEntryLike) => void,
): void {
    let handedOff = false;
    const handoff = (trackEntry: SpineTrackEntryLike = null): void => {
        if (handedOff || !root.isValid) return;
        handedOff = true;
        nextPhase(trackEntry);
    };

    playSlotPerNodes(root, perNodeSlot, direction, cells, logTag, resolveAnim, (te) => handoff(te));

    const delaySec = perNodeSlot.phaseHandoffDelay;
    if (delaySec > 0) {
        setTimeout(() => handoff(), delaySec * 1000);
        Logger.info(logTag, "PerNode handoffDelay=", delaySec, "s", slotLineNodeName(perNodeSlot));
    }
}

export function playSlotPerNodes(
    root: Node,
    slot: SpineMixSlotConfig,
    direction: number,
    cells: SpineLineCell[],
    logTag: string,
    resolveAnim: (slot: SpineMixSlotConfig, blockIndex: number, direction: number) => string,
    onAllComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    if (!cells.length) return;

    prepareSlotPerNodeSpines(root, slot);

    let done = 0;
    let lastTrack: SpineTrackEntryLike = null;
    let started = 0;

    cells.forEach((cell, lineIndex) => {
        const sk = resolveSlotPerNodeSpine(root, slot, lineIndex, logTag);
        if (!sk?.node) return;

        started++;
        sk.node.active = true;
        sk.node.setRotationFromEuler(0, 0, 0);
        applySlotSpineScale(sk, slot);
        setSpineNodeAtWorld(root, sk, cell.worldPos);
        applySkeletonData(sk, slot.skeletonData);
        const anim = resolveAnim(slot, cell.blockIndex, direction);

        setupSpineAnimComplete(sk, anim, slot.isLoop, (trackEntry) => {
            lastTrack = trackEntry;
            done++;
            if (done >= started) onAllComplete?.(lastTrack);
        });
        playSpineAnimation(sk, anim, 0, slot.isLoop);
    });

    if (started === 0) {
        Logger.warn(logTag, "Slot PerNode 无可用 Spine", slotLineNodeName(slot));
        onAllComplete?.(null);
    } else {
        Logger.info(logTag, "Slot PerNode ×", started, slotLineNodeName(slot));
        notifySpineCompleteIfLoop(slot.isLoop, onAllComplete);
    }
}

export function playSlotLineLayout(
    root: Node,
    slot: SpineMixSlotConfig,
    worldPos: Vec3,
    blockIndex: number,
    direction: number,
    logTag: string,
    resolveAnim: (slot: SpineMixSlotConfig, blockIndex: number, direction: number) => string,
    onComplete?: (trackEntry: SpineTrackEntryLike) => void,
): sp.Skeleton | null {
    prepareSlotLineSpine(root, slot);
    const sk = resolveSlotLineSpine(root, slot, logTag);
    if (!sk?.node) return null;

    sk.node.active = true;
    sk.node.setRotationFromEuler(0, 0, 0);
    applySlotSpineScale(sk, slot);
    setSpineNodeAtWorld(root, sk, worldPos);
    applySkeletonData(sk, slot.skeletonData);
    const anim = resolveAnim(slot, blockIndex, direction);

    setupSpineAnimComplete(sk, anim, slot.isLoop, onComplete);
    playSpineAnimation(sk, anim, 0, slot.isLoop);
    notifySpineCompleteIfLoop(slot.isLoop, onComplete);
    Logger.info(logTag, "Slot LineLayout", anim, "scale", resolveSlotSpineScale(slot), "@", slotLineNodeName(slot));
    return sk;
}

/** nodeName 不同：A/B 各用各节点，同时播 */
function playDualSpineParallel(
    root: Node,
    slotA: SpineMixSlotConfig,
    slotB: SpineMixSlotConfig,
    direction: number,
    worldPos: Vec3,
    blockIndex: number,
    lineCells: SpineLineCell[] | undefined,
    logTag: string,
    resolveAnim: (slot: SpineMixSlotConfig, blockIndex: number, direction: number) => string,
    onAllComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    const aPer = slotIsPerNode(slotA);
    const bPer = slotIsPerNode(slotB);
    const cells = lineCells?.length ? lineCells : undefined;

    Logger.info(
        logTag,
        "Dual 并行",
        slotLineNodeName(slotA),
        slotLineNodeName(slotB),
        "A",
        aPer ? "PerNode" : "Line",
        "B",
        bPer ? "PerNode" : "Line",
    );

    const gate = createParallelCompleteGate(2, onAllComplete);

    const playA = (): void => {
        if (aPer && cells) {
            playSlotPerNodes(root, slotA, direction, cells, logTag, resolveAnim, gate);
        } else {
            playSlotLineLayout(root, slotA, worldPos, blockIndex, direction, logTag, resolveAnim, gate);
        }
    };

    const playB = (): void => {
        if (bPer && cells) {
            playSlotPerNodes(root, slotB, direction, cells, logTag, resolveAnim, gate);
        } else {
            playSlotLineLayout(root, slotB, worldPos, blockIndex, direction, logTag, resolveAnim, gate);
        }
    };

    playA();
    playB();
}

/** nodeName 相同：共用节点，串行 A→B 或分阶段 PerNode */
function playDualSpineSharedNode(
    root: Node,
    slotA: SpineMixSlotConfig,
    slotB: SpineMixSlotConfig,
    direction: number,
    worldPos: Vec3,
    blockIndex: number,
    cells: SpineLineCell[] | undefined,
    logTag: string,
    resolveAnim: (slot: SpineMixSlotConfig, blockIndex: number, direction: number) => string,
    onAllComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    const aPer = slotIsPerNode(slotA);
    const bPer = slotIsPerNode(slotB);
    const lineCells = cells?.length ? cells : undefined;

    if (aPer && bPer && lineCells) {
        prepareSlotPerNodeSpines(root, slotA);
        let done = 0;
        let lastTrack: SpineTrackEntryLike = null;
        let started = 0;
        lineCells.forEach((cell, lineIndex) => {
            const sk = resolveSlotPerNodeSpine(root, slotA, lineIndex, logTag);
            if (!sk?.node) return;
            started++;
            sk.node.active = true;
            sk.node.setRotationFromEuler(0, 0, 0);
            applySlotSpineScale(sk, slotA);
            setSpineNodeAtWorld(root, sk, cell.worldPos);
            const animA = resolveAnim(slotA, cell.blockIndex, direction);
            const animB = resolveAnim(slotB, cell.blockIndex, direction);
            playDualSpineSequential(sk, slotA, slotB, animA, animB, logTag, (trackEntry) => {
                lastTrack = trackEntry;
                done++;
                if (done >= started) onAllComplete?.(lastTrack);
            });
        });
        if (started === 0) onAllComplete?.(null);
        return;
    }

    if (!aPer && !bPer) {
        const sk = resolveSlotLineSpine(root, slotA, logTag);
        if (!sk?.node) return;
        prepareSlotLineSpine(root, slotA);
        sk.node.active = true;
        sk.node.setRotationFromEuler(0, 0, 0);
        applySlotSpineScale(sk, slotA);
        setSpineNodeAtWorld(root, sk, worldPos);
        const animA = resolveAnim(slotA, blockIndex, direction);
        const animB = resolveAnim(slotB, blockIndex, direction);
        playDualSpineSequential(sk, slotA, slotB, animA, animB, logTag, onAllComplete);
        return;
    }

    if (aPer && !bPer && lineCells) {
        runPerNodeThenNextPhase(root, slotA, direction, lineCells, logTag, resolveAnim, () => {
            playSlotLineLayout(root, slotB, worldPos, blockIndex, direction, logTag, resolveAnim, onAllComplete);
        });
        return;
    }

    if (!aPer && bPer && lineCells) {
        playSlotLineLayout(root, slotA, worldPos, blockIndex, direction, logTag, resolveAnim, () => {
            runPerNodeThenNextPhase(root, slotB, direction, lineCells, logTag, resolveAnim, onAllComplete);
        });
        return;
    }

    const sk = resolveSlotLineSpine(root, slotA, logTag);
    if (sk) {
        setSpineNodeAtWorld(root, sk, worldPos);
        playDualSpineSequential(
            sk,
            slotA,
            slotB,
            resolveAnim(slotA, blockIndex, direction),
            resolveAnim(slotB, blockIndex, direction),
            logTag,
            onAllComplete,
        );
    }
}

export function playDualSpineMixed(
    root: Node,
    slotA: SpineMixSlotConfig,
    slotB: SpineMixSlotConfig,
    direction: number,
    worldPos: Vec3,
    blockIndex: number,
    cells: SpineLineCell[] | undefined,
    logTag: string,
    resolveAnim: (slot: SpineMixSlotConfig, blockIndex: number, direction: number) => string,
    onAllComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    if (!slotsUseSameSpineNode(slotA, slotB)) {
        playDualSpineParallel(
            root,
            slotA,
            slotB,
            direction,
            worldPos,
            blockIndex,
            cells,
            logTag,
            resolveAnim,
            onAllComplete,
        );
        return;
    }
    playDualSpineSharedNode(
        root,
        slotA,
        slotB,
        direction,
        worldPos,
        blockIndex,
        cells,
        logTag,
        resolveAnim,
        onAllComplete,
    );
}

export function playSingleSpinePerNodes(
    root: Node,
    slot: SpineMixSlotConfig,
    direction: number,
    cells: SpineLineCell[],
    logTag: string,
    resolveAnim: (blockIndex: number, direction: number) => string,
    onEachComplete?: (worldPos: Vec3, animName: string, trackEntry: SpineTrackEntryLike) => void,
    onAllComplete?: () => void,
): void {
    if (!cells.length) return;

    prepareSlotPerNodeSpines(root, slot);

    let done = 0;
    const total = cells.length;

    cells.forEach((cell, lineIndex) => {
        const sk = resolveSlotPerNodeSpine(root, slot, lineIndex, logTag);
        if (!sk?.node) return;

        sk.node.active = true;
        sk.node.setRotationFromEuler(0, 0, 0);
        applySlotSpineScale(sk, slot);
        setSpineNodeAtWorld(root, sk, cell.worldPos);
        applySkeletonData(sk, slot.skeletonData);
        const animName = resolveAnim(cell.blockIndex, direction);

        setupSpineAnimComplete(sk, animName, slot.isLoop, (trackEntry) => {
            onEachComplete?.(cell.worldPos, animName, trackEntry);
            done++;
            if (done >= total) onAllComplete?.();
        });
        playSpineAnimation(sk, animName, 0, slot.isLoop);
    });

    Logger.info(logTag, "Single PerNode ×", total, slotLineNodeName(slot));
    notifySpineCompleteIfLoop(slot.isLoop, onAllComplete ? () => onAllComplete() : undefined);
}

export function playDualSpineSequential(
    sk: sp.Skeleton,
    slotA: SpineMixSlotConfig,
    slotB: SpineMixSlotConfig,
    animA: string,
    animB: string,
    logTag: string,
    onPhaseBComplete?: (trackEntry: SpineTrackEntryLike) => void,
): void {
    const dataA = slotA.skeletonData;
    const dataB = slotB.skeletonData;
    const switchSkeletonAfterA = !!(dataA && dataB && dataA !== dataB);

    const playPhaseB = (): void => {
        applySlotSpineScale(sk, slotB);
        if (switchSkeletonAfterA) {
            applySkeletonData(sk, dataB);
        }
        setupSpineAnimComplete(sk, animB, slotB.isLoop, onPhaseBComplete);
        playSpineAnimation(sk, animB, 0, slotB.isLoop);
        notifySpineCompleteIfLoop(slotB.isLoop, onPhaseBComplete);
    };

    applySlotSpineScale(sk, slotA);
    applySkeletonData(sk, dataA ?? dataB);
    if (slotA.isLoop) {
        playSpineAnimation(sk, animA, 0, true);
        Logger.info(logTag, "Dual 串行 A 循环", animA, "scaleA", resolveSlotSpineScale(slotA));
        return;
    }

    sk.setCompleteListener((trackEntry) => {
        const finishedName = trackEntry?.animation?.name ?? "";
        if (finishedName !== animA) return;
        playPhaseB();
    });
    playSpineAnimation(sk, animA, 0, false);
    Logger.info(
        logTag,
        "Dual 串行 A→B",
        animA,
        animB,
        "scaleA",
        resolveSlotSpineScale(slotA),
        "scaleB",
        resolveSlotSpineScale(slotB),
    );
}

export function findSpineMixCompOnNode<T>(
    node: Node | null | undefined,
    BaseClass: abstract new (...args: never[]) => T,
): T | null {
    let cur: Node | null | undefined = node;
    while (cur?.isValid) {
        for (const comp of cur.components) {
            if (comp instanceof BaseClass) {
                return comp as T;
            }
        }
        cur = cur.parent;
    }
    return null;
}
