import { instantiate, Node, tween, UITransform, v3, Vec3 } from "cc";
import { GameCustomInfo } from "../configs/config";
import { DragOption } from "../dragOptions/DragOption";
import { LineHintShakeStyle } from "../dragOptions/lineHintShake/LineHintShakeStyle";
import { AudioManager } from "../managers/AudioManager";
import { GameManager } from "../managers/GameManager";
import { eventManager, GameEvent } from "../managers/EventManager";

/**
 * 仅当 GameManager.lineHintShakeStyle === Soccer 时使用：
 * 行/列消除克隆块大脚踢飞（可出屏、少量弧线、少量飞行中缩放脉动）。
 */
export function shouldUseSoccerLineEliminateFly(dragOptionNode: Node): boolean {
    if (GameCustomInfo.name === "BlockBrush") return false;
    const drag = dragOptionNode.getComponent(DragOption);
    if (!drag) return false;
    if (drag.isDifferentColorDragOption || GameManager.instance.EliminateAniColorfulPrefab) return false;
    return GameManager.instance.lineHintShakeStyle === LineHintShakeStyle.Soccer;
}

/** 沿射线把落点推到棋盘 UITransform 包盒外，保证「踢出屏幕」感，并尽量拉到足够远的飞行距离。 */
function extrapolateOffBoard(p0: Vec3, rawDest: Vec3, boardParent: Node, margin: number, minTravel = 3000): Vec3 {
    const dir = new Vec3(rawDest.x - p0.x, rawDest.y - p0.y, 0);
    const len0 = dir.length();
    if (len0 < 4) {
        dir.set(1, 0.6, 0);
        dir.normalize();
    } else {
        dir.multiplyScalar(1 / len0);
    }
    const ui = boardParent.getComponent(UITransform);
    const halfW = (ui?.width ?? 900) * 0.5 + margin;
    const halfH = (ui?.height ?? 1100) * 0.5 + margin;
    let lo = Math.max(len0 * 1.05, 80);
    let hi = Math.max(minTravel * 1.2, 4200);
    for (let i = 0; i < 28; i++) {
        const t = (lo + hi) * 0.5;
        const x = p0.x + dir.x * t;
        const y = p0.y + dir.y * t;
        const out = Math.abs(x) > halfW || Math.abs(y) > halfH;
        if (out) hi = t;
        else lo = t;
    }
    const t = Math.max(hi * 1.06, len0 * 1.85, minTravel);
    return v3(p0.x + dir.x * t, p0.y + dir.y * t, p0.z);
}

