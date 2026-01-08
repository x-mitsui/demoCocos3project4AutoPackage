import { _decorator, CCInteger, CCFloat } from "cc";
const { ccclass, property } = _decorator;

@ccclass("DragOptionConfig")
export class DragOptionConfig {
    /** 所有块的颜色（暂时只支持统一颜色） */
    @property
    blockColorIdx: number = 0;
    /** 布局:二维数组,相对于中心点的偏移 [-1,0] 表示左方一个单位 */
    @property({ type: [[CCInteger]] })
    shape: [number, number][] = [];
    /** 拖动时防遮挡的安全距离(这里方便独立设置，也可以不设置，走统一) */
    @property({ type: CCFloat })
    safeDistance: number = 0;
    /** 方便手感的区域(这里方便独立设置，也可以不设置，走统一) */
    @property({ type: CCFloat })
    fingerAreaDistance: number = 0;
}
