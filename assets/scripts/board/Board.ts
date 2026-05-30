import {
    _decorator,
    Animation,
    Color,
    Component,
    dragonBones,
    find,
    instantiate,
    Label,
    Node,
    Prefab,
    Size,
    Sprite,
    SpriteFrame,
    tween,
    UIOpacity,
    UITransform,
    v3,
    Vec3,
} from "cc";
import { BlockSize, GameCustomInfo, themeConfig } from "../configs/config";
import { gameLevelConfigs } from "../configs/gameLevelConfigs";
import { X } from "../configs/gameLevelConfigs/blockKinds";
import { DragOptionsContainer } from "../dragOptions/DragOptionsContainer";
import { GameManager } from "../managers/GameManager";
import { getSkeletonComponent, Tool } from "../utils/tool";
import { SuperBlock } from "../dragOptions/block/SuperBlock";
import { SkinsManager } from "../configs/Skins/SkinsManager";
import { AudioManager } from "../managers/AudioManager";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
import { ObjectPoolManager } from "../managers/ObjectPoolManager";
import { DragOption } from "../dragOptions/DragOption";
import { fadeDownAnimation, resetEntranceTempBlockTransform } from "./entranceTempBlockFadeDown";
import { playSoccerLineEliminateFly, shouldUseSoccerLineEliminateFly } from "./soccerLineEliminateFly";
import { GemDestiUI } from "../misc/UI/GemDestiUI";
import { LocalImgToSprite } from "../misc/LocalImgToSprite";
import { PhotoTextureCache } from "../misc/PhotoTextureCache";
import { ShaderBlock } from "../dragOptions/block/ShaderBlock";
import { getEliminateSpineMixComp } from "../misc/eliminateAni/EliminateSpineMix/EliminateSpineMixBase";
import { MixStateManager } from "../misc/eliminateAni/EliminateSpineMix/MixStateManager";
const { ccclass, property } = _decorator;
@ccclass("Board")
export class Board extends Component {
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
    // @property({ type: Label, tooltip: "最佳分数标签" })
    // bestScoreLabel: Label = null;

    boardNode: Node = null;
    lineNode: Node = null;
    encourageContentSize: Size = new Size(0, 0);

    protected displayScore: number = 0;

    changeColorCfg = null;
    changeColorCfgIndex = 0;

    /** 一次消除中多行/列播足球合并时，避免交叉格重复克隆 */
    private _soccerMergeClaimed: Set<string> | null = null;

    @property(SpriteFrame)
    gridDecorators: SpriteFrame[] = [];

    protected onLoad(): void {
        Logger.info("Board:onLoad");
        this.boardNode = find("Canvas/BG/Board");

        this.lineNode = find("Canvas/BG/Board/Line");
        this._blockPrefab = GameManager.instance.blockPrefab;
        this.changeColorCfg = gameLevelConfigs[GameManager.instance.gameLevel].changeColorCfg;
        if (!this._blockPrefab) {
            throw new Error("Board:blockPrefab is not set");
        }
        this.changeBoardColor();
        this.initPuzzles();
        if (GameManager.instance.gemConfig.length === 0) {
            this.animationBeforeStart();
            // this.scheduleOnce(() => {
            //     eventManager.emit(GameEvent.GAME_START);
            // }, 0);
        }
        this.dragOptionsContainer.getComponent(DragOptionsContainer).init(this.node);
        if (GameManager.instance.enablePhotoMode) {
            eventManager.on(GameEvent.PHOTO_REFRESH, this.refreshPhotoAnimation, this);
        }
        // this.bestScoreLabel.string = sys.localStorage.getItem("bestScore") || "0";
    }

    start() {
        if (GameManager.instance) {
            this.displayScore = GameManager.instance.score;
        }
    }
    /** 棋盘上该格无真实方块（含 X 空位） */
    protected isBoardCellWithoutBlock(row: number, col: number): boolean {
        const cell = this.blockNodes[row]?.[col];
        return !cell || cell.name === X + "";
    }

    recycleEntranceTempBlock(block: Node) {
        resetEntranceTempBlockTransform(block);
        this.clearPhotoOfBlock(block);
        ObjectPoolManager.instance.put("Block", block);
    }

    protected spawnEntranceFillTempBlock(row: number, col: number): Node {
        const tempBlock = ObjectPoolManager.instance.get("Block");
        tempBlock.parent = this.node;
        tempBlock.angle = 0;

        const pureBlockIndex = GameManager.instance.pureBlockIndex
            ? GameManager.instance.pureBlockIndex
            : Math.floor(Math.random() * 6) + 1;
        let randomColorIdx = pureBlockIndex ? pureBlockIndex : Math.floor(Math.random() * 6) + 1;
        if (GameManager.instance.enableChangeColor) {
            randomColorIdx = 1;
        }
        tempBlock.getComponent(SuperBlock).init(randomColorIdx);
        this.setPhotoOfBlock(tempBlock, row, col, true);

        tempBlock.setPosition(this.originNode.x + col * BlockSize.width, this.originNode.y - row * BlockSize.height, 0);

        const uiOpacity = tempBlock.getComponent(UIOpacity) || tempBlock.addComponent(UIOpacity);
        uiOpacity.opacity = 0;
        tween(uiOpacity).to(0.1, { opacity: 255 }).start();
        return tempBlock;
    }

    /**
     * 从下到上填充动画（入场纹理层，仅在棋盘空隙/X 格生成临时块）
     * @returns 临时方块数组（用于 fadeDownAnimation）
     */
    fillUpAnimation(onStart?: () => void, onComplete?: () => void): Node[][] {
        onStart?.();

        const tempAnimBlocks: Node[][] = Array.from({ length: 8 }, () => new Array(8).fill(null));
        const fillDuration = 0.08;

        for (let row = 7; row >= 0; row--) {
            this.scheduleOnce(
                () => {
                    for (let col = 0; col < 8; col++) {
                        if (!this.isBoardCellWithoutBlock(row, col)) continue;
                        tempAnimBlocks[row][col] = this.spawnEntranceFillTempBlock(row, col);
                    }
                },
                row === 7 ? 0 : (7 - row) * fillDuration,
            );
        }

        const totalFillTime = 8 * fillDuration;
        this.scheduleOnce(() => onComplete?.(), totalFillTime + 0.3);

        return tempAnimBlocks;
    }

