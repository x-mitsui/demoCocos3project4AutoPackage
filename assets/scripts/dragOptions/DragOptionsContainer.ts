import { _decorator, Component, dragonBones, find, instantiate, Node, Prefab, tween, Vec3 } from "cc";
import { DragOption } from "./DragOption";
import { Board } from "../board/Board";
import { GameManager } from "../managers/GameManager";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Answer } from "../configs/config";
import { Logger } from "../utils/logger";
import { specifiedShapesCache } from "./SpecifiedShapesCache";
import { gameLevelConfigs } from "../configs/gameLevelConfigs";
import {
    areShapesEqual as areShapesSame,
    canShapeBePlaced,
    convertRegionToMatrix,
    calcShapesC1,
    BoardCalcFn,
    calcShapesC2,
} from "./calculators/c1";
import { jump2DownloadPage } from "../utils/tool";
import { SuperBlock } from "./block/SuperBlock";
import { MixStateManager } from "../misc/eliminateAni/EliminateSpineMix/MixStateManager";

/** 形状矩阵中方块格数量（非 0 的格子数） */
function countBlocksInShapeMatrix(shape: number[][]): number {
    let n = 0;
    for (const row of shape) {
        for (const v of row) {
            if (v !== 0) n++;
        }
    }
    return n;
}

/** Answer 各变体中的最大块数 */
function maxBlockCountOfAnswer(answer: Answer): number {
    if (!answer.shapes?.length) return 0;
    let m = 0;
    for (const sh of answer.shapes) {
        m = Math.max(m, countBlocksInShapeMatrix(sh));
    }
    return m;
}

/** 存在单格完美空隙时，一批最多允许的单格形状数量 */
const MAX_SINGLE_CELL_PER_BATCH = 1;
/** 棋盘上已放置块数超过该值时，本批不出单格块 */
const SINGLE_CELL_MAX_BOARD_BLOCKS = 16;

/** 是否为单格块（任一变体仅 1 格，如 [[[1]]]） */
function isSingleCellAnswer(answer: Answer): boolean {
    return maxBlockCountOfAnswer(answer) === 1;
}

/** 全封闭完美空隙里是否存在「仅 1 格」的空隙形状 */
function hasSingleCellClosedGap(closedGapShapes: number[][][]): boolean {
    return closedGapShapes.some((shape) => countBlocksInShapeMatrix(shape) === 1);
}

const SINGLE_CELL_SHAPE: number[][] = [[1]];

/** 单格块是否存在某一放法可消掉至少一行或一列 */
function canSingleCellClearLineOnBoard(board: Board): boolean {
    const blockNodes = board.blockNodes;
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            let canPlace = true;
            if (blockNodes[sr]?.[sc]) {
                canPlace = false;
            }
            if (!canPlace) continue;
            const { rows, cols } = board.getMatchesAfterPlace(sr, sc, SINGLE_CELL_SHAPE);
            if (rows.length > 0 || cols.length > 0) return true;
        }
    }
    return false;
}

/** 统计棋盘上已放置的实体块（不含空格与 X 障碍） */
function countOccupiedBlocksOnBoard(board: Board): number {
    let n = 0;
    for (const row of board.blockNodes) {
        for (const cell of row) {
            if (cell?.getComponent(SuperBlock)) n++;
        }
    }
    return n;
}

/** 本批是否允许出单格：棋盘块数 ≤16，且（1 格完美空隙 或 单格可消行/列） */
function shouldAllowSingleCellThisBatch(closedGapShapes: number[][][], board: Board): boolean {
    if (countOccupiedBlocksOnBoard(board) > SINGLE_CELL_MAX_BOARD_BLOCKS) {
        return false;
    }
    return hasSingleCellClosedGap(closedGapShapes) || canSingleCellClearLineOnBoard(board);
}

function countSingleCellInResults(results: Answer[]): number {
    let n = 0;
    for (const r of results) {
        if (isSingleCellAnswer(r)) n++;
    }
    return n;
}

function isSingleCellQuotaFull(results: Answer[]): boolean {
    return countSingleCellInResults(results) >= MAX_SINGLE_CELL_PER_BATCH;
}

/** 棋盘过密时一律禁止单格（即使有完美 1 格空隙） */
function isBoardTooDenseForSingleCell(board: Board): boolean {
    return countOccupiedBlocksOnBoard(board) > SINGLE_CELL_MAX_BOARD_BLOCKS;
}

/** 本批是否应排除单格块（不允许出单格 → 一律不出；允许则最多 1 个） */
function shouldExcludeSingleCell(results: Answer[], allowSingleCellThisBatch: boolean, board?: Board): boolean {
    if (board && isBoardTooDenseForSingleCell(board)) return true;
    if (!allowSingleCellThisBatch) return true;
    return isSingleCellQuotaFull(results);
}

function answerShapeFingerprint(answer: Answer): string {
    const shapes = answer?.shapes || [];
    return shapes.map((shape) => shape.map((row) => row.join("")).join("|")).join(" || ");
}

function getShapeFootprint(shape: number[][]): {
    height: number;
    width: number;
    blockCount: number;
} {
    const height = shape.length;
    const width = shape.reduce((best, row) => Math.max(best, row.length), 0);
    const blockCount = countBlocksInShapeMatrix(shape);
    return { height, width, blockCount };
}

/** 形状池头部项数：大块通常排在 specifiedShapesCache 前约 7～10 项内，这里取前 10 项加权重 */
const CLEAR_BOARD_CACHE_HEAD_COUNT = 10;
/** 落在头部下标时的权重倍率（与 maxBlocks² 相乘） */
const CLEAR_BOARD_CACHE_HEAD_WEIGHT_MULT = 3;

/**
 * 清盘分支：按「各变体最大格数」平方加权，并对「池子前若干项」再乘倍率（与设计约定的大块排序一致）
 */
function pickWeightedRandomAnswerClearBoard(
    answers: Answer[],
    cacheOrder: Answer[],
    options?: { excludeSingleCell?: boolean },
): Answer {
    let list = answers;
    if (options?.excludeSingleCell) {
        const nonSingle = answers.filter((a) => !isSingleCellAnswer(a));
        if (nonSingle.length > 0) {
            list = nonSingle;
        } else {
            const fromCache = cacheOrder.filter((a) => !isSingleCellAnswer(a));
            if (fromCache.length > 0) list = fromCache;
        }
    }
    if (list.length === 0) {
        Logger.warn("DragOptionsContainer:pickWeightedRandomAnswerClearBoard:", "无非单格候选，回退原池");
        list = answers.length > 0 ? answers : cacheOrder;
    }
    const weights = list.map((a) => {
        const m = maxBlockCountOfAnswer(a);
        let w = Math.max(1, m * m);
        const idx = cacheOrder.indexOf(a);
        if (idx >= 0 && idx < CLEAR_BOARD_CACHE_HEAD_COUNT) {
            w *= CLEAR_BOARD_CACHE_HEAD_WEIGHT_MULT;
        }
        return w;
    });
    let sum = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < list.length; i++) {
        r -= weights[i];
        if (r <= 0) return list[i];
    }
    return list[list.length - 1];
}

const { ccclass, property } = _decorator;
/**
 * 拖动选项容器
 * 1. 可配置拖动选项DragOptionPrefab数量，一般3个或4个，暂定3个
 * 2. 每次用完所有选项要刷新，按配置重新创建，如果配置用完就随机
 */
@ccclass("DragOptionsContainer")
export class DragOptionsContainer extends Component {
    @property({ type: Prefab })
    dragOptionPrefab: Prefab = null;

    @property
    optionsCount: number = 3;

    @property({ tooltip: "拖动选项的基础 Y 坐标（相对于容器中心）" })
    baseY: number = -650;

    @property({ tooltip: "选项水平间距（generateRound 初始布局）" })
    optionSpacing = 350;

