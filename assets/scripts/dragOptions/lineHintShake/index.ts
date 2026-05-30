import { Node } from "cc";
import { startLineHintWaveShake } from "./LineHintShakeWave";
import { startLineHintSyncRotationShake } from "./LineHintShakeSyncRotate";
import { startLineHintSoccerShake } from "./LineHintShakeSoccer";
import { LineHintShakeStyle } from "./LineHintShakeStyle";

export { startLineHintWaveShake } from "./LineHintShakeWave";
export { startLineHintSyncRotationShake } from "./LineHintShakeSyncRotate";
export { startLineHintSoccerShake } from "./LineHintShakeSoccer";
export { LineHintShakeStyle } from "./LineHintShakeStyle";

/**
 * 按配置在波浪缩放、同步旋转、Soccer 蓄能转圈三种提示动效中选一种（不会同时跑多套逻辑）
 */
export function applyLineHintShake(node: Node, lineIndex: number, style: LineHintShakeStyle): void {
    if (style === LineHintShakeStyle.Soccer) {
        startLineHintSoccerShake(node, lineIndex);
    } else if (style === LineHintShakeStyle.SyncRotation) {
        startLineHintSyncRotationShake(node, lineIndex);
    } else {
        startLineHintWaveShake(node, lineIndex);
    }
}