    /**
     * 从左上到右下对角线波浪填充动画（用于图片更新过渡）
     * 每条对角线（row+col 相同的格子）同时淡入，依次从 d=0 推进到 d=14。
     */
    fillDiagonalAnimation(onComplete?: () => void): Node[][] {
        const tempAnimBlocks: Node[][] = Array.from({ length: 8 }, () => new Array(8).fill(null));
        const blockSize = BlockSize;
        const stepDuration = 0.04; // 每条对角线间隔
        const totalDiagonals = 15; // d ∈ [0, 14]

        for (let d = 0; d < totalDiagonals; d++) {
            this.scheduleOnce(() => {
                const rowStart = Math.max(0, d - 7);
                const rowEnd = Math.min(7, d);
                for (let row = rowStart; row <= rowEnd; row++) {
                    const col = d - row;
                    const tempBlock = ObjectPoolManager.instance.get("Block");
                    tempBlock.parent = this.node;
                    tempBlock.getComponent(SuperBlock).init(1);
                    this.setPhotoOfBlock(tempBlock, row, col, true);
                    const posX = this.originNode.x + col * blockSize.width;
                    const posY = this.originNode.y - row * blockSize.height;
                    tempBlock.setPosition(posX, posY);
                    const uiOpacity = tempBlock.getComponent(UIOpacity) || tempBlock.addComponent(UIOpacity);
                    uiOpacity.opacity = 0;
                    tween(uiOpacity).to(0.1, { opacity: 255 }).start();
                    tempAnimBlocks[row][col] = tempBlock;
                }
            }, d * stepDuration);
        }

        // 所有格子淡入完毕后留 0.2s 再回调
        this.scheduleOnce(
            () => {
                if (onComplete) onComplete();
            },
            totalDiagonals * stepDuration + 0.1 + 0.2,
        );

        return tempAnimBlocks;
    }

    /**
     * 从左上到右下对角线波浪淡出动画（用于图片更新过渡）
     */
    fadeDiagonalAnimation(tempAnimBlocks: Node[][], onComplete?: () => void) {
        const stepDuration = 0.04;
        const totalDiagonals = 15;

        for (let d = 0; d < totalDiagonals; d++) {
            this.scheduleOnce(() => {
                const rowStart = Math.max(0, d - 7);
                const rowEnd = Math.min(7, d);
                for (let row = rowStart; row <= rowEnd; row++) {
                    const col = d - row;
                    const tempBlock = tempAnimBlocks[row][col];
                    if (!tempBlock) continue;
                    const uiOpacity = tempBlock.getComponent(UIOpacity);
                    if (uiOpacity) {
                        tween(uiOpacity)
                            .to(0.12, { opacity: 0 })
                            .call(() => {
                                this.clearPhotoOfBlock(tempBlock);
                                ObjectPoolManager.instance.put("Block", tempBlock);
                            })
                            .start();
                    }
                }
            }, d * stepDuration);
        }

        const totalTime = totalDiagonals * stepDuration + 0.12;
        this.scheduleOnce(() => {
            if (onComplete) onComplete();
        }, totalTime);
    }

