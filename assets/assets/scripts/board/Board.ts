import {
    _decorator,
    Animation,
    Component,
    dragonBones,
    instantiate,
    JsonAsset,
    Label,
    log,
    math,
    Node,
    Prefab,
    Quat,
    sys,
    UITransform,
    Vec2,
    Vec3,
} from "cc";
import { BlockSize, GameCustomInfo } from "../configs/config";
import { DragOptionsContainer } from "../dragOptions/DragOptionsContainer";
import { Block } from "../dragOptions/Block";
import { GameManager } from "../managers/GameManager";
import { AudioManager } from "../managers/AudioManager";
import { jump2DownloadPage } from "../utils/tool";
const { ccclass, property } = _decorator;

@ccclass("Board")
export class Board extends Component {
    /**
     * 砖块阵列的起始位置
     */
    @property(Node)
    originNode: Node = null;

    @property({ type: Prefab, tooltip: "砖块预制体" })
    blockPrefab: Prefab = null;

    @property({ type: JsonAsset, tooltip: "游戏的谜题配置" })
    puzzleConfig: JsonAsset = null;

    @property({ type: Node, tooltip: "拖动选项容器" })
    dragOptionsContainer: Node = null;

    // /** 当前的砖块阵列 */
    // curBlocks: number[][] = [];
    /** 存储砖块节点 */
    blockNodes: (Node | null)[][] = [];
    @property({ type: Label, tooltip: "分数标签" })
    scoreLabel: Label = null;
    @property({ type: Label, tooltip: "最佳分数标签" })
    bestScoreLabel: Label = null;

    private displayScore: number = 0;

    protected onLoad(): void {
        log("Board onLoad");
        this.initPuzzles();
        this.dragOptionsContainer
            .getComponent(DragOptionsContainer)
            .init(this.node);
        this.bestScoreLabel.string =
            sys.localStorage.getItem("bestScore") || "0";
    }

    start() {
        if (GameManager.instance) {
            this.displayScore = GameManager.instance.score;
            if (this.scoreLabel) {
                this.scoreLabel.string = this.displayScore.toString();
            }
        }
    }

    /**
 * 
[
[1,0,0,3,3,3,3,3],
[1,1,0,1,1,0,0,0],
[2,2,0,2,2,0,0,0],
[4,4,0,0,0,0,0,0],
[0,0,0,0,0,0,4,4],
[0,0,0,2,2,0,1,1],
[0,0,0,1,1,0,1,1],
[3,3,3,3,3,0,0,0]
]
 */
    initPuzzles() {
        if (!this.puzzleConfig) return;
        const blockSize = BlockSize;
        const config = this.puzzleConfig.json as number[][];
        log("config:", config);

        // // 初始化 blockNodes
        // for (let i = 0; i < 8; i++) {
        //     this.blockNodes[i] = [];
        //     for (let j = 0; j < 8; j++) {
        //         this.blockNodes[i][j] = null;
        //     }
        // }

        for (let i = 0; i < config.length; i++) {
            const row = config[i];
            this.blockNodes[i] = [];
            for (let j = 0; j < row.length; j++) {
                const blockColorIdx = row[j];
                if (blockColorIdx === 0) {
                    this.blockNodes[i][j] = null;
                    continue;
                }
                const blockNode = instantiate(this.blockPrefab);
                blockNode.parent = this.node;

                blockNode.getComponent(Block).init(blockColorIdx);

                const posX = this.originNode.position.x + j * blockSize.width;
                const posY = this.originNode.position.y - i * blockSize.height;
                blockNode.setPosition(posX, posY);

                this.blockNodes[i][j] = blockNode;
            }
        }
        // log("blockNodes:", this.blockNodes);
    }

    getPosByOffset(touchRow: number, touchCol: number) {
        const blockSize = BlockSize;
        const originNode = this.originNode;
        return new Vec3(
            originNode.x + touchCol * blockSize.width,
            originNode.y - touchRow * blockSize.height,
            0
        );
    }
    /**
     * 0-7行，0-7列
     * @param pos
     * @returns
     */
    getOffsetByPos(pos: Vec3) {
        const blockSize = BlockSize;
        const originNode = this.originNode;
        const localPos = pos; //this.node.getComponent(UITransform).convertToNodeSpaceAR(pos);
        const row = -Math.round(
            (localPos.y - originNode.position.y) / blockSize.height
        );
        const col = Math.round(
            (localPos.x - originNode.position.x) / blockSize.width
        );

        return [row, col];
    }

