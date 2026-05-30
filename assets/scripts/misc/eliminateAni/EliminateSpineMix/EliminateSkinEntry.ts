import { _decorator } from "cc";
import { SpineMixColorAnimPair, SpineMixSkinEntry } from "../../spineMix/SpineMixSkinEntry";

const { ccclass, property } = _decorator;

/** 消除专用 colorAnims 元素类型（编辑器可正确展开数组子项） */
@ccclass("EliminateColorAnimPair")
export class EliminateColorAnimPair extends SpineMixColorAnimPair {}

/**
 * 消除 skinEntries 元素类型。
 * 单独声明 colorAnims，避免嵌套在 skinEntries 内时继承父类带 visible() 的数组属性导致 Inspector 无法展开。
 */
@ccclass("EliminateSkinEntry")
export class EliminateSkinEntry extends SpineMixSkinEntry {
    @property({
        type: [EliminateColorAnimPair],
        tooltip: "blockIndex 1~8 对应下标 0~7；横/竖消除动画名（仅 SingleSpine）",
    })
    override colorAnims: EliminateColorAnimPair[] = [];
}