    /**
     * 换图后的过渡动画：对角线铺满新图 → 更新真实棋盘 Photo → 对角线淡出
     */
    refreshPhotoAnimation() {
        AudioManager.instance.playRefreshEffect();
        const tempBlocks = this.fillDiagonalAnimation(() => {
            // 覆盖完毕：把棋盘上现有方块的 Photo 全部更新为新纹理
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const block = this.blockNodes[row]?.[col];
                    if (block) this.setPhotoOfBlock(block, row, col);
                }
            }
            // 再以对角线波浪淡出，露出更新好的真实棋盘
            this.fadeDiagonalAnimation(tempBlocks);
        });
    }

    /**
     * 游戏开始前的完整动画（填充 + 淡出）
     */
    animationBeforeStart() {
        const tempAnimBlocks = this.fillUpAnimation(
            () => {
                // AudioManager.instance.playRefreshEffect();
            },
            () => {
                // 填充完成后，开始淡出动画
                fadeDownAnimation(this, tempAnimBlocks, () => {
                    // 动画全部完成，触发游戏开始事件
                    eventManager.emit(GameEvent.GAME_START);
                });
            },
        );
    }
    changeBoardColor() {
        if (!this.boardNode || !this.boardNode.getComponent(Sprite)) return;
        const boardColor = SkinsManager.getInstance().getBoardColor();
        Logger.info("Board:initBoardColor:", "boardColor:", boardColor);
        if (boardColor) {
            this.boardNode.getComponent(Sprite).color = new Color().fromHEX(boardColor);
        }
        eventManager.emit(GameEvent.GAME_COLOR_CHANGE);
        // this.initLineColor();
    }
    // initBorder() {
    //     if (!this.borderNode) return;
    //     const borderConfig = SkinsManager.getInstance().getBorderColor();
    //     Logger.info("Board:initBorder:", "borderConfig:", borderConfig);
    //     if (borderConfig) {
    //         Tool.setNodeGradient(this.borderNode, borderConfig);
    //     }
    //     // this.borderNode.setPosition(0, 0);
    // }
    // initLineColor() {
    //     if (!this.lineNode) return;
    //     const lineColor = SkinsManager.getInstance().getLineColor();
    //     Logger.info("Board:initLineColor:", "lineColor:", lineColor);
    //     if (lineColor) {
    //         this.lineNode.getComponent(Sprite).color = new Color().fromHEX(lineColor);
    //     }
    // }

    initPuzzles() {
        this.puzzleConfig = gameLevelConfigs[GameManager.instance.gameLevel].ques;
        Logger.info(
            "Board:initPuzzles:",
            "puzzleConfig:",
            GameManager.instance.gameLevel,
            gameLevelConfigs,
            JSON.stringify(this.puzzleConfig),
        );
        if (!this.puzzleConfig) return;
        const blockSize = BlockSize;
        const config = this.puzzleConfig;
        Logger.info("Board:initPuzzles:", "config:", this.puzzleConfig, config);

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
                const blockIndex = row[j];
                const posX = this.originNode.x + j * blockSize.width;
                const posY = this.originNode.y - i * blockSize.height;
                this.setGridDecorator(posX, posY, i, j);
                if (blockIndex === X) {
                    this.blockNodes[i][j] = new Node(X + "");
                    continue;
                }
                if (blockIndex === 0) {
                    this.blockNodes[i][j] = null;
                    continue;
                }
                // const blockNode = instantiate(this._blockPrefab);
                const blockNode = ObjectPoolManager.instance.get("Block");
                blockNode.parent = this.node;
                this.setPhotoOfBlock(blockNode, i, j);

                blockNode.getComponent(SuperBlock).init(blockIndex);

                blockNode.setPosition(posX, posY);

                this.blockNodes[i][j] = blockNode;
            }
        }
        // log(
        //     "blockNodes:",
        //     this.blockNodes.map((row) => row.map((node) => (node ? node.name : "null")))
        // );
    }

    setGridDecorator(posX: number, posY: number, row: number, col: number) {
        // let gridDecorator = this.node.getChildByName("GridDecorator");
        // if (!gridDecorator) {
        //     gridDecorator = new Node("GridDecorator");
        //     gridDecorator.parent = this.node;
        // }
        // const gridSkin = new Node("GridSkin");
        // gridSkin.parent = gridDecorator;
        // gridSkin.addComponent(Sprite).spriteFrame = this.gridDecorators[(row * 8 + col) % this.gridDecorators.length];
        // gridSkin.addComponent(UIOpacity).opacity = 64;
        // gridSkin.getComponent(UITransform).setContentSize(BlockSize.width - 2, BlockSize.height - 2);
        // gridSkin.setPosition(posX, posY);
    }

    getPosByOffset(touchRow: number, touchCol: number) {
        const blockSize = BlockSize;
        const originNode = this.originNode;
        return new Vec3(originNode.x + touchCol * blockSize.width, originNode.y - touchRow * blockSize.height, 0);
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
        const row = -Math.round((localPos.y - originNode.position.y) / blockSize.height);
        const col = Math.round((localPos.x - originNode.position.x) / blockSize.width);

        return [row, col];
    }

    /**
     * 检查俄罗斯方块是否可以放置（在网格范围内且所有位置都为空）
     * @param firstBlockRow 第一个方块的行
     * @param firstBlockCol 第一个方块的列
     * @param shape 俄罗斯方块形状
     * @returns 是否可以放置
     */
    checkDragOptionCanPlace(firstBlockRow: number, firstBlockCol: number, shape: number[][]) {
        // Logger.info("Board:checkDragOptionCanPlace:", "check-------------------", touchRow, touchCol, this.blockNodes, shape);
        let rlt = true;
        Tool.iterateShape(shape, (offsetRow, offsetCol) => {
            const row = firstBlockRow + offsetRow; // 1
            const col = firstBlockCol + offsetCol; //-1
            Logger.info("Board:checkDragOptionCanPlace:", "row:", row, "col:", col);
            if (!this.checkRowColInBoard(row, col)) {
                rlt = false;
                return;
            }
            // 检查是否已有方块
            if (this.blockNodes[row][col]) {
                Logger.info("Board:checkDragOptionCanPlace:", ">>>>>>>>>>>>>>row:", row, "col:", col);
                rlt = false;
                return;
            }
        });
        return rlt;
    }

    /**
     * 检查俄罗斯方块的所有方块的行号和列号(row, col)是否完全在8*8网格(0,0)~(7,7)范围内
     * @returns
     */
    checkRowColsInBoard(row: number, col: number, shape: number[][]) {
        let rlt = true;
        Tool.iterateShape(shape, (offsetRow, offsetCol) => {
            Logger.info("Board:checkRowColsInBoard:", "offsetRow:", offsetRow, " offsetCol:", offsetCol);
            const r = row + offsetRow;
            const c = col + offsetCol;
            Logger.info("Board:checkRowColsInBoard:", "r:", r, " c:", c);
            if (r < 0 || r >= 8 || c < 0 || c >= 8) {
                rlt = false;
                return;
            }
        });
        return rlt;
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
     * @param touchRow
     * @param touchCol
     * @param shape
     */
    getMatchesAfterPlace(touchRow: number, touchCol: number, shape: number[][]) {
        const rowsToClear: number[] = []; // 可以清除的行号
        const colsToClear: number[] = []; // 可以清除的列号

        // 模拟放置：记录哪些位置会被填充
        const positionsToFill: { row: number; col: number }[] = [];
        Tool.iterateShape(shape, (offsetRow, offsetCol) => {
            const row = touchRow + offsetRow;
            const col = touchCol + offsetCol;
            if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                positionsToFill.push({ row, col });
            }
        });
        Logger.info("Board:getPossibleClearLinesAndCounts:", "positionsToFill:", positionsToFill);

        // 检查满行（考虑模拟放置的位置）
        for (let i = 0; i < 8; i++) {
            if (this.isRowFull(i, positionsToFill)) {
                rowsToClear.push(i);
            }
        }

        // 检查满列（考虑模拟放置的位置）
        for (let j = 0; j < 8; j++) {
            if (this.isColFull(j, positionsToFill)) {
                colsToClear.push(j);
            }
        }
        Logger.info("Board:getMatchesAfterPlace:", "rowsToClear:", rowsToClear, "colsToClear:", colsToClear);

        return { rows: rowsToClear, cols: colsToClear };
    }

    /**
     * 检查行是否满
     * @param row 行号
     * @param positionsToFill 可选：将要填充的位置数组（用于模拟放置）
     * @returns 是否满
     */
    protected isRowFull(row: number, positionsToFill?: { row: number; col: number }[]): boolean {
        for (let j = 0; j < 8; j++) {
            // 检查当前位置是否在模拟填充的位置
            const willBeFilled = positionsToFill?.some((p) => p.row === row && p.col === j);
            Logger.info("Board:isRowFull:", "willBeFilled:", willBeFilled);
            // 相同行且非模拟放置的列有任意一个位置为空，则行不满
            if ((!this.blockNodes[row][j] || this.blockNodes[row][j].name === X + "") && !willBeFilled) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查列是否满
     * @param col 列号
     * @param positionsToFill 可选：将要填充的位置数组（用于模拟放置）
     * @returns 是否满
     */
    protected isColFull(col: number, positionsToFill?: { row: number; col: number }[]): boolean {
        for (let i = 0; i < 8; i++) {
            const willBeFilled = positionsToFill?.some((p) => p.row === i && p.col === col);
            if ((!this.blockNodes[i][col] || this.blockNodes[i][col].name === X + "") && !willBeFilled) {
                return false;
            }
        }
        return true;
    }

    checkAndClearLines(
        blockIndex: number,
        firstBlockRow: number,
        firstBlockCol: number,
        shape: number[][],
        dragOptionNode: Node,
    ) {
        Logger.info(
            "Board:checkAndClearLines:",
            "centerLocalPos----------------------->",
            firstBlockRow,
            firstBlockCol,
        );
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];
        let clearCount = 0;
        let destBlockRow = firstBlockRow;
        let destBlockCol = firstBlockCol;
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
        if (clearCount > 0) {
            if (GameManager.instance.enableChangeColor) {
                Logger.info("Board:checkAndClearLines:", "changeColor:", blockIndex);
                this.changeColor(blockIndex);
            }
        }
        if (rowsToClear.length > 0 && colsToClear.length > 0) {
            destBlockRow = rowsToClear.reduce((a, b) => a + b, 0) / rowsToClear.length;
            destBlockCol = colsToClear.reduce((a, b) => a + b, 0) / colsToClear.length;
        }
        if (rowsToClear.length > 0 && colsToClear.length === 0) {
            let colCollection = [];
            Tool.iterateShape(shape, (offsetRow, offsetCol) => {
                const row = firstBlockRow + offsetRow;
                const col = firstBlockCol + offsetCol;
                if (rowsToClear.indexOf(row) !== -1) {
                    colCollection.push(col);
                }
            });
            destBlockCol = colCollection.reduce((a, b) => a + b, 0) / colCollection.length;
            destBlockRow = rowsToClear.reduce((a, b) => a + b, 0) / rowsToClear.length;
        }
        if (rowsToClear.length === 0 && colsToClear.length > 0) {
            let rowCollection = [];
            Tool.iterateShape(shape, (offsetRow, offsetCol) => {
                const row = firstBlockRow + offsetRow;
                const col = firstBlockCol + offsetCol;
                if (colsToClear.indexOf(col) !== -1) {
                    rowCollection.push(row);
                }
            });
            destBlockRow = rowCollection.reduce((a, b) => a + b, 0) / rowCollection.length;
            destBlockCol = colsToClear.reduce((a, b) => a + b, 0) / colsToClear.length;
        }

        const destLocalPos = this.getPosByOffset(destBlockRow, destBlockCol);

        // 内含combo动画
        const curRoundScore = GameManager.instance.setScoreWithClearCount(clearCount, blockIndex, destLocalPos.clone());
        GameManager.instance.cleanTimes += clearCount;

        // if (GameManager.instance.cleanTimes >= 9) {
        //     GameManager.instance.cleanTimes = -99999999; // 永远不可达

        //     // jump2DownloadPage();
        // }
        this.updateScore();
        // Clear

        const soccerLineFlyBatch = shouldUseSoccerLineEliminateFly(dragOptionNode);
        if (soccerLineFlyBatch) {
            this._soccerMergeClaimed = new Set();
        }
        // eventManager.emit(GameEvent.GAME_ELIMINATE_START_TRUE);
        eventManager.emit(GameEvent.GAME_ELIMINATE_BEFORE_START, { eliminateCount: clearCount });
        rowsToClear.forEach((row) => {
            this.playClearAnimation(row, -1, blockIndex, dragOptionNode);
        });
        colsToClear.forEach((col) => {
            this.playClearAnimation(-1, col, blockIndex, dragOptionNode);
        });
        if (soccerLineFlyBatch) {
            this._soccerMergeClaimed = null;
        }

        // 按列优先顺序收集 gem（col 0→7，每列先收行再收列消除中的格子）
        for (let c = 0; c < 8; c++) {
            rowsToClear.forEach((row) => {
                this.removeBlock(row, c, true);
            });
            if (colsToClear.includes(c)) {
                for (let r = 0; r < 8; r++) {
                    if (!rowsToClear.includes(r)) {
                        this.removeBlock(r, c, false);
                    }
                }
            }
        }

        if (this.blockNodes.reduce((acc, row) => acc + row.filter((block) => block !== null).length, 0) === 0) {
            if (MixStateManager.instance) {
                MixStateManager.instance.skinCfgCounter++;
            }
            if (GameManager.instance.AllEliminateSpineMixPrefab) {
                const allEliminateSpineMix = instantiate(GameManager.instance.AllEliminateSpineMixPrefab);
                allEliminateSpineMix.setPosition(0, 30, 0);
                allEliminateSpineMix.setScale(1.13, 1.13, 1);
                allEliminateSpineMix.parent = find("Canvas/UI");
            }
            eventManager.emit(GameEvent.GAME_ALL_ELIMINATE_START);
        }

        this.flushGemQueue();
        if (clearCount > 0) {
            // AudioManager.instance.playEffect(GameManager.instance.clearEffect);
            const encourageDelay =
                GameManager.instance.encouragePlayDelayBase + GameManager.instance.takeEncourageExtraDelay();
            this.scheduleOnce(() => {
                this.playEncourageAnimation(clearCount, blockIndex, destLocalPos.clone(), curRoundScore);
            }, encourageDelay);
            const linesCleared = rowsToClear.length + colsToClear.length;
            AudioManager.instance.playEliminateEffect();
            eventManager.emit(GameEvent.GAME_CLEAR_ANIMATION_START, blockIndex, linesCleared);
        }

        if (rowsToClear.length > 0 || colsToClear.length > 0) {
            Logger.info("Board:checkAndClearLines:", `Cleared rows: ${rowsToClear}, cols: ${colsToClear}`);
        }
    }

    changeColor(blockIndex: number) {
        const newBlockIndex = ((blockIndex + 1) % 7) + 1;
        this.changeColorCfgIndex = (this.changeColorCfgIndex + 1) % this.changeColorCfg.length;
        themeConfig.SkinSystemID = "skin_" + this.changeColorCfg[this.changeColorCfgIndex];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const block = this.blockNodes[i][j];
                if (block) {
                    block.getComponent(SuperBlock).switchSkin(1);
                }
            }
        }

        this.changeBoardColor();
        eventManager.emit(GameEvent.GAME_COLOR_CHANGE, { blockIndex: 1 });
    }

    updateScore() {
        this.animateScore();
    }

    /**
     * 递增分数动画（一个数一个数地递增）
     */
    protected animateScore(): void {
        const targetScore = GameManager.instance.score;
        Logger.info("Board:animateScore:", "targetScore:", targetScore, "displayScore:", this.displayScore);
        if (this.displayScore < targetScore) {
            // 每次只增加1
            this.displayScore++;

            // 继续动画，每10ms更新一次
            this.scheduleOnce(() => {
                this.animateScore();
            }, 0.01);
        } else {
            // 动画完成
            this.displayScore = targetScore;
        }
    }

    // gemQueue 收集当前一次消除中所有待飞行的宝石数据
    gemQueue: { gem: Node; gemCpBg: Node; blockIdx: number; startPos: Vec3; destPos: Vec3; col: number }[] = [];

    protected clearRow(row: number) {
        for (let j = 0; j < 8; j++) {
            this.removeBlock(row, j, true);
        }
    }

    protected clearCol(col: number) {
        for (let i = 0; i < 8; i++) {
            this.removeBlock(i, col, false);
        }
    }

    /** 将 gemQueue 中的宝石依次间隔播放飞行动画，播完后清空队列 */
    protected flushGemQueue() {
        if (this.gemQueue.length === 0) return;
        const queue = this.gemQueue.splice(0);
        const INTERVAL = 0.15;
        queue.forEach((item, seqIdx) => {
            this.scheduleOnce(() => {
                AudioManager.instance.playGemShowEffect();
                const gemCpBgOpacity = item.gemCpBg.getComponent(UIOpacity);
                gemCpBgOpacity.opacity = 80;
                tween(item.gemCpBg)
                    .to(0.3, { scale: v3(1.5, 1.5, 1) }, { easing: "backOut" })
                    .start();

                tween(gemCpBgOpacity)
                    .to(0.3, { opacity: 0 }, { easing: "backOut" })
                    .call(() => {
                        tween(item.gem)
                            .to(0.3, { scale: v3(0.95, 0.95, 1) }, { easing: "backOut" })
                            .call(() => {
                                Tool.flyGemTo(item.gem.parent, item.startPos, item.destPos, item.col, 0, () => {
                                    AudioManager.instance.playGemFly2DestiEffect();
                                    const gemConfig = GameManager.instance.gemConfig;
                                    const gemConfigItem = gemConfig.find((cfg) => cfg.blockIdx === item.blockIdx);
                                    if (gemConfigItem && gemConfigItem.destiScore > 0) {
                                        gemConfigItem.destiScore -= 1;
                                        eventManager.emit(GameEvent.GEM_COUNT_CHANGE);
                                    }
                                });
                            })
                            .start();
                    })
                    .start();
            }, seqIdx * INTERVAL);
        });
    }

    /**
     * 为 block 激活 Photo 贴图。
     * @param tempOverlay true：入场 fillUp / 换图对角线等临时块（始终可显示纹理，与棋盘常驻块无关）
     */
    protected setPhotoOfBlock(block: Node, row: number, col: number, tempOverlay = false) {
        if (!GameManager.instance.enablePhotoMode) return;
        if (!tempOverlay && !LocalImgToSprite.shouldShowPhotoOnBoardBlocks()) return;

        const photoNode = block.getChildByName("Photo");
        if (!photoNode) return;
        photoNode.active = true;
        const photoSprite = photoNode.getComponent(Sprite);
        if (photoSprite) {
            photoSprite.spriteFrame = PhotoTextureCache.getTileSpriteFrame(row, col);
        }
        block.getComponent(ShaderBlock)?.applyPhotoEdges();
    }

    /** 隐藏 block 节点的 Photo 子节点并清除 SpriteFrame（回收前调用）*/
    protected clearPhotoOfBlock(block: Node) {
        if (!GameManager.instance.enablePhotoMode) return;
        const photoNode = block.getChildByName("Photo");
        if (!photoNode) return;
        photoNode.active = false;
        const photoSprite = photoNode.getComponent(Sprite);
        if (photoSprite) photoSprite.spriteFrame = null;
        block.getComponent(ShaderBlock)?.clearPhotoEdges();
    }

    protected removeBlock(row: number, col: number, isRowClear: boolean = true) {
        if (this.blockNodes[row][col]) {
            const node = this.blockNodes[row][col];
            if (node) {
                const gem = node.getChildByName("Gem");
                if (gem) {
                    const ui = find("Canvas/UI");
                    const uiTransform = ui.getComponent(UITransform);
                    const gemDestiUI = find("Canvas/BG/GemDestiUI");
                    const blockIdx = node.getComponent(SuperBlock).blockIndex;
                    if (blockIdx > 100) {
                        const gemDestiPos = gemDestiUI?.getComponent(GemDestiUI)?.getGemWorldPosByBlockIndex(blockIdx);
                        const desp = uiTransform.convertToNodeSpaceAR(gemDestiPos);
                        const gemContainer = new Node();
                        gemContainer.parent = ui;
                        // 虚影背景
                        const gemCpBg = instantiate(gem);
                        gemCpBg.active = true;
                        const uiOpacity = gemCpBg.getComponent(UIOpacity) || gemCpBg.addComponent(UIOpacity);
                        uiOpacity.opacity = 0;
                        gemCpBg.scale = v3(0.8, 0.8, 1);
                        gemCpBg.parent = gemContainer;
                        // 实际宝石
                        const gemCp = instantiate(gem);
                        gem.active = true;
                        gemCp.parent = gemContainer;

                        const s = uiTransform.convertToNodeSpaceAR(gem.worldPosition);
                        gemContainer.setPosition(s);

                        // 收集进队列，等 flushGemQueue 统一处理
                        this.gemQueue.push({ gem: gemCp, gemCpBg, blockIdx, startPos: s, destPos: desp, col });
                    }
                }
                gem && (gem.active = false);

                // 立即清空引用，游戏逻辑不再等待动画
                this.blockNodes[row][col] = null;

                // 消除动画：先斜向抛出，再自由落体至屏幕外，全程持续旋转，最后回收
                if (GameManager.instance.enableBlockFallAnimation) {
                    // 提升渲染层级，确保坠落块显示在 preClearAni 之上
                    node.setSiblingIndex(this.node.children.length - 1);

                    const boardHeight = this.node.getComponent(UITransform)?.contentSize.height ?? 500;
                    const startPos = node.position.clone();
                    // 抛出阶段：随机水平偏移 + 向上弹起
                    const throwX = (Math.random() - 0.5) * 80;
                    const throwY = 50 + Math.random() * 40;
                    const peakPos = v3(startPos.x + throwX, startPos.y + throwY, startPos.z);
                    // 坠落阶段：继续水平漂移，向下坠落整个 Board 高度确保飞出屏幕外
                    const endPos = v3(peakPos.x + throwX * 0.4, peakPos.y - boardHeight * 1.2, startPos.z);
                    // 全程旋转：随机方向，1~2 圈
                    const spinDir = Math.random() > 0.5 ? 1 : -1;
                    const totalSpin = spinDir * (360 + Math.random() * 360);

                    // 位置 tween（不含角度，交由旋转 tween 独立处理）
                    tween(node)
                        // 阶段1：斜向抛出（easeOut 先快后慢，模拟上升减速）
                        .to(0.18, { position: peakPos }, { easing: "quadOut" })
                        // 阶段2：自由落体至屏幕外（easeIn 先慢后快，模拟重力加速）
                        .to(0.4, { position: endPos }, { easing: "quadIn" })
                        .call(() => {
                            node.angle = 0;
                            this.clearPhotoOfBlock(node);
                            ObjectPoolManager.instance.put("Block", node);
                        })
                        .start();

                    // 旋转 tween：覆盖抛出+坠落全程，匀速持续旋转
                    tween(node)
                        .to(0.58, { angle: node.angle + totalSpin }, { easing: "linear" })
                        .start();
                } else {
                    this.clearPhotoOfBlock(node);
                    ObjectPoolManager.instance.put("Block", node);
                }
            }
        }
    }

    /** 鼓励预制体播完后销毁（挂在 Canvas/UI，不能用 Board.removeChild） */
    protected disposeEncourageNode(encourage: Node | null | undefined): void {
        if (!encourage?.isValid) return;
        encourage.destroy();
    }

    protected disposeEliminateNode(eliminate: Node | null | undefined): void {
        if (!eliminate?.isValid) return;
        eliminate.destroy();
    }

    /**
     * 播放鼓励动画
     * @param linesCleared 消除的行/列数
     * @param blockType 方块类型（用于确定颜色）
     * @param desRow 放置位置的目标行
     * @param desCol 放置位置的目标列
     * @param roundScore 本轮获得的分数
     */
    protected playEncourageAnimation(
        linesCleared: number,
        blockIndex: number,
        centerLocalPos: Vec3,
        curRoundScore: number,
    ) {
        Logger.info("Board:playEncourageAnimation:", "playEncourageAnimation----------------------->", blockIndex);
        // 根据消除的行/列数确定动画名称
        let animationPrefix = this.getAnimationPrefix(linesCleared);

        const encourageSize = this.encourageContentSize;

        // encourage.getChildByName("Debug").getComponent(UITransform).setContentSize(encourageSize);
        const boardSize = find("Canvas/Board").getComponent(UITransform).contentSize;
        let minX = -boardSize.width / 2 + encourageSize.width / 2;
        let maxX = boardSize.width / 2 - encourageSize.width / 2;
        let minY = -boardSize.height / 2 + encourageSize.height / 2;
        let maxY = boardSize.height / 2 - encourageSize.height / 2;
        if (centerLocalPos.x < minX) {
            centerLocalPos.x = minX;
        }
        if (centerLocalPos.x > maxX) {
            centerLocalPos.x = maxX;
        }
        if (centerLocalPos.y < minY) {
            centerLocalPos.y = minY;
        }
        if (centerLocalPos.y > maxY) {
            centerLocalPos.y = maxY;
        }

        // 先播放分数动画
        this.playBonusLabelAnimation(
            centerLocalPos.clone().add(new Vec3(0, !!animationPrefix ? encourageSize.height / 2 - 10 : 0, 0)),
            curRoundScore,
        );
        const encouragePrefab = GameManager.instance.encouragePrefab;
        const encouragePos = centerLocalPos.clone().subtract(new Vec3(0, encourageSize.height / 2, 0));
        if (!encouragePrefab || !animationPrefix) {
            return;
        }

        const encourage = instantiate(encouragePrefab);
        encourage?.getComponent(UITransform)?.setContentSize(encourageSize);
        encourage.setPosition(encouragePos);
        encourage.parent = find("Canvas/UI");

        Logger.info("Board:playEncourageAnimation:", "animationPrefix", animationPrefix);

        const aniConfig = SkinsManager.getInstance().getEncourageAniConfigByBlockIndex(blockIndex);
        let armatureTracksPending = 0;
        const onEncourageArmatureComplete = (): void => {
            armatureTracksPending--;
            if (armatureTracksPending <= 0) {
                Logger.info("Board:playEncourageAnimation:", "-----鼓励动画全部播完，销毁节点");
                this.disposeEncourageNode(encourage);
            }
        };

        const skeleton = getSkeletonComponent(encourage);
        if (skeleton) {
            const spineAnimName = animationPrefix + "_blue";
            skeleton.setCompleteListener((trackEntry) => {
                const finishedName = trackEntry?.animation?.name ?? "";
                if (finishedName !== spineAnimName) return;
                skeleton.setCompleteListener(() => {});
                Logger.info("Board:playEncourageAnimation:", "-----Spine 鼓励动画播完");
                this.disposeEncourageNode(encourage);
            });
            skeleton.setAnimation(0, spineAnimName, false);
            return;
        }

        const setupChildArmature = (childName: string, colorConfig: [string, number], animationName: string) => {
            const child = encourage.getChildByName(childName);
            const armatureDisplay = child?.getComponent(dragonBones.ArmatureDisplay);
            if (!armatureDisplay) return;

            const color = new Color().fromHEX(colorConfig[0]);
            color.a = colorConfig[1];
            Logger.info("Board:playEncourageAnimation:", "color", color);
            armatureDisplay.color = color;
            armatureDisplay.timeScale = 2.5;
            armatureTracksPending++;
            armatureDisplay.on(dragonBones.EventObject.COMPLETE, onEncourageArmatureComplete, this);
            Logger.info("Board:playEncourageAnimation:", "-----播放龙骨动画", animationName);
            armatureDisplay.playAnimation(animationName, 1);
        };

        if (GameCustomInfo.name === "BlockBrush" && find("Canvas/GemSkinsManager")) {
            Logger.info("Board:playEncourageAnimationBC:", "-----播放龙骨动画", animationPrefix);
            const armatureDisplay = encourage.getComponent(dragonBones.ArmatureDisplay);
            if (armatureDisplay) {
                armatureTracksPending = 1;
                armatureDisplay.timeScale = 2.5;
                armatureDisplay.on(dragonBones.EventObject.COMPLETE, onEncourageArmatureComplete, this);
                armatureDisplay.playAnimation(animationPrefix, 1);
            } else {
                this.disposeEncourageNode(encourage);
            }
            return;
        }

        setupChildArmature("Label", aniConfig.label, animationPrefix + "_2");
        setupChildArmature("Light", aniConfig.light, animationPrefix + "_1");
        setupChildArmature("Outline", aniConfig.outline, animationPrefix + "_3");
        setupChildArmature("Star", aniConfig.star, animationPrefix + "_4");
        if (armatureTracksPending === 0) {
            Logger.warn("Board:playEncourageAnimation:", "无可用龙骨子节点，直接销毁");
            this.disposeEncourageNode(encourage);
        }
    }

    /**
     * 播放分数动画
     * @param curRoundScore 本轮获得的分数
     */
    protected playBonusLabelAnimation(pos: Vec3, curRoundScore: number) {
        const bonusLabel = instantiate(GameManager.instance.bonusLabelPrefab);
        bonusLabel.parent = find("Canvas/UI");

        // 获取 Label 组件并设置分数文本
        const label = bonusLabel.getComponent(Label);
        if (label) {
            label.string = `+${curRoundScore}`;
        }
        // const pos = this.getPosByOffset(desRow, desCol);
        bonusLabel.setPosition(pos);
        // 获取 Animation 组件并播放 'bonus' 动画
        const animation = bonusLabel.getComponent(Animation);
        if (animation) {
            Logger.info("Board:animateScore:", "播放 bonus 动画");
            // 播放 'bonus' 动画
            animation.play("bonus");

            // 监听动画完成事件，播放完成后将节点移出屏幕外（不销毁，因为这是复用的节点）
            animation.once(
                Animation.EventType.FINISHED,
                () => {
                    bonusLabel.parent.removeChild(bonusLabel);
                },
                this,
            );
        } else {
            Logger.info("Board:animateScore:", "BonusLabel 节点没有 Animation 组件");
        }
    }
    getAnimationPrefix(linesCleared: number): string {
        if (linesCleared === 2) {
            this.encourageContentSize = new Size(300, 120);
            AudioManager.instance.playGoodEffect();
            return "good";
        } else if (linesCleared === 3) {
            this.encourageContentSize = new Size(300, 120);
            AudioManager.instance.playGreatEffect();
            return "great";
        } else if (linesCleared === 4) {
            this.encourageContentSize = new Size(390, 120);
            AudioManager.instance.playExcellectEffect();
            return "excellect";
        } else if (linesCleared === 5) {
            this.encourageContentSize = new Size(370, 120);
            AudioManager.instance.playAmazingEffect();
            return "amazing";
        } else if (linesCleared >= 6) {
            this.encourageContentSize = new Size(620, 120);
            AudioManager.instance.playUnbelievableEffect();
            return "unbelievable";
        } else {
            // 1行/列不播放动画
            return "";
        }
    }

    isScreenFull(preCfg?: { shape: number[][]; blockFirstRow: number; blockFirstCol: number }): boolean {
        if (preCfg) {
            // 先收集所有空格子
            const left2check: Set<[number, number]> = new Set();
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (this.blockNodes[row][col] === null) {
                        left2check.add([row, col]);
                    }
                }
            }
            // 再检查预消除的方块是否在空格子中
            const { shape, blockFirstRow, blockFirstCol } = preCfg;
            Tool.iterateShape(shape, (offsetRow, offsetCol, specificBlockIndex) => {
                const row = blockFirstRow + offsetRow;
                const col = blockFirstCol + offsetCol;
                if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                    if (specificBlockIndex) {
                        const left2checkArray = Array.from(left2check);
                        for (let i = left2checkArray.length - 1; i >= 0; i--) {
                            const item = left2checkArray[i];
                            if (item[0] === row && item[1] === col) {
                                left2check.delete(item);
                                break;
                            }
                        }
                    }
                }
            });
            Logger.info("Board:isScreenFull:", "left2check", left2check);
            // 如果空格子都填满了，则返回true
            return left2check.size === 0;
        }
        return this.blockNodes.every((row) => row.every((block) => block !== null));
    }

    protected playClearAnimation(row: number, col: number, blockIndex: number, dragOptionNode: Node) {
        Logger.info("Board:playClearAnimation:", "playClearAnimation----------------------->");

        if (shouldUseSoccerLineEliminateFly(dragOptionNode)) {
            playSoccerLineEliminateFly(this.node, this.blockNodes, row, col, this._soccerMergeClaimed);
            return;
        }

        // this.playClearAnimationDissolve(row, col, aniConfig);
        // return;
        // 补丁
        // if (animationName === "darkblue2") animationName = "wathetblue2";
        // if (animationName === "darkblue1") animationName = "wathetblue1";
        // 实例化消除动画预制体
        let eliminate: Node = null;
        if (
            dragOptionNode.getComponent(DragOption).isDifferentColorDragOption ||
            GameManager.instance.EliminateAniColorfulPrefab // 不一定有彩色
        ) {
            eliminate = instantiate(GameManager.instance.EliminateAniColorfulPrefab);
        } else {
            Logger.info("Board:playClearAnimation:", "EliminateAniPrefab", !!GameManager.instance.EliminateAniPrefab);
            if (GameManager.instance.EliminateAniPrefab) {
                eliminate = instantiate(GameManager.instance.EliminateAniPrefab);
            }
        }

        // 计算位置
        let x = 0;
        let y = 0;

        if (row >= 0) {
            // 行消除：横向动画，位置在行的中心
            x = this.originNode.x + ((8 - 1) * BlockSize.width) / 2;
            y = this.originNode.y - row * BlockSize.height;
            Logger.info("Board:playClearAnimation:", "消除行", row, "x", x, "y", y);
        } else if (col >= 0) {
            // 列消除：竖向动画，位置在列的中心
            x = this.originNode.x + col * BlockSize.width;
            y = this.originNode.y - ((8 - 1) * BlockSize.height) / 2;
            // 旋转90度
            eliminate.setRotationFromEuler(0, 0, 90);
            Logger.info("Board:playClearAnimation:", "消除列", col, "x", x, "y", y);
        }

        eliminate.setPosition(x, y, 0);
        eliminate.parent = this.node;
        eliminate.setScale(1.13, 1.13, 1);
        const worldPos = eliminate.worldPosition.clone();
        const direction = row >= 0 ? 0 : 1;
        eventManager.emit(GameEvent.GAME_ELIMINATE_START, {
            worldPos,
            direction,
            blockIndex,
            clearRow: row,
            clearCol: col,
            eliminateNode: eliminate,
        });
        if (getEliminateSpineMixComp(eliminate)) {
            return;
        }
        const child = eliminate.getChildByName("Spine");
        if (child) {
            // 子节点 EliminateSpineAni / EliminateSpineAni4Soap 等自行监听 GAME_ELIMINATE_START 并在结束时 destroy
            return;
        }
        let armatureDone = false;
        const onDragonBonesEliminateComplete = (callback?: () => void) => {
            if (armatureDone) return;
            armatureDone = true;
            callback?.();
            this.disposeEliminateNode(eliminate);
        };
        // 配置和播放动画的辅助函数
        const setupArmature = (childName: string, animationName: string, colorHex?: string, callback?: () => void) => {
            Logger.info("Board:playClearAnimation:", "setupArmature", childName, colorHex, animationName, eliminate);
            const child = eliminate.getChildByName(childName);
            if (child) {
                const armatureDisplay = child.getComponent(dragonBones.ArmatureDisplay);
                if (armatureDisplay) {
                    if (colorHex) {
                        armatureDisplay.color = new Color().fromHEX(colorHex);
                    }
                    armatureDisplay.on(
                        dragonBones.EventObject.COMPLETE,
                        () => onDragonBonesEliminateComplete(callback),
                        this,
                    );
                    armatureDisplay.playAnimation(animationName, 1);
                }
            }
        };

        // 设置三层动画
        if (
            dragOptionNode.getComponent(DragOption).isDifferentColorDragOption ||
            GameManager.instance.EliminateAniColorfulPrefab // 不一定有彩色
        ) {
            Logger.info("Board:playClearAnimation:", "设置彩色动画");
            if (eliminate.getChildByName("colorful").getComponent(dragonBones.ArmatureDisplay)) {
                setupArmature("colorful", "efx", undefined, () => {
                    eventManager.emit(GameEvent.GAME_ELIMINATE, worldPos);
                });
            } else if (eliminate.getChildByName("colorful").getComponent(Animation)) {
                const colorfulAnim = eliminate.getChildByName("colorful").getComponent(Animation);
                colorfulAnim.once(Animation.EventType.FINISHED, () => {
                    eventManager.emit(GameEvent.GAME_ELIMINATE, worldPos);
                    this.disposeEliminateNode(eliminate);
                });
                colorfulAnim.play();
            }
        } else {
            let aniConfig = null;
            // if (GameCustomInfo.name === "BlockBrush") {
            //     aniConfig = { top: "#FFCE3F", middle: "#edc373", bottom: "#634B00" };
            // } else {
            aniConfig = SkinsManager.getInstance().getEliminateConfigByBlockIndex(blockIndex);
            // }
            Logger.info("Board:playClearAnimation:", "aniConfig", aniConfig);
            setupArmature("top", "efx_1", aniConfig.top);
            setupArmature("middle", "efx_2", aniConfig.middle);
            setupArmature("bottom", "efx_3", aniConfig.bottom, () => {
                eventManager.emit(GameEvent.GAME_ELIMINATE, worldPos);
            });
        }
    }

    protected playClearAnimationDissolve(
        row: number,
        col: number,
        aniConfig: { top: string; middle: string; bottom: string },
    ) {
        Logger.info("Board:playClearAnimationDissolve:", "playClearAnimationDissolve----------------------->");

        // 1. 摘取该行/列的方块节点，同时从逻辑棋盘中清除
        const dissolveNodes: Node[] = [];
        if (row >= 0) {
            for (let c = 0; c < 8; c++) {
                const node = this.blockNodes[row][c];
                if (node) {
                    dissolveNodes.push(node);
                    this.blockNodes[row][c] = null;
                }
            }
        } else if (col >= 0) {
            for (let r = 0; r < 8; r++) {
                const node = this.blockNodes[r][col];
                if (node) {
                    dissolveNodes.push(node);
                    this.blockNodes[r][col] = null;
                }
            }
        }

        const burnInner = new Color().fromHEX(aniConfig.middle);
        const burnOuter = new Color().fromHEX(aniConfig.top);
        const DURATION = 0.5;

        // 2. 对每个方块取自身材质实例，驱动溶解属性
        dissolveNodes.forEach((node) => {
            const sprite = node.getComponent(Sprite);
            if (!sprite) {
                ObjectPoolManager.instance.put("Block", node);
                return;
            }

            const matInst = sprite.getMaterialInstance(0);
            if (!matInst) {
                ObjectPoolManager.instance.put("Block", node);
                return;
            }

            matInst.setProperty("burnColorInner", burnInner);
            matInst.setProperty("burnColorOut", burnOuter);
            matInst.setProperty("colorWidth", 0.15);
            matInst.setProperty("dissolveFactor", 0);

            // 3. tween 驱动 dissolveFactor 0 → 1
            const progress = { factor: 0 };
            tween(progress)
                .to(
                    DURATION,
                    { factor: 1 },
                    {
                        onUpdate: () => {
                            matInst.setProperty("dissolveFactor", progress.factor);
                        },
                    },
                )
                .call(() => {
                    ObjectPoolManager.instance.put("Block", node);
                })
                .start();
        });
    }
}