/** @param boardParent 棋盘节点，克隆挂其下；取其 UITransform 算飞出边界 */
export function playSoccerLineEliminateFly(
    boardParent: Node,
    blockNodes: (Node | null)[][],
    row: number,
    col: number,
    claim: Set<string> | null,
): void {
    const stagger = 0.03;
    const clones: Node[] = [];
    const kickCount = 3;
    const minTravel = 3000;
    /** 被消除行/列上砖块世界坐标之和，用于老鼠「吃奶酪」粒子起点 */
    const cheeseWorldSum = v3(0, 0, 0);
    let cheeseWorldCount = 0;

    const tryPushClone = (r: number, c: number) => {
        const key = `${r},${c}`;
        if (claim?.has(key)) return;
        const src = blockNodes[r][c];
        if (!src) return;
        const wp = src.worldPosition;
        cheeseWorldSum.x += wp.x;
        cheeseWorldSum.y += wp.y;
        cheeseWorldSum.z += wp.z;
        cheeseWorldCount++;
        claim?.add(key);
        const dup = instantiate(src);
        dup.parent = boardParent;
        dup.setWorldPosition(src.worldPosition);
        dup.setWorldRotation(src.worldRotation);
        dup.setWorldScale(src.worldScale);
        const gem = dup.getChildByName("Gem");
        if (gem) gem.active = false;
        dup.setSiblingIndex(boardParent.children.length - 1);
        clones.push(dup);
    };

    if (row >= 0) {
        for (let c = 0; c < 8; c++) tryPushClone(row, c);
    } else {
        for (let r = 0; r < 8; r++) tryPushClone(r, col);
    }

    const finishEliminate = () => {
        const cheeseWorld =
            cheeseWorldCount > 0
                ? v3(cheeseWorldSum.x / cheeseWorldCount, cheeseWorldSum.y / cheeseWorldCount, cheeseWorldSum.z / cheeseWorldCount)
                : undefined;
        eventManager.emit(GameEvent.GAME_ELIMINATE, cheeseWorld);
    };

    if (clones.length === 0) {
        finishEliminate();
        return;
    }

    const cheeseWorldStart =
        cheeseWorldCount > 0
            ? v3(cheeseWorldSum.x / cheeseWorldCount, cheeseWorldSum.y / cheeseWorldCount, cheeseWorldSum.z / cheeseWorldCount)
            : undefined;
    eventManager.emit(GameEvent.GAME_ELIMINATE_START, cheeseWorldStart);

    let remaining = clones.length;
    const onOneDone = () => {
        remaining--;
        if (remaining <= 0) {
            finishEliminate();
        }
    };

    const kickedIndices = new Set<number>();
    const targetKickCount = Math.min(kickCount, clones.length);
    while (kickedIndices.size < targetKickCount) {
        kickedIndices.add(Math.floor(Math.random() * clones.length));
    }

    for (let i = 0; i < clones.length; i++) {
        const dup = clones[i];
        const p0 = dup.position.clone();
        const s0 = dup.scale.clone();
        const flyDur = 0.68 + Math.random() * 0.26;
        const blast = 1800 + Math.random() * 900;
        const ang = Math.random() * Math.PI * 2;
        const upBias = 220 + Math.random() * 260;
        const rawDest = v3(
            p0.x + Math.cos(ang) * blast + (Math.random() - 0.5) * 280,
            p0.y + Math.sin(ang) * blast * 0.65 + upBias + (Math.random() - 0.5) * 280,
            p0.z,
        );
        const dest = extrapolateOffBoard(p0, rawDest, boardParent, 260, minTravel);

        const spin = (Math.random() > 0.5 ? 1 : -1) * (680 + Math.random() * 960);
        const sEnd = 0.12 + Math.random() * 0.08;
        const kickPop = 1.14 + Math.random() * 0.08;

        const useArc = true;
        const usePulse = Math.random() < 0.24;
        const pulseCycles = Math.random() < 0.5 ? 1 : 2;
        const shouldPlayKick = kickedIndices.has(i);

        const posTween = (() => {
            if (!useArc) {
                return tween(dup).to(flyDur, { position: dest }, { easing: "quadOut" });
            }
            const mid = new Vec3((p0.x + dest.x) * 0.5, (p0.y + dest.y) * 0.5, p0.z);
            const dx = dest.x - p0.x;
            const dy = dest.y - p0.y;
            const nx = -(dy + 1e-5);
            const ny = dx + 1e-5;
            const nlen = Math.hypot(nx, ny);
            const bulge = (220 + Math.random() * 360) * (Math.random() < 0.5 ? -1 : 1);
            mid.x += (nx / nlen) * bulge;
            mid.y += (ny / nlen) * bulge;
            mid.y += 120 + Math.random() * 180;
            const t1 = flyDur * (0.44 + Math.random() * 0.06);
            const t2 = flyDur - t1;
            return tween(dup)
                .to(t1, { position: mid }, { easing: "sineOut" })
                .to(t2, { position: dest }, { easing: "quadIn" });
        })();

        const scaleTween = (() => {
            const base = s0.x * kickPop;
            const chain = tween(dup).to(flyDur * 0.16, { scale: v3(base, base, s0.z) }, { easing: "quadOut" });
            if (!usePulse) {
                return chain.to(flyDur * 0.84, { scale: v3(sEnd, sEnd, s0.z) }, { easing: "quartIn" });
            }
            const big = base * (1.08 + Math.random() * 0.12);
            const small = base * (0.8 + Math.random() * 0.1);
            const parts = pulseCycles === 1 ? 2 : 4;
            const seg = (flyDur * 0.52) / parts;
            for (let k = 0; k < parts; k++) {
                const up = k % 2 === 0;
                chain.to(seg, { scale: v3(up ? big : small, up ? big : small, s0.z) }, { easing: "sineInOut" });
            }
            const tail = Math.max(0.08, flyDur - flyDur * 0.16 - seg * parts);
            return chain.to(tail, { scale: v3(sEnd, sEnd, s0.z) }, { easing: "quartIn" });
        })();

        tween(dup)
            .delay(i * stagger)
            .call(() => {
                if (shouldPlayKick) {
                    AudioManager.instance.playKickEffect();
                }
            })
            .parallel(posTween, tween(dup).to(flyDur, { angle: dup.angle + spin }, { easing: "linear" }), scaleTween)
            .call(() => {
                dup.destroy();
                onOneDone();
            })
            .start();
    }
}