    @property({ tooltip: "跟手：每放置一个选项后，其余选项重新排布（剩 2 均匀分布、剩 1 居中）" })
    enableFollowHandNudge = true;

    @property({ tooltip: "跟手：剩 3 个及以上时，每次向目标位移动的比例；剩 2/1 时一次到位" })
    followHandNudgeRatio = 0.28;

    @property({ tooltip: "跟手：靠近动画时长（秒）" })
    followHandNudgeDuration = 0.22;

    @property({ type: Node })
    maskNode: Node = null!;

    /**
     *  从 specifiedShapesCache 里挑候选形状时，顺序怎么走。
        true（默认）：每一批会先打乱顺序，再依次拿。
        结果：更随机，不容易老是出同样顺序。
        false：按 specifiedShapesCache 里原本的下标顺序拿（0,1,2...），拿完一轮再从头。
     */
    @property()
    shuffleSpecifiedShapesInBatch = true;

    /**
     *  这个参数是“顺序出题转随机出题的阈值”。

        只在你把上面那个开关设成 shuffleSpecifiedShapesInBatch = false 时才有意义：

        0：永远不自动切换，一直按顺序循环取形。
        N > 0：前 N 轮按顺序；从第 N+1 轮开始，自动切到随机（等价于 shuffleSpecifiedShapesInBatch = true）。
        举例：

        设成 3：前 3 轮可控、方便引导；第 4 轮后开始随机，避免太死板。
        一句话：它是给“先教学、后随机”这种节奏用的。
     */
    @property()
    switchToShuffleSpecifiedShapesAfterNRounds = 0;

    @property({ tooltip: "启用候选块 cheap 预判筛选（先粗筛再精测）" })
    enableCheapPreFilter = true;

    @property({ tooltip: "cheap 预判后保留的候选数量上限" })
    cheapPreFilterTopN = 16;

    pureBlockIndex = 0;
    /** 本局已用「顺序取 specifiedShapesCache」完成 generateMultipleConfigs 批次数（有可用 uniqueBase 时计 1） */
    private _specifiedShapesSequentialRoundsCompleted = 0;
    private answersConfig: Answer[] = [];
    private _answerIndex2use: number = 0;
    boardNode: Node = null!;
    curOptions: Node[] = [];
    shadowContainerNode: Node = null!; // 阴影容器节点

    /** 当前使用的棋盘计算算法，切换难度时替换此字段即可 */
    boardCalc: BoardCalcFn = calcShapesC2;

    init(boardNode: Node) {
        this.boardNode = boardNode;
        this.pureBlockIndex = GameManager.instance.pureBlockIndex;
        this.initShadowContainer();
    }

    /**
     * 初始化阴影容器节点（在 Canvas 下查找已存在的 DragOptionsShadowContainer）
     */
    private initShadowContainer() {
        const shadowContainer = find("DragOptionsShadowContainer", this.node.parent);
        this.shadowContainerNode = shadowContainer;
    }
    onLoad() {
        Logger.info("DragOptionsContainer:onLoad");
        this.answersConfig = gameLevelConfigs[GameManager.instance.gameLevel].answers;

        this.node.on("check-refill", this.checkAndRefill, this);

        eventManager.once(GameEvent.GAME_WIN, this.onGameWin, this);
        eventManager.once(GameEvent.GAME_START, this.generateRound, this);
        // this.scheduleOnce(() => {
        //     this.generateRound();
        // }, 0.5);
        eventManager.on(GameEvent.GAME_COLOR_CHANGE, this.changeColor, this);
        eventManager.on(GameEvent.GAME_REVIVE, this.onGameRevive, this);
        eventManager.on(GameEvent.BTN_REPLAY_CLICK, this.onBtnReplayClick, this);
        eventManager.on(GameEvent.GAME_ALL_ELIMINATE_START, this.gameAllEliminateStart, this);
    }
    gameAllEliminateStart() {
        const mixState = MixStateManager.instance;
        if (!mixState) return;

        Logger.info("DragOptionsContainer:gameAllEliminateStart", "skinCfgCounter:", mixState.skinCfgCounter);
        this.refreshAllBlocksToCurrentSkin();
    }

    private refreshAllBlocksToCurrentSkin() {
        const board = this.boardNode?.getComponent(Board);
        if (board?.blockNodes) {
            for (const row of board.blockNodes) {
                for (const node of row) {
                    this.refreshBlockSkinRecursively(node);
                }
            }
        }

        for (const dragOptionNode of this.node.children) {
            this.refreshBlockSkinRecursively(dragOptionNode);
        }
    }

    private refreshBlockSkinRecursively(node: Node | null) {
        if (!node) return;

        const superBlock = node.getComponent(SuperBlock);
        if (superBlock && superBlock.blockIndex > 0) {
            superBlock.switchSkin(superBlock.blockIndex);
        }

        for (const child of node.children) {
            this.refreshBlockSkinRecursively(child);
        }
    }
    onGameRevive() {
        this.node.removeAllChildren();
        Logger.info("DragOptionsContainer:onGameRevive", "this.node.children.length:", this.node.children.length);
        this.checkAndRefill();
        jump2DownloadPage();
    }
    onBtnReplayClick() {
        this.node.removeAllChildren();
        Logger.info("DragOptionsContainer:onBtnReplayClick", "this.node.children.length:", this.node.children.length);
        this.checkAndRefill();
    }
    nextQues(isAutoGenerate: boolean = false) {
        if (!isAutoGenerate) {
            this._answerIndex2use = 0;
            this.answersConfig = gameLevelConfigs[GameManager.instance.gameLevel].answers;
        }
        this.checkAndRefill();
    }

    onDestroy() {
        this.node.off("check-refill", this.checkAndRefill, this);
        eventManager.off(GameEvent.GAME_ALL_ELIMINATE_START, this.gameAllEliminateStart, this);
    }

    checkAndRefill() {
        Logger.info("DragOptionsContainer:checkAndRefill", "this.node.children.length:", this.node.children.length);
        if (this.node.children.length === 0) {
            this.generateRound();
        }
    }

    /** 提取棋盘上所有全封闭空区域（不接触外边界）的归一化形状 */
    private getClosedGapShapes(blockNodes: Node[][]): number[][][] {
        const visited = new Set<string>();
        const closedShapes: number[][][] = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (blockNodes[row][col]) continue;
                const key = `${row},${col}`;
                if (visited.has(key)) continue;

                const queue: Array<{ row: number; col: number }> = [{ row, col }];
                const region: Array<{ row: number; col: number }> = [];
                let touchesBoundary = false;
                visited.add(key);

                while (queue.length > 0) {
                    const cur = queue.shift()!;
                    region.push(cur);
                    if (cur.row === 0 || cur.row === 7 || cur.col === 0 || cur.col === 7) {
                        touchesBoundary = true;
                    }
                    const dirs = [
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1],
                    ];
                    for (const [dr, dc] of dirs) {
                        const nr = cur.row + dr;
                        const nc = cur.col + dc;
                        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
                        if (blockNodes[nr][nc]) continue;
                        const nk = `${nr},${nc}`;
                        if (visited.has(nk)) continue;
                        visited.add(nk);
                        queue.push({ row: nr, col: nc });
                    }
                }

