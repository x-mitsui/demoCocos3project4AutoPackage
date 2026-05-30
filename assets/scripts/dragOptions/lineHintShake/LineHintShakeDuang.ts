import { Node, tween, Tween, Vec3 } from "cc";

/**
 * 行列提示：心跳感——先瘦高、再矮胖、回正常；轻第二拍后再停顿（相位由 lineIndex 错开）
 * 第二个参数全为0，则一起动
 */
export function startLineHintDuang(node: Node, lineIndex: number): void {
    Tween.stopAllByTarget(node);
    node.angle = 0;
    const base = node.scale.clone();

    const slimTall = new Vec3(base.x * 0.93, base.y * 1.07, base.z);
    const shortFat = new Vec3(base.x * 1.07, base.y * 0.93, base.z);
    const dubSlimTall = new Vec3(base.x * 0.96, base.y * 1.04, base.z);
    const dubShortFat = new Vec3(base.x * 1.04, base.y * 0.96, base.z);

    const i = Math.max(0, Math.min(7, lineIndex | 0));
    const beat = 0.11;
    const recover = 0.14;
    const dubBeat = beat * 0.85;
    const dubRecover = recover * 0.85;
    const gapLubDub = 0.08;
    const cycleDur = 0.88;
    const rest = Math.max(0.12, cycleDur - (beat * 4 + dubBeat * 2 + recover + dubRecover + gapLubDub));
    const stagger = (cycleDur / 8) * i;

    const snap = { easing: "quartOut" as const };
    const squash = { easing: "sineInOut" as const };
    const relax = { easing: "sineOut" as const };

    tween(node)
        .repeatForever(
            tween()
                .delay(stagger)
                // 第一拍：瘦高 → 矮胖 → 正常
                .to(beat, { scale: slimTall }, snap)
                .to(beat, { scale: shortFat }, squash)
                .to(recover, { scale: base }, relax)
                // 第二拍（略弱）
                .delay(gapLubDub)
                .to(dubBeat, { scale: dubSlimTall }, snap)
                .to(dubBeat, { scale: dubShortFat }, squash)
                .to(dubRecover, { scale: base }, relax)
                // 舒张停顿
                .delay(rest),
        )
        .start();
}
