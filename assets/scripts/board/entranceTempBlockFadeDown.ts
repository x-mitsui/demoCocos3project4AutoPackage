import { find, Node, Tween, tween, UIOpacity, Vec3 } from "cc";
import { BlockSize } from "../configs/config";
import { ScreenShake } from "../misc/ScreenShake";

const GRID_SIZE = 8;

/** 由 Board 等组件实现，用于调度与回收入场临时块 */
export interface EntranceTempBlockFadeHost {
    scheduleOnce(callback: () => void, delay: number): void;
    recycleEntranceTempBlock(block: Node): void;
}

export function shakeEntranceCamera(intensity = 9, repeatTimes = 2) {
    const mainCamera = find("Canvas/Camera");
    mainCamera?.getComponent(ScreenShake)?.shake(intensity, repeatTimes);
}

/** 竖直位移进度：带初速度的下落，避免 t² 开头过慢显得飘 */
const FALL_GRAVITY_KICK = 0.05;

function fallDisplacementProgress(t: number): number {
    return (1 - FALL_GRAVITY_KICK) * t * t + FALL_GRAVITY_KICK * t;
}

/** 随机向左下或右下的坠落参数 */
function pickRandomDiagonalFall() {
    const goLeft = Math.random() < 0.5;
    const horizontal = BlockSize.width * (0.9 + Math.random() * 1.8);
    const vertical = BlockSize.height * (5.5 + Math.random() * 2.5);
    return {
        dx: goLeft ? -horizontal : horizontal,
        dy: -vertical,
        duration: 0.2 + Math.random() * 0.12,
        angleDelta: goLeft ? -(14 + Math.random() * 22) : 14 + Math.random() * 22,
    };
}

/** 水平线性外甩 + 竖直带初速加速下落，旋转随下落加剧 */
function tweenGravityDiagonalFall(
    node: Node,
    dx: number,
    dy: number,
    duration: number,
    angleDelta: number,
    onComplete: () => void,
) {
    const startPos = node.position.clone();
    const startAngle = node.angle;
    const progress = { t: 0 };

    tween(progress)
        .to(
            duration,
            { t: 1 },
            {
                easing: "linear",
                onUpdate: () => {
                    const t = progress.t;
                    const fallP = fallDisplacementProgress(t);
                    node.setPosition(startPos.x + dx * t, startPos.y + dy * fallP, startPos.z);
                    node.angle = startAngle + angleDelta * fallP;
                },
            },
        )
        .call(onComplete)
        .start();
}

export function resetEntranceTempBlockTransform(node: Node) {
    Tween.stopAllByTarget(node);
    const uiOpacity = node.getComponent(UIOpacity);
    if (uiOpacity) Tween.stopAllByTarget(uiOpacity);
    node.angle = 0;
    node.setScale(Vec3.ONE);
}

/**
 * 从上到下淡出（保留备用）
 */
export function fadeDownAnimationFadeOut(
    host: EntranceTempBlockFadeHost,
    tempAnimBlocks: Node[][],
    onComplete?: () => void,
) {
    const fadeOutDuration = 0.08;
    const recycle = host.recycleEntranceTempBlock.bind(host);

    for (let row = 0; row < GRID_SIZE; row++) {
        host.scheduleOnce(() => {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tempBlock = tempAnimBlocks[row][col];
                if (!tempBlock) continue;
                const uiOpacity = tempBlock.getComponent(UIOpacity);
                if (!uiOpacity) continue;
                tween(uiOpacity)
                    .to(0.15, { opacity: 0 })
                    .call(() => recycle(tempBlock))
                    .start();
            }
        }, row * fadeOutDuration);
    }

    host.scheduleOnce(() => onComplete?.(), GRID_SIZE * fadeOutDuration);
}

/**
 * 入场临时层收起：空隙块随机向左下/右下坠落，并震屏
 */
export function fadeDownAnimation(host: EntranceTempBlockFadeHost, tempAnimBlocks: Node[][], onComplete?: () => void) {
    const recycle = host.recycleEntranceTempBlock.bind(host);

    shakeEntranceCamera();

    let maxEndTime = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const tempBlock = tempAnimBlocks[row][col];
            if (!tempBlock) continue;

            const { dx, dy, duration, angleDelta } = pickRandomDiagonalFall();
            maxEndTime = Math.max(maxEndTime, duration);

            tweenGravityDiagonalFall(tempBlock, dx, dy, duration, angleDelta, () => recycle(tempBlock));

            const uiOpacity = tempBlock.getComponent(UIOpacity);
            if (uiOpacity) {
                tween(uiOpacity)
                    .delay(duration * 0.55)
                    .to(duration * 0.45, { opacity: 0 })
                    .start();
            }
        }
    }

    host.scheduleOnce(() => onComplete?.(), maxEndTime + 0.05);
}
