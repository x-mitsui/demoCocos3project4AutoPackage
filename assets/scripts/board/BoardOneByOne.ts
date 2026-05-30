import { _decorator, find, Label, Node, Prefab, Size, sys } from "cc";
import { DragOptionsContainer } from "../dragOptions/DragOptionsContainer";
import { GameManager } from "../managers/GameManager";
import { Logger } from "../utils/logger";
import { Board } from "./Board";
const { ccclass, property } = _decorator;

@ccclass("BoardOneByOne")
export class BoardOneByOne extends Board {
    /**
     * 砖块阵列的起始位置
     */
    @property(Node)
    originNode: Node = null;

    protected _blockPrefab: Prefab = null;

    // @property({ type: JsonAsset, tooltip: "游戏的谜题配置" })
    puzzleConfig: number[][] = null;

    @property({ type: Node, tooltip: "拖动选项容器" })
    dragOptionsContainer: Node = null;

    // /** 当前的砖块阵列 */
    // curBlocks: number[][] = [];
    /** 存储砖块节点 */
    blockNodes: (Node | null)[][] = [];
    // @property({ type: Label, tooltip: "分数标签" })
    // scoreLabel: Label = null;
    @property({ type: Label, tooltip: "最佳分数标签" })
    bestScoreLabel: Label = null;
    borderNode: Node = null;
    boardNode: Node = null;
    lineNode: Node = null;
    encourageContentSize: Size = new Size(0, 0);

    protected displayScore: number = 0;

    protected onLoad(): void {
        Logger.info("Board:onLoad");
        this.boardNode = find("Canvas/BG/Board");
        this.borderNode = find("Canvas/BG/Board/Border");
        this.lineNode = find("Canvas/BG/Board/Line");
        this._blockPrefab = GameManager.instance.blockPrefab;
        if (!this._blockPrefab) {
            throw new Error("Board:blockPrefab is not set");
        }
        this.changeBoardColor();
        this.initPuzzles();
        this.animationBeforeStart();
        this.dragOptionsContainer.getComponent(DragOptionsContainer).init(this.node);
        this.bestScoreLabel.string = sys.localStorage.getItem("bestScore") || "0";
    }

    start() {
        if (GameManager.instance) {
            this.displayScore = GameManager.instance.score;
        }
    }

    updateScore() {
        this.animateScore();
    }
}
