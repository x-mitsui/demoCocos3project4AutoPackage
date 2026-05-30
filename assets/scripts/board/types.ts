import { Vec2, _decorator } from "cc";

const { ccclass, property } = _decorator;

/** 游戏的谜题配置 */
@ccclass("PuzzleConfig")
export class PuzzleConfig {
    /** 块大小 */
    @property({ tooltip: "块大小" })
    blockSize: Vec2 = new Vec2(115, 115);
}
