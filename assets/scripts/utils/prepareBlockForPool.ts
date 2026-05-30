import { Node, sp, Sprite, Tween } from "cc";
import { ShaderBlock } from "../dragOptions/block/ShaderBlock";
import { GameManager } from "../managers/GameManager";
import { getPreClearSpineMixComp } from "../misc/preClear/PreClearSpineMix/PreClearSpineMixBase";
import { disableSpinePremultipliedAlpha } from "./spineCompat";

function isSpinePrefixedChildName(name: string): boolean {
    return name.startsWith("PreClear");
}

function resetSkeleton(sk: sp.Skeleton | null): void {
    disableSpinePremultipliedAlpha(sk);
    if (!sk) return;
    sk.clearTracks();
    (sk as unknown as { setToSetupPose?: () => void }).setToSetupPose?.();
}

/** 销毁运行时挂上的节点（含 Mix 动态创建的 Spine / Spine0~7 / SpineB 等） */
function disposeRuntimePoolChild(child: Node): void {
    Tween.stopAllByTarget(child);
    resetSkeleton(child.getComponent(sp.Skeleton));
    child.removeFromParent();
    if (child.isValid) child.destroy();
}

/** 移除 parent 下名称以 Spine 开头的子节点（不销毁 parent 自身） */
function removeSpinePrefixChildren(parent: Node): void {
    for (let i = parent.children.length - 1; i >= 0; i--) {
        const child = parent.children[i];
        if (!isSpinePrefixedChildName(child.name)) continue;
        disposeRuntimePoolChild(child);
    }
}

/** Block 节点回收入池前统一重置子节点状态，避免 Photo / Gem / 动态 PreClear / Spine 残留 */
export function prepareBlockForPool(block: Node | null | undefined): void {
    if (!block?.isValid) return;

    const photoNode = block.getChildByName("Photo");
    if (photoNode) {
        photoNode.active = false;
        if (GameManager.instance?.enablePhotoMode) {
            const photoSprite = photoNode.getComponent(Sprite);
            if (photoSprite) photoSprite.spriteFrame = null;
            block.getComponent(ShaderBlock)?.clearPhotoEdges();
        }
    }

    const gemNode = block.getChildByName("Gem");
    if (gemNode) gemNode.active = false;

    removeSpinePrefixChildren(block);

    for (let i = block.children.length - 1; i >= 0; i--) {
        const child = block.children[i];
        const name = child.name;
        if (name === "Photo" || name === "Gem") continue;

        if (getPreClearSpineMixComp(child)) {
            disposeRuntimePoolChild(child);
            continue;
        }

        if (name === "PreClear") {
            removeSpinePrefixChildren(child);
            child.active = false;
            resetSkeleton(child.getComponent(sp.Skeleton));
            continue;
        }

        disposeRuntimePoolChild(child);
    }
}
