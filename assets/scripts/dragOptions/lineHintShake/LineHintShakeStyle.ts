/** 行列提示动效样式（需 GameManager.enableLineHintShake 为 true） */
export enum LineHintShakeStyle {
    None = 0,
    /** 沿格 0→7→0 波浪缩放 */
    Wave = 1,
    /** 同行/列提示块同相位小角度旋转循环 */
    SyncRotation = 2,
    /** Soccer效果 */
    Soccer = 3,
}
