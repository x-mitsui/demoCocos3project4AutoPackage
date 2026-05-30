import { _decorator, CCInteger } from "cc";
const { ccclass, property } = _decorator;

@ccclass("DragOptionConfig")
export class DragOptionConfig {
    /** 所有块的颜色（暂时只支持统一颜色） */
    @property
    blockColorIdx: number = 0;
    /** 布局:二维数组,相对于中心点的偏移 [-1,0] 表示左方一个单位 */
    @property({ type: [[CCInteger]] })
    shapes: [number, number][][] = [];
}
