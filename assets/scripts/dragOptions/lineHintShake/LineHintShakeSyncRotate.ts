import { Node, tween, Tween } from "cc";
import { Logger } from "../../utils/logger";

/**
 * 行列提示：该行/列上每个提示块同相位、小幅度旋转往复循环（不依赖 lineIndex 错相）
 * @param _lineIndex 与 handleLineHints 的 pos 对齐保留，便于调用方统一传参
 */
export function startLineHintSyncRotationShake(node: Node, _lineIndex: number): void {
    Tween.stopAllByTarget(node);
    node.setScale(1, 1, 1);
    const amp = 3.5;
    Logger.info("startLineHintSyncRotationShake", amp);
    tween(node)
        .repeatForever(
            tween()
                .to(0.06, { angle: amp }, { easing: "sineOut" })
                .to(0.12, { angle: -amp }, { easing: "sineInOut" })
                .to(0.06, { angle: 0 }, { easing: "sineIn" }),
        )
        .start();
}