    /**
     * 检查俄罗斯方块是否可以放置（在网格范围内且所有位置都为空）
     * @param touchRow 中心行
     * @param touchCol 中心列
     * @param shape 俄罗斯方块形状
     * @returns 是否可以放置
     */
    checkDragOptionCanPlace(
        touchRow: number,
        touchCol: number,
        shape: number[][]
    ) {
        // log("check-------------------", touchRow, touchCol, this.blockNodes, shape);
        for (const [offsetX, offsetY] of shape) {
            const row = touchRow - offsetY; // 1
            const col = touchCol + offsetX; //-1
            if (!this.checkRowColInBoard(row, col)) {
                return false;
            }
            // 检查是否已有方块
            if (this.blockNodes[row][col]) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查俄罗斯方块的所有方块的行号和列号(row, col)是否完全在8*8网格(0,0)~(7,7)范围内
     * @returns
     */
    checkRowColsInBoard(row: number, col: number, shape: number[][]) {
        for (const [offsetX, offsetY] of shape) {
            log("offsetX:", offsetX, " offsetY:", offsetY);
            const r = row - offsetY;
            const c = col + offsetX;
            log("r:", r, " c:", c);
            if (r < 0 || r >= 8 || c < 0 || c >= 8) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查此行、列号(row, col)是否完全在8*8网格(0,0)~(7,7)范围内
     * @returns
     */
    checkRowColInBoard(row: number, col: number) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    /**
     * 获取放置后可以清除的行号和列号
     * @param blockZeroRow 假如放下后，DragOption的Zero块所在的行
     * @param blockZeroCol 假如放下后，DragOption的Zero块所在的列
     * @param shape
     */
    getMatchesAfterPlace(
        blockZeroRow: number,
        blockZeroCol: number,
        shape: number[][]
    ) {
        const rowsToClear: number[] = []; // 可以清除的行号
        const colsToClear: number[] = []; // 可以清除的列号

        // 模拟放置：记录哪些位置会被填充
        const positionsToFill: { row: number; col: number }[] = [];
        const blocks2ChangeofDragOption: { row: number; col: number }[] = [];
        for (const [offsetX, offsetY] of shape) {
            const row = blockZeroRow - offsetY;
            const col = blockZeroCol + offsetX;
            if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                positionsToFill.push({ row, col });
            }
        }
        log("positionsToFill:", positionsToFill);

        // 检查满行（考虑模拟放置的位置）
        for (let i = 0; i < 8; i++) {
            if (this.isRowFull(i, positionsToFill)) {
                rowsToClear.push(i);
                blocks2ChangeofDragOption.push({ ...positionsToFill[i] });
            }
        }

        // 检查满列（考虑模拟放置的位置）
        for (let j = 0; j < 8; j++) {
            if (this.isColFull(j, positionsToFill)) {
                colsToClear.push(j);
                blocks2ChangeofDragOption.push({ ...positionsToFill[j] });
            }
        }

        return {
            rows: rowsToClear,
            cols: colsToClear,
            blocks2ChangeofDragOption,
        };
    }

    /**
     * 检查行是否满
     * @param row 行号
     * @param positionsToFill
     * @returns 是否满
     */
    private isRowFull(
        row: number,
        positionsToFill?: { row: number; col: number }[]
    ): boolean {
        // 遍历所有列，只查找不满的情况
        for (let j = 0; j < 8; j++) {
            // 检查当前位置是否要被填充
            const willBeFilled = positionsToFill?.some(
                (p) => p.row === row && p.col === j
            );
            log("willBeFilled:", willBeFilled, this.blockNodes[row][j]);
            // 如果某一列既没有现有方块，也将不会被新方块填充，则该行不可能满，返回 false
            if (!this.blockNodes[row][j] && !willBeFilled) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查列是否满
     * @param col 列号
     * @param positionsToFill
     * @returns 是否满
     */
    private isColFull(
        col: number,
        positionsToFill?: { row: number; col: number }[]
    ): boolean {
        // 遍历所有行，只查找不满的情况
        for (let i = 0; i < 8; i++) {
            // 检查当前位置是否要被填充
            const willBeFilled = positionsToFill?.some(
                (p) => p.row === i && p.col === col
            );
            // 如果某一行既没有现有方块，也将不会被新方块填充，则该列不可能满，返回 false
            if (!this.blockNodes[i][col] && !willBeFilled) {
                return false;
            }
        }
        return true;
    }

    // /**
    //  * 放置方块并触发消除检查
    //  */
    // placeBlock(centerRow: number, centerCol: number, shape: number[][], blockColorIdx: number) {
    //   const blockSize = BlockSize;
    //   createBlocksByShape(shape, blockColorIdx, new Vec3(centerCol * blockSize.width, centerRow * blockSize.height));
    //     // for (const [offsetX, offsetY] of shape) {
    //     //     const row = centerRow + offsetY;
    //     //     const col = centerCol + offsetX;

    //     //     // 更新数据
    //     //     this.curBlocks[row][col] = blockColorIdx;

    //     //     // 创建节点
    //     //     const blockNode = instantiate(this.blockPrefab);
    //     //     blockNode.parent = this.node;
    //     //     blockNode.getComponent(Block).init(blockColorIdx);

    //     //     // 计算位置
    //     //     const posX = this.originNode.position.x + col * blockSize.width;
    //     //     const posY = this.originNode.position.y - row * blockSize.height;
    //     //     blockNode.setPosition(posX, posY);

    //     //     this.blockNodes[row][col] = blockNode;
    //     // }

    //     this.checkAndClearLines();
    // }

    checkAndClearLines(
        colorIdx: number,
        blockZeroRow: number,
        blockZeroCol: number
    ) {
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];
        let clearCount = 0;
        // Check rows
        for (let i = 0; i < 8; i++) {
            if (this.isRowFull(i)) {
                rowsToClear.push(i);
                clearCount++;
            }
        }

        // Check cols
        for (let j = 0; j < 8; j++) {
            if (this.isColFull(j)) {
                colsToClear.push(j);
                clearCount++;
            }
        }

        const curRoundScore =
            GameManager.instance.setScoreByClearCount(clearCount);
        GameManager.instance.cleanTimes += clearCount;

        if (GameManager.instance.cleanTimes >= 9) {
            GameManager.instance.cleanTimes = -99999999; // 永远不可达

            jump2DownloadPage();
        }
        this.updateScore();
        // Clear
        const colorName = this.getColorName(colorIdx);
        rowsToClear.forEach((row) => {
            this.clearRow(row);
            this.playClearAnimation(row, -1, colorName + 1);
        });
        colsToClear.forEach((col) => {
            this.clearCol(col);
            this.playClearAnimation(-1, col, colorName + 2);
        });
        if (clearCount > 0) {
            // AudioManager.instance.playEffect(GameManager.instance.clearEffect);
            this.playEncourageAnimation(
                clearCount,
                colorIdx,
                blockZeroRow,
                blockZeroCol,
                curRoundScore
            );
        }

        if (rowsToClear.length > 0 || colsToClear.length > 0) {
            log(`Cleared rows: ${rowsToClear}, cols: ${colsToClear}`);
        }
    }

    updateScore() {
        this.animateScore();
    }

    /**
     * 递增分数动画（一个数一个数地递增）
     */
    private animateScore(): void {
        const targetScore = GameManager.instance.score;
        if (this.displayScore < targetScore) {
            // 每次只增加1
            this.displayScore++;

            // 更新显示
            this.scoreLabel.string = this.displayScore.toString();

            const bestScore = parseInt(
                sys.localStorage.getItem("bestScore") || "0"
            );
            if (this.displayScore > bestScore) {
                sys.localStorage.setItem(
                    "bestScore",
                    this.displayScore.toString()
                );
                this.bestScoreLabel.string = this.displayScore.toString();
            }

            // 继续动画，每10ms更新一次
            this.scheduleOnce(() => {
                this.animateScore();
            }, 0.01);
        } else {
            // 动画完成
            this.displayScore = targetScore;
            this.scoreLabel.string = this.displayScore.toString();
        }
    }

    private clearRow(row: number) {
        for (let j = 0; j < 8; j++) {
            this.removeBlock(row, j);
        }
    }

    private clearCol(col: number) {
        for (let i = 0; i < 8; i++) {
            this.removeBlock(i, col);
        }
    }

    private removeBlock(row: number, col: number) {
        if (this.blockNodes[row][col]) {
            const node = this.blockNodes[row][col];
            if (node) {
                node.destroy();
                this.blockNodes[row][col] = null;
            }
        }
    }

    /**
     * 播放鼓励动画
     * @param linesCleared 消除的行/列数
     * @param blockType 方块类型（用于确定颜色）
     * @param desRow 放置位置的目标行
     * @param desCol 放置位置的目标列
     * @param roundScore 本轮获得的分数
     */
    private playEncourageAnimation(
        linesCleared: number,
        colorIdx: number,
        desRow: number,
        desCol: number,
        curRoundScore: number
    ) {
        log("playEncourageAnimation----------------------->");

        // 根据消除的行/列数确定动画名称
        let animationPrefix = this.getAnimationPrefix(linesCleared);
        // 先播放分数动画
        this.playBonusLabelAnimation(
            desRow,
            desCol,
            curRoundScore,
            !!animationPrefix
        );
        log("animationPrefix", animationPrefix);
        if (!animationPrefix) return;
        // 获取颜色名称
        const colorName = this.getColorName(colorIdx);
        const animationName =
            GameCustomInfo.name === "BlockBrush"
                ? animationPrefix
                : animationPrefix + colorName;
        log("colorName", colorName, "animationName", animationName);

        // 获取pos
        const pos = this.getPosByOffset(desRow, desCol);

        const encourage = instantiate(GameManager.instance.encouragePrefab);
        encourage.setPosition(pos);
        encourage.parent = this.node;
        const armatureDisplay = encourage.getComponent(
            dragonBones.ArmatureDisplay
        );
        armatureDisplay.on(
            dragonBones.EventObject.COMPLETE,
            () => {
                log("-----龙骨动画播放完成");
                this.node.removeChild(encourage);
                encourage.destroy();
            },
            this
        );
        armatureDisplay.playAnimation(animationName, 1);
    }

    /**
     * 播放分数动画
     * @param centerRow 放置位置的中心行
     * @param centerCol 放置位置的中心列
     * @param curRoundScore 本轮获得的分数
     */
    private playBonusLabelAnimation(
        desRow: number,
        desCol: number,
        curRoundScore: number,
        needLift: boolean
    ) {
        const bonusLabel = instantiate(GameManager.instance.bonusLabelPrefab);
        bonusLabel.parent = this.node;

        // 获取 Label 组件并设置分数文本
        const label = bonusLabel.getComponent(Label);
        if (label) {
            label.string = `+${curRoundScore}`;
        }
        const pos = this.getPosByOffset(desRow, desCol);
        bonusLabel.setPosition(needLift ? pos.add(new Vec3(0, 100, 0)) : pos);
        // 获取 Animation 组件并播放 'bonus' 动画
        const animation = bonusLabel.getComponent(Animation);
        if (animation) {
            log("播放 bonus 动画");
            // 播放 'bonus' 动画
            animation.play("bonus");

            // 监听动画完成事件，播放完成后将节点移出屏幕外（不销毁，因为这是复用的节点）
            animation.once(
                Animation.EventType.FINISHED,
                () => {
                    bonusLabel.parent.removeChild(bonusLabel);
                    bonusLabel.destroy();
                },
                this
            );
        } else {
            log("BonusLabel 节点没有 Animation 组件");
        }
    }
    getAnimationPrefix(linesCleared: number): string {
        if (linesCleared === 2) {
            return GameCustomInfo.name === "BlockBrush" ? "good" : "good_";
        } else if (linesCleared === 3) {
            return GameCustomInfo.name === "BlockBrush" ? "great" : "great_";
        } else if (linesCleared === 4) {
            return GameCustomInfo.name === "BlockBrush"
                ? "excellect"
                : "excellect_";
        } else if (linesCleared === 5) {
            return GameCustomInfo.name === "BlockBrush"
                ? "amazing"
                : "amazing_";
        } else if (linesCleared >= 6) {
            return GameCustomInfo.name === "BlockBrush"
                ? "unbelievable"
                : "unbelievable_";
        } else {
            // 1行/列不播放动画
            return "";
        }
    }
    getColorName(colorIdx: number): string {
        const colors = [
            "yellow",
            "darkblue",
            "red",
            "green",
            "purple",
            "orange",
        ];
        return colors[colorIdx];
    }

    private playClearAnimation(
        row: number,
        col: number,
        animationName: string
    ) {
        log("playClearAnimation----------------------->");
        // 补丁
        if (animationName === "darkblue2") animationName = "wathetblue2";
        if (animationName === "darkblue1") animationName = "wathetblue1";

        if (GameCustomInfo.name === "BlockBrush") {
            animationName = "in";
        }
        // 实例化消除动画预制体
        const clearAni = instantiate(GameManager.instance.clearAniPrefab);

        // 计算位置
        let x = 0;
        let y = 0;

        if (row >= 0) {
            // 行消除：横向动画，位置在行的中心
            x = this.originNode.x + ((8 - 1) * BlockSize.width) / 2;
            y = this.originNode.y - row * BlockSize.height;
            log("消除行", row, "x", x, "y", y);
        } else if (col >= 0) {
            // 列消除：竖向动画，位置在列的中心
            x = this.originNode.x + col * BlockSize.width;
            y = this.originNode.y - ((8 - 1) * BlockSize.height) / 2;
            log("消除列", col, "x", x, "y", y, "animationName", animationName);
            if (GameCustomInfo.name === "BlockBrush") {
                // 旋转90度，因为它只有横向动画，动画名in
                clearAni.eulerAngles = new math.Vec3(0, 0, 90);
            }
        }

        clearAni.setPosition(x, y, 0);
        clearAni.parent = this.node;

        const armatureDisplay = clearAni.getComponent(
            dragonBones.ArmatureDisplay
        );
        clearAni.setScale(1.15, 1.15, 1);
        armatureDisplay.on(
            dragonBones.EventObject.COMPLETE,
            () => {
                log("---清除动画");
                this.node.removeChild(clearAni);
                clearAni.destroy();
            },
            this
        );

        armatureDisplay.playAnimation(animationName, 1);
        // todo：补丁
        this.scheduleOnce(() => {
            this.node?.removeChild(clearAni);
            clearAni?.destroy();
        }, 0.8);
    }
}