                if (!touchesBoundary && region.length > 0) {
                    closedShapes.push(convertRegionToMatrix(region));
                }
            }
        }
        return closedShapes;
    }

    /**
     * 批量生成多个DragOption配置
     * @param count 生成数量
     * @param specifiedShapesCache 指定的形状池
     * @returns 生成的配置数组
     */
    generateMultipleConfigs(count: number = 3): Array<{ blockIndex: number; shapes: number[][][] }> {
        const CompBoard = this.boardNode.getComponent(Board);
        const results: Array<{ blockIndex: number; shapes: number[][][] }> = [];
        /** 筛选后的「匹配空隙」答案，用于在兜底填充后保证 results 至少包含其中一项（优先只动兜底位） */
        let exactMatchAnswersForEnsure: Answer[] = [];
        /** 模拟摆放阶段结束时 results 的长度；下标 ≥ 此值的项视为兜底生成，可被 nm 替换 */
        let resultsLengthAfterPool = 0;
        /** 1 格完美空隙，或单格可消行/列时，才允许出单格块 */
        let allowSingleCellThisBatch = false;

        // 如果有指定的形状池
        if (specifiedShapesCache && specifiedShapesCache.length > 0) {
            // 提取当前棋盘上所有的空隙形状
            const { allShapes } = this.boardCalc(CompBoard.blockNodes, specifiedShapesCache);
            const closedGapShapes = this.getClosedGapShapes(CompBoard.blockNodes);
            allowSingleCellThisBatch = shouldAllowSingleCellThisBatch(closedGapShapes, CompBoard);

            const boardBlockCount = countOccupiedBlocksOnBoard(CompBoard);
            Logger.info("DragOptionsContainer:generateMultipleConfigs:", "提取到的空隙形状:", {
                boardBlock: CompBoard.blockNodes.map((row) => row.map((cell) => (cell ? 1 : 0))),
                boardBlockCount,
                forbidSingleCellByDensity: boardBlockCount > SINGLE_CELL_MAX_BOARD_BLOCKS,
                allShapesCount: allShapes.length,
                allShapes: JSON.stringify(allShapes),
                closedGapShapesCount: closedGapShapes.length,
                closedGapShapes: JSON.stringify(closedGapShapes),
                allowSingleCellThisBatch,
            });

            if (allShapes.length === 0) {
                // 清盘/超开放盘面：可放置候选里块数²加权 + 池子前若干项（大块区）再加权
                const randomPool = specifiedShapesCache.filter((answer) =>
                    answer.shapes.some((shape) => canShapeBePlaced(shape, CompBoard.blockNodes)),
                );
                const pool = randomPool.length > 0 ? randomPool : specifiedShapesCache;
                while (results.length < count && pool.length > 0) {
                    const answer = pickWeightedRandomAnswerClearBoard(pool, specifiedShapesCache, {
                        excludeSingleCell: shouldExcludeSingleCell(results, allowSingleCellThisBatch, CompBoard),
                    });
                    const blockIndex = GameManager.instance.enableChangeColor
                        ? 1
                        : this.pureBlockIndex || answer.blockIndex || Math.floor(Math.random() * 6) + 1;
                    results.push({ blockIndex, shapes: answer.shapes });
                }
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "allShapes=0，块数²+池前项加权随机出块",
                    JSON.stringify(results.map((r) => answerShapeFingerprint(r as Answer))),
                );
            } else {
                // 一次遍历完成分类：统计每个答案匹配了多少个空隙，并记录是否可放置
                let exactMatchAnswers: Answer[] = []; // 完美匹配空隙的（按命中次数展开，允许重复）
                const c2SecondaryAnswers: Answer[] = []; // 次优先：calcShapesC2 命中但不在 exact 的候选
                const placeableAnswers: Answer[] = []; // 除了完美匹配之外的那些可以放置到空隙位置形状的
                const exactMatchHitCount = new Map<Answer, number>();
                const canPlaceMap = new Map<Answer, boolean>();

                for (const answer of specifiedShapesCache) {
                    let hits = 0;
                    for (const normalShape of closedGapShapes) {
                        // 棋盘 >16 块时不把「1 格完美空隙」计入命中，避免单格块被 exact 优先选出
                        if (!allowSingleCellThisBatch && countBlocksInShapeMatrix(normalShape) === 1) {
                            continue;
                        }
                        // exactMatchAnswers：只统计“全封闭区域”的完美匹配
                        if (answer.shapes.some((shape) => areShapesSame(shape, normalShape))) {
                            hits++;
                        }
                    }
                    exactMatchHitCount.set(answer, hits);
                    canPlaceMap.set(
                        answer,
                        answer.shapes.some((shape) => canShapeBePlaced(shape, CompBoard.blockNodes)),
                    );
                }

                for (const answer of specifiedShapesCache) {
                    const hits = exactMatchHitCount.get(answer) ?? 0;
                    for (let i = 0; i < hits; i++) {
                        exactMatchAnswers.push(answer);
                    }
                }
                // 按优先级排序，但保留重复项（用于同形状多次命中时可重复出块）
                exactMatchAnswers.sort((a, b) => {
                    const hitDiff = (exactMatchHitCount.get(b) ?? 0) - (exactMatchHitCount.get(a) ?? 0);
                    if (hitDiff !== 0) return hitDiff;
                    const blockDiff = maxBlockCountOfAnswer(a) - maxBlockCountOfAnswer(b);
                    if (blockDiff !== 0) return blockDiff;
                    return specifiedShapesCache.indexOf(a) - specifiedShapesCache.indexOf(b);
                });
                if (!allowSingleCellThisBatch) {
                    exactMatchAnswers = exactMatchAnswers.filter((a) => !isSingleCellAnswer(a));
                }
                exactMatchAnswersForEnsure = exactMatchAnswers;
                for (const normalShape of allShapes) {
                    for (const answer of specifiedShapesCache) {
                        if (exactMatchAnswers.includes(answer)) continue;
                        if (answer.shapes.some((shape) => areShapesSame(shape, normalShape))) {
                            c2SecondaryAnswers.push(answer);
                            break;
                        }
                    }
                }
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "完美匹配空隙的形状:",
                    JSON.stringify(exactMatchAnswers),
                );
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "完美匹配指纹:",
                    JSON.stringify(
                        exactMatchAnswers.map((a, i) => ({
                            idx: i,
                            blockIndex: a.blockIndex,
                            fp: answerShapeFingerprint(a),
                            hits: exactMatchHitCount.get(a) ?? 0,
                        })),
                    ),
                );

                // 遍历剩余的形状，检查是否可以放置
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "C2次优先候选指纹:",
                    JSON.stringify(
                        c2SecondaryAnswers.map((a, i) => ({
                            idx: i,
                            blockIndex: a.blockIndex,
                            fp: answerShapeFingerprint(a),
                        })),
                    ),
                );
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "specifiedShapesCache:",
                    JSON.stringify(specifiedShapesCache),
                );
                // 筛选其它可以放置的形状（允许重复，不去重）
                for (const answer of specifiedShapesCache) {
                    if (canPlaceMap.get(answer)) {
                        if (!answer.shapes) {
                            Logger.info(
                                "DragOptionsContainer:generateMultipleConfigs:",
                                "push了一个空对象!",
                                JSON.stringify(answer),
                            );
                        }
                        placeableAnswers.push(answer);
                    }
                }
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "exactMatchAnswers:",
                    JSON.stringify(exactMatchAnswers),
                );
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "placeableAnswers:",
                    JSON.stringify(placeableAnswers),
                );
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "可放候选指纹:",
                    JSON.stringify(
                        placeableAnswers.map((a, i) => ({
                            idx: i,
                            blockIndex: a.blockIndex,
                            fp: answerShapeFingerprint(a),
                        })),
                    ),
                );

                Logger.info("DragOptionsContainer:generateMultipleConfigs:", "形状分类:", {
                    normalMatchingCount: exactMatchAnswers.length,
                    c2SecondaryCount: c2SecondaryAnswers.length,
                    placeableCount: placeableAnswers.length,
                });

                // 2.模拟摆放阶段
                // 第一优先：选择匹配空隙的形状（按顺序），同时模拟放置确保后续形状仍可放
                // 用布尔数组模拟棋盘占用（true=已占用），避免依赖 Node 引用
                const simulateBoard: boolean[][] = CompBoard.blockNodes.map((row) => row.map((cell) => !!cell));

                const uniqueBase: Answer[] = [...exactMatchAnswers, ...c2SecondaryAnswers, ...placeableAnswers];
                Logger.info("DragOptionsContainer:generateMultipleConfigs:", "uniqueBase:", JSON.stringify(uniqueBase));
                const filteredBase = this.prefilterCandidatesByCheapScore(
                    uniqueBase,
                    simulateBoard,
                    specifiedShapesCache,
                    [...exactMatchAnswers, ...c2SecondaryAnswers],
                );
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "cheapPreFilter:",
                    JSON.stringify({
                        before: uniqueBase.length,
                        after: filteredBase.length,
                        topN: this.cheapPreFilterTopN,
                    }),
                );
                Logger.info(
                    "DragOptionsContainer:generateMultipleConfigs:",
                    "cheapPreFilter指纹:",
                    JSON.stringify({
                        kept: filteredBase.map((a) => answerShapeFingerprint(a)),
                        dropped: uniqueBase
                            .filter((a) => !filteredBase.includes(a))
                            .map((a) => answerShapeFingerprint(a)),
                    }),
                );
                const shuffle = (arr: Answer[]) => {
                    for (let i = arr.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                    return arr;
                };
                // 顺序模式最多持续多少轮；超过这个轮次后可自动切到随机模式
                const limit = this.switchToShuffleSpecifiedShapesAfterNRounds;
                // 当 limit > 0 且已完成的顺序轮次数达到阈值时，自动启用随机模式
                const autoShuffle = limit > 0 && this._specifiedShapesSequentialRoundsCompleted >= limit;
                // 只要“配置要求随机”或“达到自动切随机条件”任一成立，本轮就按随机模式出题
                const useShuffle = this.shuffleSpecifiedShapesInBatch || autoShuffle;
                const priority = new Map<Answer, number>();
                exactMatchAnswers.forEach((a) => priority.set(a, 0));
                c2SecondaryAnswers.forEach((a) => {
                    if (!priority.has(a)) priority.set(a, 1);
                });
                // 同形状出块上限：默认 1；若来自 exact 命中，则允许重复到 hits 上限
                const exactShapeCap = new Map<string, number>();
                for (const answer of specifiedShapesCache) {
                    const hits = exactMatchHitCount.get(answer) ?? 0;
                    if (hits <= 0) continue;
                    const fp = answerShapeFingerprint(answer);
                    exactShapeCap.set(fp, (exactShapeCap.get(fp) ?? 0) + hits);
                }
                const selectedShapeCount = new Map<string, number>();
                for (const r of results) {
                    const fp = answerShapeFingerprint(r as Answer);
                    selectedShapeCount.set(fp, (selectedShapeCount.get(fp) ?? 0) + 1);
                }
                // 如果本轮不随机，则把候选答案按 specifiedShapesCache 中的原始顺序排好
                if (!useShuffle) {
                    filteredBase.sort(
                        // 层级：exact(0) > c2Secondary(1) > 其它可放置(2)，同层再按 cache 下标
                        (a, b) =>
                            (priority.get(a) ?? 2) - (priority.get(b) ?? 2) ||
                            specifiedShapesCache.indexOf(a) - specifiedShapesCache.indexOf(b),
                    );
                }

                while (results.length < count) {
                    // 每轮选“优先级最高 + 补列得分最高”的可放置候选，避免随机抽到低优先项
                    let best: {
                        answer: Answer;
                        placed: [number, number];
                        shape: number[][];
                        p: number;
                        score: number;
                    } | null = null;
                    const candidatesThisRound = useShuffle ? shuffle([...filteredBase]) : filteredBase;
                    for (const answer of candidatesThisRound) {
                        if (
                            shouldExcludeSingleCell(results, allowSingleCellThisBatch, CompBoard) &&
                            isSingleCellAnswer(answer)
                        ) {
                            continue;
                        }
                        const fp = answerShapeFingerprint(answer);
                        const used = selectedShapeCount.get(fp) ?? 0;
                        const cap = exactShapeCap.get(fp) ?? 1;
                        if (used >= cap) continue;
                        const bestPlacement = this.findBestPlacementForAnswer(answer, simulateBoard);
                        if (!bestPlacement) continue;
                        const p = priority.get(answer) ?? 2;
                        const score = bestPlacement.score;
                        if (!best || p < best.p || (p === best.p && score > best.score)) {
                            best = {
                                answer,
                                placed: bestPlacement.placed,
                                shape: bestPlacement.shape,
                                p,
                                score,
                            };
                            if (p === 0 && score >= 220) break;
                        }
                    }
                    if (!best) break; // 棋盘已无法继续放置，退出让兜底逻辑处理
                    Logger.info(
                        "DragOptionsContainer:generateMultipleConfigs:",
                        "bestPick:",
                        JSON.stringify({
                            p: best.p,
                            score: best.score,
                            row: best.placed[0],
                            col: best.placed[1],
                            fp: answerShapeFingerprint(best.answer),
                        }),
                    );
                    this.applySimulatePlace(best.shape, best.placed[0], best.placed[1], simulateBoard);
                    const cleared = this.clearCompletedLines(simulateBoard);
                    for (let row = 0; row < 8; row++) {
                        for (let col = 0; col < 8; col++) {
                            simulateBoard[row][col] = cleared[row][col];
                        }
                    }
                    const blockIndex = GameManager.instance.enableChangeColor
                        ? 1
                        : this.pureBlockIndex || best.answer.blockIndex || Math.floor(Math.random() * 6) + 1;
                    results.push({ blockIndex, shapes: best.answer.shapes });
                    const chosenFp = answerShapeFingerprint(best.answer);
                    selectedShapeCount.set(chosenFp, (selectedShapeCount.get(chosenFp) ?? 0) + 1);
                }

                if (filteredBase.length > 0 && !useShuffle) {
                    this._specifiedShapesSequentialRoundsCompleted++;
                }

                Logger.info("DragOptionsContainer:generateMultipleConfigs:", `从池中共生成了 ${results.length} 个配置`);
            }
        }

        resultsLengthAfterPool = results.length;

        // 如果数量不够，用空位生成逻辑补充
        while (results.length < count) {
            const config = this.generateConfigByEmptySpace(
                specifiedShapesCache,
                shouldExcludeSingleCell(results, allowSingleCellThisBatch, CompBoard),
            );
            results.push(config);
        }

        // 代码保证：尽量塞入完美匹配候选（最多 count 个），不足部分保留现有生成结果。
        this._ensureNormalMatchingRepresentedInResults(
            results,
            exactMatchAnswersForEnsure,
            count,
            resultsLengthAfterPool,
            allowSingleCellThisBatch,
        );
        Logger.info("DragOptionsContainer:generateMultipleConfigs:", "生成的配置:", JSON.stringify(results));
        Logger.info(
            "DragOptionsContainer:generateMultipleConfigs:",
            "最终结果指纹:",
            JSON.stringify(
                results.map((r) => ({
                    blockIndex: r.blockIndex,
                    fp: answerShapeFingerprint(r as Answer),
                })),
            ),
        );

        // 如果宝石配置不为空，则需要往shape随机塞入一个宝石配置，且去掉shapes同级的blockIndex
        const gemConfig = GameManager.instance.gemConfig;
        if (gemConfig.length > 0) {
            // 优先选 destiScore > 0 的宝石，全都为 0 时才退化到全部候选
            const activeGems = gemConfig.filter((g) => g.destiScore > 0);
            const gemPool = activeGems.length > 0 ? activeGems : gemConfig;
            const gemCountOfEachOption = gameLevelConfigs[GameManager.instance.gameLevel].gemCountOfEachOption;

            // 处理每个选项中宝石的数量
            results.forEach((item) => {
                // 深拷贝 shapes，避免污染 specifiedShapesCache 原始数据
                item.shapes = item.shapes.map((s) => s.map((row) => [...row]));
                const shape = item.shapes[Math.floor(Math.random() * item.shapes.length)];

                // 抹去item的blockIndex
                for (let i = 0; i < shape.length; i++) {
                    for (let j = 0; j < shape[i].length; j++) {
                        if (shape[i][j] !== 0) {
                            shape[i][j] = item.blockIndex; //> 3 ? 1 : 2;
                        }
                    }
                }
                item.blockIndex = undefined;
                // 收集非0的索引，因为并不是每个位置都有block; 允许random值重复，毕竟gemCountOfEachOption是最大值，所以允许有重复
                for (let i = 0; i < gemCountOfEachOption; i++) {
                    const randomRow = Math.floor(Math.random() * shape.length);
                    const rowCfg = shape[randomRow];
                    const unZeroIdx = rowCfg.reduce((acc, curr, idx) => {
                        if (curr !== 0) acc.push(idx);
                        return acc;
                    }, [] as number[]);
                    const randomCol = unZeroIdx[Math.floor(Math.random() * unZeroIdx.length)];
                    shape[randomRow][randomCol] = gemPool[Math.floor(Math.random() * gemPool.length)].blockIdx;
                }
            });
        }
        Logger.info("DragOptionsContainer:generateMultipleConfigs:", "生成的配置2:", JSON.stringify(results));

        // 如果 enableColorfulDragOption 为 true，将每个选项的方块依次赋予 1-7 循环彩色索引
        if (GameManager.instance.enableColorfulDragOption) {
            let colorCounter = 1; // 跨选项连续递增，使三个选项颜色错开
            results.forEach((item) => {
                // 深拷贝 shapes，避免污染原始数据
                item.shapes = item.shapes.map((s) => s.map((row) => [...row]));
                const shape = item.shapes[Math.floor(Math.random() * item.shapes.length)];
                for (let i = 0; i < shape.length; i++) {
                    for (let j = 0; j < shape[i].length; j++) {
                        if (shape[i][j] !== 0) {
                            shape[i][j] = colorCounter;
                            colorCounter = (colorCounter % 7) + 1; // 循环 1-7
                        }
                    }
                }
                item.blockIndex = undefined;
            });
        }
        Logger.info("DragOptionsContainer:generateMultipleConfigs:", "生成的配置3:", JSON.stringify(results));

        this._enforceSingleCellPolicy(results, specifiedShapesCache, allowSingleCellThisBatch);

        return results;
    }

    /**
     * 从棋盘的0，0位置开始变了，尝试这个坐标[sr,sc]是否可以放置这个形状，但不会实际放置，只是模拟一下是否可以放置
     * @param shape 形状
     * @param board 棋盘
     * @returns 如果可以放置，则返回这个坐标[sr,sc]，否则返回 null
     */
    private trySimulatePlace(shape: number[][], board: boolean[][]): [number, number] | null {
        for (let sr = 0; sr < 8; sr++) {
            for (let sc = 0; sc < 8; sc++) {
                let ok = true;
                for (let dr = 0; dr < shape.length && ok; dr++) {
                    for (let dc = 0; dc < shape[dr].length && ok; dc++) {
                        if (shape[dr][dc] !== 0) {
                            const br = sr + dr;
                            const bc = sc + dc;
                            if (br >= 8 || bc >= 8 || board[br][bc]) ok = false;
                        }
                    }
                }
                if (ok) return [sr, sc];
            }
        }
        return null;
    }

    private canPlaceShapeAt(shape: number[][], board: boolean[][], sr: number, sc: number): boolean {
        for (let dr = 0; dr < shape.length; dr++) {
            for (let dc = 0; dc < shape[dr].length; dc++) {
                if (shape[dr][dc] === 0) continue;
                const br = sr + dr;
                const bc = sc + dc;
                if (br >= 8 || bc >= 8 || board[br][bc]) return false;
            }
        }
        return true;
    }

    private findBestPlacementForAnswer(
        answer: Answer,
        board: boolean[][],
    ): { placed: [number, number]; shape: number[][]; score: number } | null {
        let best: { placed: [number, number]; shape: number[][]; score: number } | null = null;
        const endgameMode = this.isEndgameBoard(board);
        for (const shape of answer.shapes) {
            for (let sr = 0; sr < 8; sr++) {
                for (let sc = 0; sc < 8; sc++) {
                    if (!this.canPlaceShapeAt(shape, board, sr, sc)) continue;
                    const score =
                        this.scorePlacedShapeForColumns(shape, sr, sc, board) +
                        (endgameMode ? this.getEndgameShapeBias(shape) : 0);
                    if (!best || score > best.score) {
                        best = { placed: [sr, sc], shape, score };
                    }
                }
            }
        }
        return best;
    }

    /**
     * 应用模拟放置
     * @param shape 形状
     * @param sr 起始行
     * @param sc 起始列
     * @param board 棋盘
     */
    private applySimulatePlace(shape: number[][], sr: number, sc: number, board: boolean[][]): void {
        for (let dr = 0; dr < shape.length; dr++) {
            for (let dc = 0; dc < shape[dr].length; dc++) {
                if (shape[dr][dc] !== 0) board[sr + dr][sc + dc] = true;
            }
        }
    }

    private clearCompletedLines(board: boolean[][]): boolean[][] {
        const nextBoard = board.map((row) => [...row]);
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];

        for (let row = 0; row < 8; row++) {
            if (nextBoard[row].every(Boolean)) rowsToClear.push(row);
        }
        for (let col = 0; col < 8; col++) {
            let full = true;
            for (let row = 0; row < 8; row++) {
                if (!nextBoard[row][col]) {
                    full = false;
                    break;
                }
            }
            if (full) colsToClear.push(col);
        }

        for (const row of rowsToClear) {
            for (let col = 0; col < 8; col++) nextBoard[row][col] = false;
        }
        for (const col of colsToClear) {
            for (let row = 0; row < 8; row++) nextBoard[row][col] = false;
        }

        return nextBoard;
    }

    private getOccupiedBoundingBox(board: boolean[][]): {
        height: number;
        width: number;
        occupiedCount: number;
    } | null {
        let minRow = 8;
        let maxRow = -1;
        let minCol = 8;
        let maxCol = -1;
        let occupiedCount = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (!board[row][col]) continue;
                occupiedCount++;
                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);
                minCol = Math.min(minCol, col);
                maxCol = Math.max(maxCol, col);
            }
        }

        if (occupiedCount === 0) return null;

        return {
            height: maxRow - minRow + 1,
            width: maxCol - minCol + 1,
            occupiedCount,
        };
    }

    private isEndgameBoard(board: boolean[][]): boolean {
        const bbox = this.getOccupiedBoundingBox(board);
        if (!bbox) return false;

        return (
            bbox.occupiedCount <= 14 ||
            ((bbox.height <= 3 || bbox.width <= 3 || bbox.height * bbox.width <= 16) && bbox.occupiedCount <= 18)
        );
    }

    private getEndgameShapeBias(shape: number[][]): number {
        const { height, width, blockCount } = getShapeFootprint(shape);
        if (blockCount === 2 && (width === 2 || height === 2)) return 140;
        if (blockCount === 3 && (width === 3 || height === 3)) return 120;
        if (blockCount === 4 && (width === 4 || height === 4)) return 110;
        if (blockCount === 4 && width === 2 && height === 2) return 105;
        if (blockCount === 3 && width <= 2 && height <= 2) return 90;
        if (blockCount === 4 && width <= 3 && height <= 2) return 45;
        if (blockCount === 4 && width <= 2 && height <= 3) return 45;
        if (blockCount >= 6) return -120;
        if (blockCount === 5) return -70;
        return 0;
    }

    private calcColumnMissing(board: boolean[][]): number[] {
        const missing = Array(8).fill(0);
        for (let col = 0; col < 8; col++) {
            for (let row = 0; row < 8; row++) {
                if (!board[row][col]) missing[col]++;
            }
        }
        return missing;
    }

    private getBestCheapScoreOfAnswer(answer: Answer, board: boolean[][], colMissing: number[]): number {
        let best = Number.NEGATIVE_INFINITY;
        const endgameMode = this.isEndgameBoard(board);
        for (const shape of answer.shapes) {
            const placed = this.trySimulatePlace(shape, board);
            if (!placed) continue;
            const [, sc] = placed;
            const addPerCol = Array(8).fill(0);
            let covered = 0;
            for (let dr = 0; dr < shape.length; dr++) {
                for (let dc = 0; dc < shape[dr].length; dc++) {
                    if (shape[dr][dc] === 0) continue;
                    const col = sc + dc;
                    if (col >= 0 && col < 8) addPerCol[col]++;
                    covered++;
                }
            }
            let score = covered * 4;
            for (let col = 0; col < 8; col++) {
                if (addPerCol[col] === 0) continue;
                const remain = colMissing[col] - addPerCol[col];
                if (remain === 0) score += 220;
                else if (remain === 1) score += 70;
                else if (remain === 2) score += 28;
            }
            if (endgameMode) score += this.getEndgameShapeBias(shape);
            best = Math.max(best, score);
        }
        return best;
    }

    private scorePlacedShapeForColumns(shape: number[][], sr: number, sc: number, board: boolean[][]): number {
        const colMissing = this.calcColumnMissing(board);
        const addPerCol = Array(8).fill(0);
        let covered = 0;
        for (let dr = 0; dr < shape.length; dr++) {
            for (let dc = 0; dc < shape[dr].length; dc++) {
                if (shape[dr][dc] === 0) continue;
                const col = sc + dc;
                const row = sr + dr;
                if (row < 0 || row >= 8 || col < 0 || col >= 8) continue;
                addPerCol[col]++;
                covered++;
            }
        }
        let score = covered * 4;
        for (let col = 0; col < 8; col++) {
            if (addPerCol[col] === 0) continue;
            const remain = colMissing[col] - addPerCol[col];
            if (remain === 0) score += 220;
            else if (remain === 1) score += 70;
            else if (remain === 2) score += 28;
        }
        return score;
    }

    private prefilterCandidatesByCheapScore(
        candidates: Answer[],
        board: boolean[][],
        cacheOrder: Answer[],
        mustKeep: Answer[] = [],
    ): Answer[] {
        const topN = Math.max(1, this.cheapPreFilterTopN);
        if (!this.enableCheapPreFilter || candidates.length <= topN) return candidates;
        const pinned = mustKeep.filter((a) => candidates.includes(a));
        const remain = candidates.filter((a) => !pinned.includes(a));
        const colMissing = this.calcColumnMissing(board);
        const scored = remain.map((answer) => ({
            answer,
            score: this.getBestCheapScoreOfAnswer(answer, board, colMissing),
            order: cacheOrder.indexOf(answer),
        }));
        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.order - b.order;
        });
        const remainSlots = Math.max(0, topN - pinned.length);
        return [...pinned, ...scored.slice(0, remainSlots).map((item) => item.answer)];
    }

    /**
     * 当 normalMatching 非空时，尽量使用完美匹配候选：
     * - 目标数量 = min(count, normalMatching.length)
     * - 优先替换下标 ≥ firstFallbackIndex 的兜底项
     * - 若兜底位不够，再从右往左替换其它非完美项
     * - 仍不足时才覆盖最右侧项
     */
    private _ensureNormalMatchingRepresentedInResults(
        results: Array<{ blockIndex: number; shapes: number[][][] }>,
        normalMatching: Answer[],
        count: number,
        firstFallbackIndex: number,
        allowSingleCellThisBatch: boolean,
    ): void {
        const matchingPool = allowSingleCellThisBatch
            ? normalMatching
            : normalMatching.filter((a) => !isSingleCellAnswer(a));
        if (!matchingPool.length || count <= 0) return;

        const targetPerfectCount = Math.min(count, matchingPool.length);
        const isPerfect = (entry: { blockIndex: number; shapes: number[][][] }) =>
            matchingPool.some((a) => a.shapes === entry.shapes);
        const currentPerfectCount = results.filter(isPerfect).length;
        if (currentPerfectCount >= targetPerfectCount) return;

        const makeEntry = (answer: Answer) => ({
            blockIndex: GameManager.instance.enableChangeColor
                ? 1
                : this.pureBlockIndex || answer.blockIndex || Math.floor(Math.random() * 6) + 1,
            shapes: answer.shapes,
        });

        const replacementIndices: number[] = [];
        const added = new Set<number>();
        const pushIdx = (idx: number) => {
            if (!added.has(idx)) {
                added.add(idx);
                replacementIndices.push(idx);
            }
        };

        // 1) 优先替换兜底区里的非完美项
        for (let i = results.length - 1; i >= firstFallbackIndex; i--) {
            if (i >= 0 && i < results.length && !isPerfect(results[i])) pushIdx(i);
        }
        // 2) 兜底区里的其它项（包括已是完美项，必要时可覆盖）
        for (let i = results.length - 1; i >= firstFallbackIndex; i--) {
            if (i >= 0 && i < results.length) pushIdx(i);
        }
        // 3) 非兜底区里的非完美项
        for (let i = results.length - 1; i >= 0; i--) {
            if (!isPerfect(results[i])) pushIdx(i);
        }
        // 4) 最后兜底：所有位置
        for (let i = results.length - 1; i >= 0; i--) {
            pushIdx(i);
        }

        const needed = targetPerfectCount - currentPerfectCount;
        let placed = 0;
        let nmIdx = 0;
        for (let i = 0; i < replacementIndices.length && placed < needed; i++) {
            const idx = replacementIndices[i];
            let answer: Answer | null = null;
            for (let t = 0; t < matchingPool.length; t++) {
                const cand = matchingPool[(nmIdx + t) % matchingPool.length];
                if (!shouldExcludeSingleCell(results, allowSingleCellThisBatch) || !isSingleCellAnswer(cand)) {
                    answer = cand;
                    nmIdx = (nmIdx + t + 1) % matchingPool.length;
                    break;
                }
            }
            if (!answer) {
                answer =
                    matchingPool.find(
                        (c) => !shouldExcludeSingleCell(results, allowSingleCellThisBatch) || !isSingleCellAnswer(c),
                    ) ?? null;
            }
            if (!answer) continue;
            results[idx] = makeEntry(answer);
            placed++;
        }

        // 极端情况下 results 可能还没补满，允许 append 到 count
        while (placed < needed && results.length < count) {
            let answer: Answer | null = null;
            for (let t = 0; t < matchingPool.length; t++) {
                const cand = matchingPool[(nmIdx + t) % matchingPool.length];
                if (!shouldExcludeSingleCell(results, allowSingleCellThisBatch) || !isSingleCellAnswer(cand)) {
                    answer = cand;
                    nmIdx = (nmIdx + t + 1) % matchingPool.length;
                    break;
                }
            }
            if (!answer) {
                answer =
                    matchingPool.find(
                        (c) => !shouldExcludeSingleCell(results, allowSingleCellThisBatch) || !isSingleCellAnswer(c),
                    ) ?? null;
            }
            if (!answer) break;
            results.push(makeEntry(answer));
            placed++;
        }
    }

    /**
     * 单格块策略：不允许出单格则全部剔除；允许时最多保留 MAX_SINGLE_CELL_PER_BATCH 个。
     */
    private _enforceSingleCellPolicy(results: Answer[], pool: Answer[], allowSingleCell: boolean): void {
        const singleIndices: number[] = [];
        for (let i = 0; i < results.length; i++) {
            if (isSingleCellAnswer(results[i])) {
                singleIndices.push(i);
            }
        }
        if (singleIndices.length === 0) return;

        const maxKeep = allowSingleCell ? MAX_SINGLE_CELL_PER_BATCH : 0;
        if (singleIndices.length <= maxKeep) return;

        const CompBoard = this.boardNode.getComponent(Board);
        for (let k = maxKeep; k < singleIndices.length; k++) {
            const idx = singleIndices[k];
            const replacement = this._pickPlaceableNonSingleCellAnswer(pool, CompBoard);
            if (!replacement) continue;
            results[idx] = {
                blockIndex: GameManager.instance.enableChangeColor
                    ? 1
                    : this.pureBlockIndex || replacement.blockIndex || Math.floor(Math.random() * 6) + 1,
                shapes: replacement.shapes,
            };
        }
    }

    private _pickPlaceableNonSingleCellAnswer(pool: Answer[], CompBoard: Board): Answer | null {
        if (!pool?.length) return null;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (const answer of shuffled) {
            if (isSingleCellAnswer(answer)) continue;
            if (!answer.shapes?.some((shape) => canShapeBePlaced(shape, CompBoard.blockNodes))) continue;
            return answer;
        }
        return null;
    }

    /**
     * 根据当前Board的空隙生成一个DragOption的配置
     * 找到连续的空位置区域，生成一个可以放置的形状配置
     */
    generateConfigByEmptySpace(specifiedShapesCache: Answer[] = [], forbidSingleCell = false) {
        const CompBoard = this.boardNode.getComponent(Board);

        // 如果有指定的形状池，从池中选择可以放置的形状
        if (specifiedShapesCache && specifiedShapesCache.length > 0) {
            // 打乱池子顺序，随机尝试
            const shuffledCache = [...specifiedShapesCache].sort(() => Math.random() - 0.5);

            for (const answer of shuffledCache) {
                if (forbidSingleCell && isSingleCellAnswer(answer)) continue;
                // 检查该形状的所有变体是否至少有一个可以放置
                let hasPlaceableShape = false;
                for (const shape of answer.shapes) {
                    if (canShapeBePlaced(shape, CompBoard.blockNodes)) {
                        hasPlaceableShape = true;
                        break;
                    }
                }

                if (hasPlaceableShape) {
                    Logger.info("DragOptionsContainer:generateConfigByEmptySpace:", "从指定池中选择可放置的形状:", {
                        answer,
                        poolSize: specifiedShapesCache.length,
                    });

                    return {
                        blockIndex:
                            answer.blockIndex ||
                            (this.pureBlockIndex ? this.pureBlockIndex : Math.floor(Math.random() * 6) + 1),
                        shapes: answer.shapes,
                    };
                }
            }

            // 如果池中所有形状都无法放置，记录警告并使用空位生成逻辑
            Logger.warn("DragOptionsContainer:generateConfigByEmptySpace:", "池中所有形状都无法放置，改用空位生成逻辑");
        }

        // 如果没有指定池或池中所有形状都无法放置，使用原有的空位生成逻辑
        Logger.info("DragOptionsContainer:generateConfigByEmptySpace:", "CompBoard.blockNodes:", CompBoard.blockNodes);

        // 收集所有空位置
        const emptySpaces: { row: number; col: number }[] = [];
        for (let row = 0; row < CompBoard.blockNodes.length; row++) {
            for (let col = 0; col < CompBoard.blockNodes[row].length; col++) {
                if (!CompBoard.blockNodes[row][col]) {
                    emptySpaces.push({ row, col });
                }
            }
        }

        if (emptySpaces.length === 0) {
            if (forbidSingleCell && specifiedShapesCache.length > 0) {
                const fallback = this._pickPlaceableNonSingleCellAnswer(specifiedShapesCache, CompBoard);
                if (fallback) {
                    return {
                        blockIndex:
                            fallback.blockIndex ||
                            (this.pureBlockIndex ? this.pureBlockIndex : Math.floor(Math.random() * 6) + 1),
                        shapes: fallback.shapes,
                    };
                }
            }
            // 如果没有空位置，返回一个单点配置
            return {
                blockIndex: this.pureBlockIndex ? this.pureBlockIndex : Math.floor(Math.random() * 6) + 1,
                shapes: [[[1]]],
            };
        }

        // 使用 BFS 找到连续的空位置区域
        const visited = new Set<string>();
        const regions: { row: number; col: number }[][] = [];

        for (const empty of emptySpaces) {
            const key = `${empty.row},${empty.col}`;
            if (visited.has(key)) continue;

            // BFS 找到所有相邻的空位置
            const region: { row: number; col: number }[] = [];
            const queue: { row: number; col: number }[] = [empty];
            visited.add(key);

            while (queue.length > 0) {
                const current = queue.shift()!;
                region.push(current);

                // 检查四个方向：上、下、左、右
                const directions = [
                    { row: -1, col: 0 }, // 上
                    { row: 1, col: 0 }, // 下
                    { row: 0, col: -1 }, // 左
                    { row: 0, col: 1 }, // 右
                ];

                for (const dir of directions) {
                    const newRow = current.row + dir.row;
                    const newCol = current.col + dir.col;
                    const newKey = `${newRow},${newCol}`;

                    if (
                        newRow >= 0 &&
                        newRow < 8 &&
                        newCol >= 0 &&
                        newCol < 8 &&
                        !visited.has(newKey) &&
                        !CompBoard.blockNodes[newRow][newCol]
                    ) {
                        visited.add(newKey);
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }

            if (region.length > 0) {
                regions.push(region);
            }
        }

        // 选择一个合适的区域（优先选择2-4个方块的区域）
        let selectedRegion: { row: number; col: number }[] = [];

        // 优先选择大小在2-4之间的区域
        let suitableRegions = regions.filter((r) => r.length >= 2 && r.length <= 4);
        if (forbidSingleCell) {
            suitableRegions = regions.filter((r) => r.length >= 2);
        }
        if (suitableRegions.length > 0) {
            selectedRegion = suitableRegions[Math.floor(Math.random() * suitableRegions.length)];
        } else {
            // 如果没有合适的，选择最大的区域，但限制在4个方块以内
            const sortedRegions = regions.sort((a, b) => b.length - a.length);
            if (sortedRegions.length > 0) {
                const maxLen = forbidSingleCell ? Math.max(2, sortedRegions[0].length) : sortedRegions[0].length;
                selectedRegion = sortedRegions[0].slice(0, Math.min(4, maxLen));
                if (forbidSingleCell && selectedRegion.length < 2 && regions.some((r) => r.length >= 2)) {
                    selectedRegion = regions.find((r) => r.length >= 2)!.slice(0, 4);
                }
            } else if (!forbidSingleCell) {
                // 如果还是没有，就选择一个空位置（禁止单格时不走 1 格区域）
                selectedRegion = [emptySpaces[0]];
            }
        }

        // 将区域转换为二维矩阵形式
        let shape = convertRegionToMatrix(selectedRegion);

        if (forbidSingleCell && countBlocksInShapeMatrix(shape) === 1) {
            const fallback = this._pickPlaceableNonSingleCellAnswer(specifiedShapesCache, CompBoard);
            if (fallback) {
                return {
                    blockIndex:
                        fallback.blockIndex ||
                        (this.pureBlockIndex ? this.pureBlockIndex : Math.floor(Math.random() * 6) + 1),
                    shapes: fallback.shapes,
                };
            }
            const largerRegion = regions.find((r) => r.length >= 2);
            if (largerRegion) {
                shape = convertRegionToMatrix(largerRegion.slice(0, 4));
            }
        }

        // 随机选择一个颜色索引（1-6）
        const blockIndex = this.pureBlockIndex ? this.pureBlockIndex : Math.floor(Math.random() * 6) + 1;

        Logger.info("DragOptionsContainer:generateConfigByEmptySpace:", "生成的配置:", {
            blockIndex,
            shapes: [shape],
            selectedRegion,
        });

        return {
            blockIndex,
            shapes: [shape],
        };
    }

    /** 按剩余数量计算水平均匀分布的 X（1 个居中，2 个左右对称，n 个等间距） */
    computeOptionLayoutX(count: number, index: number): number {
        const n = Math.max(1, count);
        const spacing = this.optionSpacing;
        const startX = -((n - 1) * spacing) / 2;
        return startX + index * spacing;
    }

    /**
     * 跟手：放置选项 X 后，其余选项向「当前数量下的均匀/居中布局」靠拢
     * 剩 2 → 一次到位水平均分；剩 1 → 居中；剩 3+ → 按 ratio 分步靠拢
     */
    nudgeRemainingOptionsToward(_anchorPos: Vec3, placedOption: Node | null): void {
        if (!this.enableFollowHandNudge) return;

        const stepRatio = Math.max(0, Math.min(1, this.followHandNudgeRatio));
        const duration = Math.max(0, this.followHandNudgeDuration);

        const remaining: Node[] = [];
        for (const child of this.node.children) {
            if (!child?.isValid || child === placedOption) continue;
            if (!child.getComponent(DragOption)) continue;
            remaining.push(child);
        }
        remaining.sort((a, b) => a.position.x - b.position.x);

        const count = remaining.length;
        if (count === 0) return;

        const moveRatio = count <= 2 ? 1 : stepRatio;
        if (moveRatio <= 0) return;

        for (let i = 0; i < count; i++) {
            const target = new Vec3(this.computeOptionLayoutX(count, i), this.baseY, 0);
            remaining[i].getComponent(DragOption)?.nudgeRestToward(target, moveRatio, duration);
        }
    }

    /**
     * 生成新的一轮选项
     */
    generateRound() {
        Logger.info("DragOptionsContainer:generateRound:", JSON.stringify(this.answersConfig));
        this.curOptions = [];
        this.node.removeAllChildren();
        // 清除阴影容器中的所有子节点
        if (this.shadowContainerNode) {
            this.shadowContainerNode.removeAllChildren();
        }
        if (this.answersConfig.length === 0) return;

        let selectedConfigs: Answer[] = [];
        // 按顺序选择配置
        if (this._answerIndex2use >= this.answersConfig.length) {
            // 随机生成3个，其中两个从池子里找，另外一个根据当前Board的空隙生成，以确保有空隙可以放置
            // 根据数组长度随机生成两个索引
            // const indices = getRandomTwoIndices(this.randomCacheConfigs);
            // selectedConfigs.push(this.randomCacheConfigs[indices[0]]);
            // selectedConfigs.push(this.randomCacheConfigs[indices[1]]);
            // const config = this.generateConfigByEmptySpace(specifiedShapesCache);
            const configs = this.generateMultipleConfigs(3);
            selectedConfigs.push(...configs);
            Logger.info("DragOptionsContainer:generateRound:", "selectedConfigs:", JSON.stringify(selectedConfigs));
        } else {
            for (let i = 0; i < this.optionsCount; i++) {
                const config = this.answersConfig[this._answerIndex2use];
                selectedConfigs.push(config);
                this._answerIndex2use++;
            }
            const board = this.boardNode.getComponent(Board);
            const closedGapShapes = this.getClosedGapShapes(board.blockNodes);
            this._enforceSingleCellPolicy(
                selectedConfigs,
                specifiedShapesCache,
                shouldAllowSingleCellThisBatch(closedGapShapes, board),
            );
        }

        const layoutCount = selectedConfigs.length;

        selectedConfigs.forEach((config, index) => {
            if (!this.dragOptionPrefab) return;
            if (!config) return; // 可能有为null的情况，比如经典三关提示页
            const dragOptionNode = instantiate(this.dragOptionPrefab);
            this.curOptions.push(dragOptionNode);
            dragOptionNode.parent = this.node;
            const showDragonBone = dragOptionNode.getChildByName("ShowDragon");
            if (showDragonBone) {
                showDragonBone.getComponent(dragonBones.ArmatureDisplay).playAnimation("suiji2", 1);
            }

            const dragOption = dragOptionNode.getComponent(DragOption);
            if (dragOption) {
                dragOption.config = config;
                Logger.info(
                    "DragOptionsContainer:generateRound:",
                    ">>>>dragOption.config:",
                    JSON.stringify(dragOption.config),
                );
                dragOption.render(new Vec3(this.computeOptionLayoutX(layoutCount, index), this.baseY, 0));
            }
        });
        // 全屏清盘后 skinCfgCounter 已递增，但本批块在 GAME_ALL_ELIMINATE_START 之后才创建，需再刷一次
        this.refreshAllBlocksToCurrentSkin();

        if (GameManager.instance.isFirstGenerate) {
            this.scheduleOnce(() => {
                Logger.info("DragOptionsContainer:generateRound:", "emit GAME_START_TIP");
                eventManager.emit(GameEvent.GAME_START_TIP);
            }, 0);
            GameManager.instance.isFirstGenerate = false;
        }
    }

    /**
     * 检查所有选项是否都无法放置，如果都无法放置则显示 mask 节点
     */
    checkAndShowMask() {
        if (!this.maskNode || this.node.children.length === 0) {
            return;
        }
        const CompBoard = this.boardNode.getComponent(Board);
        // 检查每个选项是否可以在网格中的任意位置放置
        let canPlaceAny = false;
        for (const dragOptionNode of this.node.children) {
            // 遍历所有可能的网格位置
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const curFirstBlockRow = row; // 当前检测位置的首块的行
                    const curFirstBlockCol = col; // 当前检测位置的首块的列
                    const compDragOption = dragOptionNode.getComponent(DragOption);
                    const shape = compDragOption.config.shapes[compDragOption.shapeIndex];
                    if (CompBoard.checkDragOptionCanPlace(curFirstBlockRow, curFirstBlockCol, shape)) {
                        canPlaceAny = true;
                        break;
                    }
                }
                if (canPlaceAny) {
                    break;
                }
            }
            if (canPlaceAny) {
                break;
            }
        }

        // 如果所有选项都无法放置，显示 mask 节点
        if (!canPlaceAny) {
            if (GameManager.instance.enableOnlyFullScreenEliminate) {
                const n = this.node.children.length;
                if (n > 0) {
                    const configs = this.generateMultipleConfigs(n);
                    // 保留各槽位当前本地坐标，只换形状不换位置（例如只剩中间一格时仍居中）
                    this.node.children.forEach((dragOptionNode, index) => {
                        const dragOption = dragOptionNode.getComponent(DragOption);
                        const cfg = configs[index];
                        if (!dragOption || !cfg) return;
                        const pos = dragOptionNode.position.clone();
                        dragOption.applyRescueConfig(pos, cfg as Answer);
                    });
                }
                this.maskNode.active = false;
                return;
            }
            if (GameManager.instance.revivePrefab && GameManager.instance.reviveTimes > 0) {
            } else {
                this.maskNode.active = true;
            }
            // GameManager.instance.playEndPage();
            eventManager.emit(GameEvent.GAME_END);
        } else {
            this.maskNode.active = false;
        }
    }

    onGameWin() {
        // GameManager.instance.playEndPage();
        eventManager.emit(GameEvent.GAME_END);
    }

    changeColor(payload?: { blockIndex: number; systemIndex?: number }) {
        if (!payload || payload.blockIndex === undefined || payload.blockIndex === null) {
            Logger.warn("DragOptionsContainer:changeColor", "收到无效参数，忽略:", payload);
            return;
        }
        const { blockIndex, systemIndex } = payload;
        for (const dragOptionNode of this.node.children) {
            const dragOption = dragOptionNode.getComponent(DragOption);
            if (dragOption) {
                dragOption.changeColor(blockIndex, systemIndex);
            }
        }
    }
}
