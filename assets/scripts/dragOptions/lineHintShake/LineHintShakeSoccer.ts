import { Node, Tween, tween } from "cc";

/**
 * Soccer 行列提示：角速度持续上升（恒定角加速度），视觉上「一直加速转」；
 * 缩放随转速渐增并渐近饱和，避免无限变大；沿 lineIndex 0~7 错相启动。
 * 仅用 node 作为 tween 目标，便于与 clearHints / stopAllByTarget 一致回收。
 */
export function startLineHintSoccerShake(node: Node, lineIndex: number): void {
    Tween.stopAllByTarget(node);
    const base = node.scale.clone();
    node.angle = 0;

    const i = Math.max(0, Math.min(7, lineIndex | 0));
    const phase = i * 0.036;
    /** 角加速度（deg/s²），越大越快进入高速 */
    const alpha = 520;
    /** 初角速度（deg/s） */
    const omega0 = 42;
    /** 用 ω 归一化缩放的参考转速，仅影响「胀到多满」，不限制真实角速度 */
    const omegaRef = 720;
    /** 最大视觉缩放系数 */
    const scaleKMax = 1.075;
    const tick = 1 / 60;

    let last = 0;
    let omega = omega0;
    let theta = 0;

    tween(node)
        .delay(phase)
        .repeatForever(tween().call(() => {
            const now = performance.now();
            const dt = last === 0 ? tick : Math.min((now - last) / 1000, 0.08);
            last = now;

            omega += alpha * dt;
            theta += omega * dt;
            if (theta >= 360 || theta <= -360) {
                theta %= 360;
            }
            node.angle = theta;

            const t = Math.min(omega / omegaRef, 1);
            const k = 1 + (scaleKMax - 1) * (t * t);
            node.setScale(base.x * k, base.y * k, base.z);
        }).delay(tick))
        .start();
}
