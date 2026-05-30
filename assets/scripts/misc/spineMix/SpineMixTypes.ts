/** 单 Spine / 双 Spine（A+B） */
export enum SpineMixPlayMode {
    SingleSpine = 0,
    DualSpine = 1,
}

/** 整行/列一体动画 vs 沿 lineIndex 每格独立 Spine */
export enum SpineMixLayoutMode {
    /** 根节点下一个 Spine，行列中心或整段动画 */
    LineLayout = 0,
    /** 每格 Spine0~Spine7（或由模板 Spine 克隆） */
    PerNode = 1,
}
