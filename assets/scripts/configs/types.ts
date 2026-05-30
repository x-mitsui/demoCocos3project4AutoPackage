export type DragOptionConfig = {
    /** 所有块的颜色（暂时只支持统一颜色） */
    blockColorIdx: number;
    /** 布局:二维数组,相对于中心点的偏移 [-1,0] 表示左方一个单位 */
    shape: [number, number][];
};
