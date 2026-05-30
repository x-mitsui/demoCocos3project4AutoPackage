import { Node, tween, Tween, Vec3 } from "cc";

/**
 * 行列提示：沿该行/列先 0→7 再 7→0 依次放大缩小并循环（波浪相位由 lineIndex 决定）
 */
export function startLineHintWaveShake(node: Node, lineIndex: number): void {
    Tween.stopAllByTarget(node);
    node.angle = 0;
    const base = node.scale.clone();
    const k = 1.08;
    const enlarged = new Vec3(base.x * k, base.y * k, base.z);
    const i = Math.max(0, Math.min(7, lineIndex | 0));
    const pulseDur = 0.09;
    const half = pulseDur * 0.5;
    const gapBetweenFwdAndBack = (14 - 2 * i) * pulseDur;
    const tailToNextCycle = i * pulseDur;
    const easeUp = { easing: "quartOut" as const };
    const easeDown = { easing: "quartIn" as const };
    tween(node)
        .repeatForever(
            tween()
                .delay(i * pulseDur)
                .to(half, { scale: enlarged }, easeUp)
                .to(half, { scale: base }, easeDown)
                .delay(gapBetweenFwdAndBack)
                .to(half, { scale: enlarged }, easeUp)
                .to(half, { scale: base }, easeDown)
                .delay(tailToNextCycle),
        )
        .start();
}
