import { Answer, GameCustomInfo } from "./../configs/config";
import {
    _decorator,
    Color,
    Component,
    dragonBones,
    find,
    instantiate,
    log,
    Node,
    Prefab,
    sp,
    Sprite,
    tween,
    Tween,
    UITransform,
    Vec3,
} from "cc";

import { BlockSize } from "../configs/config";
import { Board } from "../board/Board";
import { DragOptionsContainer } from "./DragOptionsContainer";
import { DragHandler } from "./DragHandler";
import { GameManager } from "../managers/GameManager";
import { AudioManager } from "../managers/AudioManager";
import { getSkeletonComponent, Tool } from "../utils/tool";
import { disableSpinePremultipliedAlpha } from "../utils/spineCompat";
import { GradientConfig, SkinsManager } from "../configs/Skins/SkinsManager";
import { Logger } from "../utils/logger";
import { SuperBlock } from "./block/SuperBlock";
import { ShaderBlock } from "./block/ShaderBlock";
import { ColorBlock } from "./block/ColorBlock";
import { ObjectPoolManager } from "../managers/ObjectPoolManager";
import { LocalImgToSprite } from "../misc/LocalImgToSprite";
import { PhotoTextureCache } from "../misc/PhotoTextureCache";
import { eventManager, GameEvent } from "../managers/EventManager";
import { applyLineHintShake } from "./lineHintShake";
import { getPreClearSpineMixComp } from "../misc/preClear/PreClearSpineMix/PreClearSpineMixBase";
const { ccclass, property } = _decorator;
/**
 * 拖动选项
 * 1. 需要有内部的俄罗斯方块的布局
 * 2. 拖动选项需要有一个拖动的区域
 * 3. 需要可以设置拖动时俄罗斯方块距离手部的距离，目的防遮挡
 */
@ccclass("DragOption")
export class DragOption extends Component {
    @property({ type: Prefab })
    shadowBlockPrefab: Prefab = null;

    private _blockPrefab: Prefab = null;
    @property({ type: Prefab })
    blockLightPrefab: Prefab = null;

    config: Answer = null;
    shapeIndex = 0;

    optionScale: number = 0.5;

    private shadowBlocks: Node[] = [];
    private hintBlocks: Node[] = [];
    private preClearAniNodes: Node[] = [];
    private _activePreClearHintBlocks = new Set<Node>();
    private _colorCycleFn: (() => void) | null = null;
    private _brightBlocks: { node: Node; originalIdx: number; shakeLineIndex: number }[] = [];
    /** 与 enableLineHintShake 配合，避免每帧重复启动 tween */
    private _lastBrightShakeKey = "";
    private _cycleStep: number = 0;
    private boardNode: Node = null!;
    private _blocks: Node[] = [];
    /** 上一次 hint 的位置+消除结果指纹，相同则跳过 hint 重建 */
    private _lastHintKey: string = "";
    /** 棋盘 hint 上 PreClear 延迟播放：撤回/清 hint 时递增，回调里比对以取消 */
    private _preClearBoardHintWaveToken = 0;
    /** 拖拽选项自身块上 PreClear 延迟播放：同上 */
    private _preClearOptionBlocksWaveToken = 0;
    /** 预消除 hint 占位时暂时隐藏的棋盘块，_clearHints 时恢复 */
    private _hiddenBoardBlocksForHint: Node[] = [];
    // 是否是异色DragOption
    isDifferentColorDragOption: boolean = false;
    // 是否是宝石DragOption
    private _isGemstoneDragOption: boolean = false;
    get isGemstoneDragOption(): boolean {
        for (const block of this._blocks) {
            if (block.getComponent(SuperBlock).blockIndex > 10) {
                this._isGemstoneDragOption = true;
                break;
            }
        }
        return this._isGemstoneDragOption;
    }
    set isGemstoneDragOption(value: boolean) {
        this._isGemstoneDragOption = value;
    }
    // 宝石DragOption的第一个普通方块的blockIndex
    getFirstNormalBlockIndex(): number {
        for (const block of this._blocks) {
            if (block.getComponent(SuperBlock).blockIndex < 10) {
                return block.getComponent(SuperBlock).blockIndex;
            }
        }
        // todo: 这里需要优化，如果宝石DragOption没有普通方块，暂时返回1
        return 1;
    }

    // rePosDeltaY: number = 0; // 重新定位时的Y轴偏移量
    zeroPos: Vec3 = new Vec3(0, 0, 0);
    private optionShadowNode: Node = null!; // 当前 DragOption 的阴影容器节点
    private optionShadowBlocks: Node[] = []; // 当前 DragOption 的阴影 block 节点

    private static readonly OPTION_SHADOW_OFFSET_X = 8;
    private static readonly OPTION_SHADOW_OFFSET_Y = -8;

    protected onLoad(): void {
        Logger.info("DragOption:onLoad");
        this._blockPrefab = GameManager.instance.blockPrefab;
        if (!this._blockPrefab) {
            throw new Error("DragOption:blockPrefab is not set");
        }
        this.boardNode = find("Canvas/Board");
    }

    onDestroy(): void {
        // 清理阴影
        this.destroyShadow();
    }

    render(pos: Vec3) {
        Logger.info("DragOption:render:", "pos:", pos);
        // 设置当前节点的位置
        this.node.setPosition(pos);
        if (!this.config) return;
        const { shapes, blockIndex } = this.config;
        // 先绘制触摸区域
        this.renderTouchArea();

        // 遍历布局，根据布局创建对应的块
        Logger.info("DragOption:render:", "shapes:", JSON.stringify(shapes));
        Logger.info("DragOption:render:", "shapeIndex:", this.shapeIndex);
        const shape = shapes[this.shapeIndex];
        if (!shape) return;
        this._blocks = this.createBlocksByShape(shape, blockIndex);
        this.initIsDifferentColorDragOption();

        this.rePos();
        this.resize();
        this.rescale();

        // 创建阴影
        this.createOptionShadow(pos);
    }

    /**
     * 全屏消除等模式下当前一批形状均不可放时：回收预览块与 DragHandler，换一套必可放配置并重新 render。
     */
    applyRescueConfig(pos: Vec3, config: Answer): void {
        this.clearDragShadow();
        this.destroyShadow();
        for (let i = this.node.children.length - 1; i >= 0; i--) {
            const child = this.node.children[i];
            if (child.getComponent(SuperBlock)) {
                ObjectPoolManager.instance.put("Block", child);
            }
        }
        this._blocks = [];
        const dh = this.node.getComponent(DragHandler);
        if (dh) dh.destroy();
        this.shapeIndex = 0;
        this.config = config;
        this.render(pos);
    }

    initIsDifferentColorDragOption() {
        let tempBlockIndex = null;
        for (const block of this._blocks) {
            const blockIndex = block.getComponent(SuperBlock).blockIndex;
            if (tempBlockIndex === null) {
                tempBlockIndex = blockIndex;
            } else if (tempBlockIndex !== blockIndex) {
                this.isDifferentColorDragOption = true;
                break;
            }
        }
    }
    // 让内部block整体距离DragOption上下距离相同，这样就能保证和其它选项垂直中心对称
    rePos() {
        const { shapes } = this.config;
        const shape = shapes[this.shapeIndex];
        if (!shape || shape.length === 0) return;

        const [centerOffsetRow, centerOffsetCol] = this.getCenterOffsetOfShape(shape);

        const distCol = centerOffsetCol * BlockSize.width;
        const distRow = centerOffsetRow * BlockSize.height;
        // this.rePosDeltaY = offsetY;
        this.node.children.forEach((child) => {
            if (child.getComponent(SuperBlock)) {
                const pos = child.position;
                child.setPosition(pos.x - distCol, pos.y + distRow, pos.z);
            }
        });
    }

    /**
     * 根据布局调整拖动选项的大小，方便拖动
     */
    resize() {
        const { shapes } = this.config;
        const shape = shapes[this.shapeIndex];

        const [minCol, maxCol, minRow, maxRow] = this.getMinMaxOffsetColRowOfShape(shape);

        const touchAreaWidth = BlockSize.width * 5; //(maxCol - minCol + 2.5) * this.blockSize.width;
        const touchAreaHeight = BlockSize.height * 5; // (maxRow - minRow + 3.5) * this.blockSize.height;
        Logger.info("DragOption:resize:", "width:", touchAreaWidth, "height:", touchAreaHeight);
        const uiTransform = this.getComponent(UITransform);
        uiTransform.setContentSize(touchAreaWidth, touchAreaHeight);
    }
    /**
     * 缩放拖动选项，防止交叠，方便展示
     */
    rescale() {
        this.node.scale = new Vec3(this.optionScale, this.optionScale, 1);
    }

    renderTouchArea() {
        // Tool.addColorBG(this.node, new Color(255, 0, 0, 50));

        // 添加拖动功能
        this.node.addComponent(DragHandler);
    }

    createBlocksByShape(
        shape: number[][],
        blockIndex: number,
        targetPos: Vec3 = Vec3.ZERO,
        opacity: number = 255,
        parentNode?: Node,
    ) {
        const blocks: Node[] = [];
        Tool.iterateShape(shape, (offsetRow, offsetCol, specificBlockIndex) => {
            const block = this.createBlock(
                [offsetRow, offsetCol],
                blockIndex || specificBlockIndex,
                targetPos,
                opacity,
                parentNode,
            );
            blocks.push(block);
        });

        return blocks;
    }

    private _getExistingHintBlockAt(boardRow: number, boardCol: number): Node | null {
        const targetPos = this.boardNode.getComponent(Board).getPosByOffset(boardRow, boardCol);
        return (
            this.hintBlocks.find((node) => {
                const pos = node.position;
                return Math.abs(pos.x - targetPos.x) < 1 && Math.abs(pos.y - targetPos.y) < 1;
            }) ?? null
        );
    }

    createBlock(
        offset2First: number[],
        blockIndex: number,
        targetPos: Vec3,
        opacity: number = 255,
        parentNode?: Node,
        isShowLight: boolean = false,
    ) {
        // Logger.warn("DragOption:createBlock:", "offset2First:", offset2First);
        // const block = instantiate(this._blockPrefab);
        const block = ObjectPoolManager.instance.get("Block");
        block.parent = parentNode || this.node;
        // 对象池复用时，Photo 节点状态可能残留，统一重置
        const photoNode = block.getChildByName("Photo");
        if (photoNode) photoNode.active = false;
        const compBlock = block.getComponent(SuperBlock);
        let centerColor: GradientConfig = null;
        if (compBlock) {
            centerColor = compBlock.init(blockIndex);
            [compBlock.offset2FirstBlockRow, compBlock.offset2FirstBlockCol] = offset2First;
            compBlock.setOpacity(opacity);
        }

        const { width: blockWidth, height: blockHeight } = block.getComponent(UITransform);
        const posX = targetPos.x + offset2First[1] * blockWidth;
        const posY = targetPos.y - offset2First[0] * blockHeight;
        // Logger.info("DragOption:createBlock:", "realPos:", posX, posY);
        block.setPosition(new Vec3(posX, posY, 0));
        if (this.blockLightPrefab && isShowLight) {
            const blockLight = instantiate(this.blockLightPrefab);
            blockLight.parent = parentNode || this.node;
            blockLight.setPosition(new Vec3(posX, posY, 0));
            const amartureComponent = blockLight.getComponent(dragonBones.ArmatureDisplay);
            if (amartureComponent) {
                if (centerColor) {
                    amartureComponent.color = new Color().fromHEX(centerColor.gradientStart);
                }
                amartureComponent.once(
                    dragonBones.EventObject.COMPLETE,
                    () => {
                        blockLight.destroy();
                    },
                    this,
                );
                amartureComponent.playAnimation("in", 1);
            }
        }
        return block;
    }

    /**
     * 显示拖拽暗影提示
     * @param blockFirstRow 中心行
     * @param blockFirstCol 中心列
     * @param blockColorIdx 方块类型
     * @param shape 俄罗斯方块形状
     */
    showDragShadow(shape: number[][], blockFirstRow: number, blockFirstCol: number, blockIndex: number): void {
        // 每帧只重建阴影块，不清除 hint
        for (const shadowBlock of this.shadowBlocks) {
            ObjectPoolManager.instance.put("Block", shadowBlock);
        }
        this.shadowBlocks = [];

        const pos = this.boardNode.getComponent(Board).getPosByOffset(blockFirstRow, blockFirstCol);
        this.shadowBlocks = this.createBlocksByShape(shape, blockIndex, pos, 120, this.boardNode);

        if (GameManager.instance.enablePhotoMode && LocalImgToSprite.shouldShowPhotoOnDragOption()) {
            let i = 0;
            Tool.iterateShape(shape, (offsetRow, offsetCol) => {
                const shadowBlock = this.shadowBlocks[i++];
                const row = blockFirstRow + offsetRow;
                const col = blockFirstCol + offsetCol;
                const spriteFrame = PhotoTextureCache.getTileSpriteFrame(row, col);
                const photoNode = shadowBlock?.getChildByName("Photo");
                const photoSprite = photoNode?.getComponent(Sprite);
                if (photoSprite) {
                    photoSprite.spriteFrame = spriteFrame;
                    photoNode.active = !!spriteFrame;
                    if (spriteFrame) shadowBlock.getComponent(ShaderBlock)?.applyPhotoEdges();
                }
            });
        }

        // 只有消除结果（行列组合）变化时才重建 hint / preClearAni / 渐变动画
        const CompBoard = this.boardNode.getComponent(Board);
        const matches = CompBoard.getMatchesAfterPlace(blockFirstRow, blockFirstCol, shape);
        const hintKey = `${blockFirstRow},${blockFirstCol}|${matches.rows.join(",")}|${matches.cols.join(",")}`;
        if (hintKey !== this._lastHintKey) {
            this._lastHintKey = hintKey;
            this._clearHints();
            this.showDragHint(shape, blockFirstRow, blockFirstCol, pos, blockIndex, matches);
        }
    }

    renderOptionPhotos(baseRow: number, baseCol: number): void {
        if (!LocalImgToSprite.shouldShowPhotoOnDragOption()) return;
        for (const block of this._blocks) {
            const compBlock = block.getComponent(SuperBlock);
            if (!compBlock) continue;
            const row = baseRow + (compBlock.offset2FirstBlockRow ?? 0);
            const col = baseCol + (compBlock.offset2FirstBlockCol ?? 0);
            const spriteFrame = PhotoTextureCache.getTileSpriteFrame(row, col);
            const photoNode = block.getChildByName("Photo");
            const photoSprite = photoNode?.getComponent(Sprite);
            if (photoSprite) {
                photoSprite.spriteFrame = spriteFrame;
                photoNode.active = !!spriteFrame;
                if (spriteFrame) block.getComponent(ShaderBlock)?.applyPhotoEdges();
            }
        }
    }

    showDragHint(
        shape: number[][],
        blockFirstRow: number,
        blockFirstCol: number,
        targetPos: Vec3,
        blockIndex: number,
        matches?: { rows: number[]; cols: number[] },
    ): void {
        const CompBoard = this.boardNode.getComponent(Board);
        matches = matches ?? CompBoard.getMatchesAfterPlace(blockFirstRow, blockFirstCol, shape);
        this.showDragHintOfDragOption(matches, blockFirstRow, blockFirstCol, blockIndex);
        Logger.info("DragOption:showDragHint:", "matches:", matches);
        for (const row of matches.rows) {
            this.handleLineHints(shape, row, true, blockFirstRow, blockFirstCol, matches, blockIndex);
        }
        for (const col of matches.cols) {
            this.handleLineHints(shape, col, false, blockFirstRow, blockFirstCol, matches, blockIndex);
        }
    }

    /**
     * 如果col为-1，则表示这一行，row为-1，则表示这一列，且如果是列，动画要旋转90度
     * @param blockFirstRow
     * @param row
     * @param col
     * @param blockIndex
     * @param isSameBlockIndex 是否是异色DragOption
     * @returns
     */
    createPreClearAni(
        blockFirstRow: number,
        blockFirstCol: number,
        row: number,
        col: number,
        blockIndex: number,
        shadowHalf1HintBlockIndex: number,
        shadowHalf2HintBlockIndex: number,
    ) {
        const preClearAniPrefab = GameManager.instance.preClearAniPrefab;
        const uniquePreClearAniPrefab = GameManager.instance.uniquePreClearAniPrefab;

        Logger.info("DragOption:createPreClearAni:", "blockIndex:", blockIndex);

        const CompBoard = this.boardNode.getComponent(Board);
        const isRow = col === -1;
        // 非 photo：hint 格已藏底层棋盘，此处再藏整行阴影格；photo 模式无棋盘 hint，不能藏否则块会“消失”
        if (this.shouldHideBoardBlocksForPreClear()) {
            this._hideBoardBlocksOnClearLine(row, col);
        }

        const stepDelay = 0.05;
        if (uniquePreClearAniPrefab) {
            // 与下方 spine 分支一致：lineIndex = 行消时的列号 / 列消时的行号（0~7）
            for (let lineIndex = 0; lineIndex < 8; lineIndex++) {
                const boardRow = isRow ? row : lineIndex;
                const boardCol = isRow ? lineIndex : col;
                const direction = isRow ? 0 : 1;
                const targetPos = CompBoard.getPosByOffset(boardRow, boardCol);
                const hintBlock = this.hintBlocks.find((node) => {
                    const pos = node.position;
                    return Math.abs(pos.x - targetPos.x) < 1 && Math.abs(pos.y - targetPos.y) < 1;
                });
                if (!hintBlock) continue;

                const uniquePreClearAni = instantiate(uniquePreClearAniPrefab);
                uniquePreClearAni.name = "PreClear";
                uniquePreClearAni.parent = hintBlock;
                uniquePreClearAni.setPosition(new Vec3(0, 0, 0));
                getPreClearSpineMixComp(uniquePreClearAni)?.playPreClearAnimation(blockIndex, lineIndex, direction);
                if (!this.preClearAniNodes.includes(uniquePreClearAni)) {
                    this.preClearAniNodes.push(uniquePreClearAni);
                }
            }
            return;
        }
        if (!preClearAniPrefab) {
            // 不在此处递增：showDragHint 会对多行/多列各调一次 handleLineHints→createPreClearAni，递增会取消上一行的延迟播放
            const boardHintWave = this._preClearBoardHintWaveToken;
            const axisIndices = Array.from({ length: 8 }, (_, index) => index);
            const centerIndex = isRow ? blockFirstCol : blockFirstRow;
            axisIndices.sort((a, b) => {
                const distA = Math.abs(a - centerIndex);
                const distB = Math.abs(b - centerIndex);
                if (distA !== distB) return distA - distB;
                return a - b;
            });

            axisIndices.forEach((lineIndex, order) => {
                const boardRow = isRow ? row : lineIndex;
                const boardCol = isRow ? lineIndex : col;
                const targetPos = CompBoard.getPosByOffset(boardRow, boardCol);
                const hintBlock = this.hintBlocks.find((node) => {
                    const pos = node.position;
                    return Math.abs(pos.x - targetPos.x) < 1 && Math.abs(pos.y - targetPos.y) < 1;
                });
                if (!hintBlock || this._activePreClearHintBlocks.has(hintBlock)) return;
                const preClearNode = hintBlock.getChildByName("PreClear");
                const skeleton = preClearNode?.getComponent(sp.Skeleton);
                disableSpinePremultipliedAlpha(skeleton);
                if (!preClearNode || !skeleton) return;

                const isOdd = (blockIndex ?? 0) % 2 === 1;
                const aniIn = isOdd ? "pink_in" : "yellow_in";
                // const aniOut = isOdd ? "pink_out" : "yellow_out";

                preClearNode.active = false;
                this._activePreClearHintBlocks.add(hintBlock);
                if (!this.preClearAniNodes.includes(preClearNode)) {
                    this.preClearAniNodes.push(preClearNode);
                }
                this.scheduleOnce(() => {
                    if (boardHintWave !== this._preClearBoardHintWaveToken) return;
                    if (!hintBlock?.isValid || !this.hintBlocks.includes(hintBlock)) return;
                    if (!preClearNode.isValid || !skeleton.isValid) return;
                    preClearNode.active = true;
                    skeleton.clearTracks();
                    skeleton.setAnimation(0, aniIn, false);
                    // skeleton.addAnimation(0, aniOut, false, 0);
                }, order * stepDelay);
            });
            return;
        }

        let posCenter: Vec3;
        if (isRow) {
            const posLeft = CompBoard.getPosByOffset(row, 0);
            const posRight = CompBoard.getPosByOffset(row, 7);
            posCenter = new Vec3((posLeft.x + posRight.x) / 2, posLeft.y, 0);
        } else {
            const posTop = CompBoard.getPosByOffset(0, col);
            const posBottom = CompBoard.getPosByOffset(7, col);
            posCenter = new Vec3(posTop.x, (posTop.y + posBottom.y) / 2, 0);
        }

        const aniNode = instantiate(preClearAniPrefab);

        if (GameManager.instance.enablePreClearZIndexTopMode) {
            aniNode.parent = find("Canvas/UI");
        } else {
            aniNode.parent = this.boardNode;
            aniNode.setSiblingIndex(0);
        }
        aniNode.setPosition(posCenter);
        if (!isRow) {
            aniNode.setRotationFromEuler(0, 0, 90);
        }
        aniNode.active = true;
        aniNode.scale = new Vec3(1.13, 1.13, 1);
        aniNode.getComponent(dragonBones.ArmatureDisplay)?.playAnimation("in_2", 0);

        this.preClearAniNodes.push(aniNode);

        if (
            blockIndex === undefined &&
            shadowHalf1HintBlockIndex !== shadowHalf2HintBlockIndex &&
            GameCustomInfo.name !== "BlockBrush"
        )
            return;
        const blockIdx = blockIndex || shadowHalf1HintBlockIndex;
        if (GameManager.instance.enableColorfulPreEliminateAnimation) return;
        if (blockIdx > 10 && GameCustomInfo.name !== "BlockBrush") return;
        const blockIdx4Color = GameCustomInfo.name === "BlockBrush" ? 2 : blockIdx;
        Logger.info("DragOption:createPreClearAni:", "blockIdx4Color:", blockIdx4Color);
        const preClearAniColorConfig = SkinsManager.getInstance().getPreClearAniConfigByBlockIndex(blockIdx4Color);
        Logger.info("DragOption:createPreClearAni:", "preClearAniColorConfig:", JSON.stringify(preClearAniColorConfig));
        if (!preClearAniColorConfig) return;
        const preClearAniColorRGB = new Color().fromHEX(preClearAniColorConfig);
        aniNode.getComponent(dragonBones.ArmatureDisplay).color = preClearAniColorRGB;
    }
    private handleLineHints(
        shape: number[][],
        targetLine: number,
        isRow: boolean,
        blockFirstRow: number,
        blockFirstCol: number,
        matches: { rows: number[]; cols: number[] },
        blockIndex: number,
    ) {
        const pre: number[] = [];
        const post: number[] = [];
        let firstIdx: number = null;
        let lastIdx: number = null;
        for (let k = 0; k < 8; k++) {
            let hasShadow = false;
            Tool.iterateShape(shape, (offsetRow, offsetCol, specificBlockIndex) => {
                const shadowRow = blockFirstRow + offsetRow;
                const shadowCol = blockFirstCol + offsetCol;
                const cond = isRow
                    ? shadowRow === targetLine && shadowCol === k
                    : shadowRow === k && shadowCol === targetLine;
                if (cond) {
                    if (firstIdx === null) {
                        firstIdx = specificBlockIndex;
                    }
                    lastIdx = specificBlockIndex;
                    hasShadow = true;
                }
            });
            const inOtherHints = isRow ? matches.cols.indexOf(k) !== -1 : matches.rows.indexOf(k) !== -1;
            if (hasShadow) {
                continue;
            }
            if (firstIdx === null) {
                pre.push(k);
            } else {
                post.push(k);
            }
        }
        if (!GameManager.instance.enablePhotoMode) {
            for (let pos of pre) {
                const useIdx = this.isGemstoneDragOption ? this.getFirstNormalBlockIndex() : blockIndex || firstIdx;
                Logger.info("DragOption:handleLineHints:", "useIdx:", useIdx);
                const r = isRow ? targetLine : pos;
                const c = isRow ? pos : targetLine;
                let hint = this._getExistingHintBlockAt(r, c);
                if (!hint) {
                    const node = this.boardNode.getComponent(Board).blockNodes[r][c];
                    const idxOnBoard = node?.getComponent(SuperBlock).blockIndex;
                    if (idxOnBoard && idxOnBoard < 10) {
                        hint = this.createBlock(
                            [0, 0],
                            useIdx,
                            this.boardNode.getComponent(Board).getPosByOffset(r, c),
                            255,
                            this.boardNode,
                        );
                    } else {
                        hint = this.createBlock(
                            [0, 0],
                            node.getComponent(SuperBlock).blockIndex,
                            this.boardNode.getComponent(Board).getPosByOffset(r, c),
                            255,
                            this.boardNode,
                        );
                    }
                    this.hintBlocks.push(hint);
                }
                hint.getComponent(ColorBlock)?.applyColorBlockMaterial(pos) ??
                    hint.getComponent(SuperBlock)?.setBright();
                this._hideBoardBlockAt(r, c);
                this._startLineHintShakeIfEnabled(hint, pos);
            }
            for (let pos of post) {
                const useIdx = this.isGemstoneDragOption ? this.getFirstNormalBlockIndex() : blockIndex || lastIdx;
                const r = isRow ? targetLine : pos;
                const c = isRow ? pos : targetLine;
                let hint = this._getExistingHintBlockAt(r, c);
                if (!hint) {
                    const node = this.boardNode.getComponent(Board).blockNodes[r][c];
                    const idxOnBoard = node?.getComponent(SuperBlock).blockIndex;
                    if (idxOnBoard && idxOnBoard < 10) {
                        hint = this.createBlock(
                            [0, 0],
                            useIdx,
                            this.boardNode.getComponent(Board).getPosByOffset(r, c),
                            255,
                            this.boardNode,
                        );
                    } else {
                        hint = this.createBlock(
                            [0, 0],
                            node.getComponent(SuperBlock).blockIndex,
                            this.boardNode.getComponent(Board).getPosByOffset(r, c),
                            255,
                            this.boardNode,
                        );
                    }
                    this.hintBlocks.push(hint);
                }
                hint.getComponent(ColorBlock)?.applyColorBlockMaterial(pos) ??
                    hint.getComponent(SuperBlock)?.setBright();
                this._hideBoardBlockAt(r, c);
                this._startLineHintShakeIfEnabled(hint, pos);
            }
        }

        if (GameManager.instance.enableOnlyFullScreenEliminate) {
            if (!this.boardNode.getComponent(Board).isScreenFull({ shape, blockFirstRow, blockFirstCol })) {
                Logger.info("Board:playClearAnimation:", "屏幕未填满，不播预消除动画");
            } else {
                this.createPreClearAni(
                    blockFirstRow,
                    blockFirstCol,
                    isRow ? targetLine : -1,
                    isRow ? -1 : targetLine,
                    blockIndex,
                    firstIdx,
                    lastIdx,
                );
            }
        } else {
            this.createPreClearAni(
                blockFirstRow,
                blockFirstCol,
                isRow ? targetLine : -1,
                isRow ? -1 : targetLine,
                blockIndex,
                firstIdx,
                lastIdx,
            );
        }

        if (GameManager.instance.enableColorfulPreEliminateAnimation) {
            this._startHintColorCycle();
        }
    }
    /**
     * 显示拖拽提示，用于BlockBrush模式
     * @param matches 匹配的行和列
     * @param blockFirstRow 中心行
     * @param blockFirstCol 中心列
     * @param blockIndex 方块类型
     */
    showDragHintOfDragOption(
        matches: { rows: number[]; cols: number[] },
        blockFirstRow: number,
        blockFirstCol: number,
        blockIndex: number,
    ): void {
        if (GameManager.instance.enablePhotoMode) return;
        // 每帧都可能调用此方法，只更新高亮块列表，不重置已在运行的周期
        const prevBright = this._brightBlocks.slice();
        this._brightBlocks = [];
        const rowBlocks: Node[] = [];
        const colBlocks: Node[] = [];
        const { rows, cols } = matches;
        const clampLine = (v: number) => Math.max(0, Math.min(7, v | 0));
        for (let i = 0; i < rows.length; i++) {
            for (let block of this.node.children) {
                const compBlock = block.getComponent(SuperBlock);
                if (!compBlock) continue;
                if (blockFirstRow + compBlock.offset2FirstBlockRow === rows[i]) {
                    rowBlocks.push(block);
                    // 按该块所在列号上色；有 ColorBlock 组件则应用渐变材质，否则普通高亮
                    const colPos = blockFirstCol + compBlock.offset2FirstBlockCol;
                    block.getComponent(ColorBlock)?.applyColorBlockMaterial(colPos) ?? compBlock.setBright();
                    if (!this._brightBlocks.find((b) => b.node === block)) {
                        // 与 board 行提示一致：沿行波浪相位用棋盘列号 0~7
                        const shakeLineIndex = clampLine(colPos);
                        this._brightBlocks.push({
                            node: block,
                            originalIdx: compBlock.blockIndex,
                            shakeLineIndex,
                        });
                    }
                }
            }
        }
        for (let i = 0; i < cols.length; i++) {
            for (let block of this.node.children) {
                const compBlock = block.getComponent(SuperBlock);
                if (!compBlock) continue;
                if (blockFirstCol + compBlock.offset2FirstBlockCol === cols[i]) {
                    colBlocks.push(block);
                    // 按该块所在行号上色
                    const rowPos = blockFirstRow + compBlock.offset2FirstBlockRow;
                    block.getComponent(ColorBlock)?.applyColorBlockMaterial(rowPos) ?? compBlock.setBright();
                    if (!this._brightBlocks.find((b) => b.node === block)) {
                        // 列匹配：沿列波浪相位用棋盘行号 0~7
                        const shakeLineIndex = clampLine(rowPos);
                        this._brightBlocks.push({
                            node: block,
                            originalIdx: compBlock.blockIndex,
                            shakeLineIndex,
                        });
                    }
                }
            }
        }
        this._stopBrightBlockShakeForRemoved(prevBright);
        const uniqueRowBlocks = rowBlocks.filter((block, index, arr) => arr.indexOf(block) === index);
        const uniqueColBlocks = colBlocks.filter((block, index, arr) => arr.indexOf(block) === index);
        if (uniqueRowBlocks.length > 0 || uniqueColBlocks.length > 0) {
            this._preClearOptionBlocksWaveToken++;
            const optionBlocksWave = this._preClearOptionBlocksWaveToken;
            if (uniqueRowBlocks.length > 0) {
                this._playPreClearOnBlocks(uniqueRowBlocks, blockIndex, 0, true, optionBlocksWave);
            }
            if (uniqueColBlocks.length > 0) {
                this._playPreClearOnBlocks(uniqueColBlocks, blockIndex, 0, false, optionBlocksWave);
            }
        }
        this._syncBrightBlocksLineShake();
        if (GameManager.instance.enableColorfulPreEliminateAnimation) {
            // 仅在周期未启动时才启动，避免每帧重置导致定时器永远触发不了
            if (!this._colorCycleFn) {
                this._startHintColorCycle();
            }
        }
    }

    private _playPreClearOnBlocks(
        blocks: Node[],
        blockIndex: number,
        centerIndex: number,
        isRow: boolean,
        optionBlocksWave: number,
    ): void {
        const sortedBlocks = [...blocks].sort((a, b) => {
            const compA = a.getComponent(SuperBlock);
            const compB = b.getComponent(SuperBlock);
            if (!compA || !compB) return 0;
            const axisA = isRow ? compA.offset2FirstBlockCol : compA.offset2FirstBlockRow;
            const axisB = isRow ? compB.offset2FirstBlockCol : compB.offset2FirstBlockRow;
            const distA = Math.abs(axisA - centerIndex);
            const distB = Math.abs(axisB - centerIndex);
            if (distA !== distB) return distA - distB;
            return axisA - axisB;
        });

        const aniIn = (blockIndex ?? 0) % 2 === 1 ? "pink_in" : "yellow_in";
        const stepDelay = 0.05;
        Logger.info("DragOption:_playPreClearOnBlocks:", "sortedBlocks:", sortedBlocks);
        sortedBlocks.forEach((block, order) => {
            const preClearNode = block.getChildByName("PreClear");
            const skeleton = preClearNode?.getComponent(sp.Skeleton);
            disableSpinePremultipliedAlpha(skeleton);
            if (!preClearNode || !skeleton) return;
            preClearNode.active = false;
            if (!this.preClearAniNodes.includes(preClearNode)) {
                this.preClearAniNodes.push(preClearNode);
            }
            this.scheduleOnce(() => {
                if (optionBlocksWave !== this._preClearOptionBlocksWaveToken) return;
                if (!block?.isValid || block.parent !== this.node) return;
                if (!preClearNode.isValid || !skeleton.isValid) return;
                preClearNode.active = true;
                skeleton.clearTracks();
                skeleton.setAnimation(0, aniIn, false);
            }, order * stepDelay);
        });
    }

    /**
     * 当俄罗斯方块回弹时，要取消对应的提示
     */
    cancelDragHintOfDragOption(): void {
        this._stopHintColorCycle();
        this._lastBrightShakeKey = "";
        for (const { node, originalIdx } of this._brightBlocks) {
            if (!node.isValid) continue;
            Tween.stopAllByTarget(node);
            node.setScale(1, 1, 1);
            node.angle = 0;
            const compBlock = node.getComponent(SuperBlock);
            if (!compBlock) continue;
            // ColorBlock：卸载材质还原默认外观；普通块：重置亮度
            node.getComponent(ColorBlock)?.deleteColorBlockMaterial() ?? compBlock.resetBright();
            compBlock.switchSkin(originalIdx);
        }
        this._brightBlocks = [];
        for (let block of this.node.children) {
            const compBlock = block.getComponent(SuperBlock);
            if (!compBlock) continue;
            compBlock.resetBright();
        }
    }

    /**
     * 清除拖拽暗影和提示
     */
    clearDragShadow(): void {
        // 清除暗影块
        for (const shadowBlock of this.shadowBlocks) {
            // shadowBlock.destroy();
            ObjectPoolManager.instance.put("Block", shadowBlock);
        }
        this.shadowBlocks = [];

        // 清除所有 hint 并重置指纹，下次拖到同一位置也会重建
        this._clearHints();
        this._lastHintKey = "";

        // 清除photo
        if (GameManager.instance.enablePhotoMode) {
            // 回弹时隐藏所有方块的 Photo 子节点，避免残留上次贴图
            for (const block of this.node.children) {
                const photo = block.getChildByName("Photo");
                if (photo) photo.active = false;
            }
        }
    }

    /**
     * 行列 pre/post 提示块动效（受 enableLineHintShake + lineHintShakeStyle 控制）
     * 波浪缩放与同步旋转二选一，实现见 `lineHintShake/` 分包。
     * @param lineIndex 该行或列上的格索引 0~7（与 handleLineHints 里的 pos 一致）
     */
    private _startLineHintShakeIfEnabled(node: Node, lineIndex: number): void {
        if (!GameManager.instance.enableLineHintShake) return;
        applyLineHintShake(node, lineIndex, GameManager.instance.lineHintShakeStyle);
    }

    /** 不再处于高亮列表的拖拽块：停掉 line shake，避免残留 tween */
    private _stopBrightBlockShakeForRemoved(prev: { node: Node }[]): void {
        const keep = new Set(this._brightBlocks.map((b) => b.node));
        for (const { node } of prev) {
            if (keep.has(node) || !node.isValid) continue;
            Tween.stopAllByTarget(node);
            node.setScale(1, 1, 1);
            node.angle = 0;
        }
    }

    /**
     * BlockBrush 下 showDragHintOfDragOption 高亮块与 handleLineHints 使用同一套 lineHintShake（波浪或同步旋转由 GameManager 配置）
     */
    private _syncBrightBlocksLineShake(): void {
        if (!GameManager.instance.enableLineHintShake) {
            this._lastBrightShakeKey = "";
            for (const { node } of this._brightBlocks) {
                if (!node.isValid) continue;
                Tween.stopAllByTarget(node);
                node.setScale(1, 1, 1);
                node.angle = 0;
            }
            return;
        }
        if (this._brightBlocks.length === 0) {
            this._lastBrightShakeKey = "";
            return;
        }
        const key = this._brightBlocks
            .map((b) => `${b.node.uuid}:${b.shakeLineIndex}`)
            .sort()
            .join("|");
        if (key === this._lastBrightShakeKey) return;
        this._lastBrightShakeKey = key;
        for (const { node, shakeLineIndex } of this._brightBlocks) {
            if (!node.isValid) continue;
            this._startLineHintShakeIfEnabled(node, shakeLineIndex);
        }
    }

    /** photo 模式不在棋盘上叠 hint，预消除时不隐藏真实棋盘块 */
    private shouldHideBoardBlocksForPreClear(): boolean {
        return !GameManager.instance.enablePhotoMode;
    }

    /** 预消除行/列上 8 格棋盘块（含未建 hint 的阴影格） */
    private _hideBoardBlocksOnClearLine(lineRow: number, lineCol: number): void {
        const isRow = lineCol === -1;
        const lineIndex = isRow ? lineRow : lineCol;
        if (lineIndex < 0) return;
        for (let i = 0; i < 8; i++) {
            const r = isRow ? lineIndex : i;
            const c = isRow ? i : lineIndex;
            this._hideBoardBlockAt(r, c);
        }
    }

    /** 预消除 hint 叠在同一格时隐藏底层棋盘块，避免挤压/缩放动画露底 */
    private _hideBoardBlockAt(row: number, col: number): void {
        const board = this.boardNode?.getComponent(Board);
        if (!board) return;
        const node = board.blockNodes[row]?.[col];
        if (!node?.isValid || !node.active) return;
        if (this._hiddenBoardBlocksForHint.includes(node)) return;
        this._hiddenBoardBlocksForHint.push(node);
        node.active = false;
    }

    private _restoreBoardBlocksHiddenForHint(): void {
        for (const node of this._hiddenBoardBlocksForHint) {
            if (node?.isValid) node.active = true;
        }
        this._hiddenBoardBlocksForHint = [];
    }

    /** 仅清除 hint 块 / preClearAni / 颜色循环 / 拖拽选项渐变，不触碰阴影块 */
    private _clearHints(): void {
        this._stopHintColorCycle();
        // 先于回池：使 createPreClearAni / _playPreClearOnBlocks 里尚未触发的 scheduleOnce 全部失效
        this._preClearBoardHintWaveToken++;
        this._preClearOptionBlocksWaveToken++;
        this._activePreClearHintBlocks.clear();
        this._restoreBoardBlocksHiddenForHint();
        for (const hintBlock of this.hintBlocks) {
            Tween.stopAllByTarget(hintBlock);
            hintBlock.setScale(1, 1, 1);
            hintBlock.angle = 0;
            hintBlock.getComponent(ColorBlock)?.deleteColorBlockMaterial();
            ObjectPoolManager.instance.put("Block", hintBlock);
        }
        this.hintBlocks = [];

        for (const aniNode of this.preClearAniNodes) {
            if (!aniNode?.isValid) continue;
            // 挂在 Block 上的 PreClearSpineMix 已在 put → prepareBlockForPool 中销毁
            if (getPreClearSpineMixComp(aniNode)) continue;
            const skeleton = getSkeletonComponent(aniNode);
            if (skeleton) {
                skeleton.clearTracks();
                aniNode.active = false;
                continue;
            }
            aniNode.removeFromParent();
            aniNode.destroy();
        }
        this.preClearAniNodes = [];

        // 同时还原拖拽选项自身的块（deleteColorBlockMaterial + resetBright）
        this.cancelDragHintOfDragOption();
    }

    getMinMaxOffsetColRowOfShape(shape: number[][]) {
        let minCol = Number.MAX_VALUE;
        let maxCol = -Number.MAX_VALUE;
        let minRow = Number.MAX_VALUE;
        let maxRow = -Number.MAX_VALUE;

        Tool.iterateShape(shape, (offsetRow, offsetCol) => {
            if (offsetRow < minRow) minRow = offsetRow;
            if (offsetRow > maxRow) maxRow = offsetRow;
            if (offsetCol < minCol) minCol = offsetCol;
            if (offsetCol > maxCol) maxCol = offsetCol;
        });
        return [minCol, maxCol, minRow, maxRow];
    }

    getCenterOffsetOfShape(shape: number[][]) {
        const [minCol, maxCol, minRow, maxRow] = this.getMinMaxOffsetColRowOfShape(shape);
        const centerOffsetCol = (minCol + maxCol) / 2;
        const centerOffsetRow = (minRow + maxRow) / 2;
        return [centerOffsetRow, centerOffsetCol];
    }

    /**
     * 放置拖动选项
     * @param firstBlockRow 中心行
     * @param firstBlockCol 中心列
     * @param shape 俄罗斯方块形状
     */
    placeDragOption(firstBlockRow: number, firstBlockCol: number, shape: number[][]) {
        const CompBoard = this.boardNode.getComponent(Board);
        AudioManager.instance.playPlaceEffect();

        // Logger.info(
        //     "CompBoard.blockNodes:",
        //     CompBoard.blockNodes.map((item) =>
        //         item.map((blockNode) => blockNode?.getComponent(ShaderBlock).colorIdx)
        //     )
        // );

        let blockIndex = null;
        Tool.iterateShape(shape, (offsetRow, offsetCol, specificBlockIndex) => {
            const block = this.createBlock(
                [offsetRow, offsetCol],
                this.config.blockIndex || specificBlockIndex,
                CompBoard.getPosByOffset(firstBlockRow, firstBlockCol),
                255,
                this.boardNode,
                true, // 显示光效
            );
            const blkIdx = block.getComponent(SuperBlock).blockIndex;
            if (blkIdx < 100) {
                blockIndex = blkIdx;
            } else {
                blockIndex = blkIdx - 100;
            }
            const originalBlock = CompBoard.blockNodes[firstBlockRow + offsetRow][firstBlockCol + offsetCol];
            if (originalBlock && originalBlock.getComponent(SuperBlock)) {
                ObjectPoolManager.instance.put("Block", originalBlock);
            }
            if (
                GameManager.instance.enablePhotoMode &&
                LocalImgToSprite.shouldShowPhotoOnDragOption()
            ) {
                const photoNode = block.getChildByName("Photo");
                if (photoNode) {
                    photoNode.active = true;
                    const photoSprite = photoNode.getComponent(Sprite);
                    if (photoSprite) {
                        photoSprite.spriteFrame = PhotoTextureCache.getTileSpriteFrame(
                            firstBlockRow + offsetRow,
                            firstBlockCol + offsetCol,
                        );
                        block.getComponent(ShaderBlock)?.applyPhotoEdges();
                    }
                }
            }
            CompBoard.blockNodes[firstBlockRow + offsetRow][firstBlockCol + offsetCol] = block;
        });
        // if (GameCustomInfo.name === "BlockBrush" && !GameManager.instance.enableEliminateAnimationByConfig) {
        if (GameManager.instance.pureBlockIndex > 0) {
            // blockIndex = 2; // BlockBrush模式下，blockIndex为skin_Brush0的第2个黄色方块
            blockIndex = GameManager.instance.pureBlockIndex;
        }
        // }

        // log(
        //     "CompBoard.blockNodes:",
        //     CompBoard.blockNodes.map((item) =>
        //         item.map((blockNode) => blockNode?.getComponent(ShaderBlock).colorIdx)
        //     )
        // );
        const blockCount = this.node.children.reduce((acc, child) => {
            if (child.getComponent(SuperBlock)) {
                acc++;
            }
            return acc;
        }, 0);
        log("DragOption:placeDragOption:", "blockCount:", blockCount);
        GameManager.instance.setScoreWithoutClearCount(blockCount);
        if (GameManager.instance.enableOnlyFullScreenEliminate) {
            if (!CompBoard.isScreenFull()) {
                Logger.info("Board:playClearAnimation:", "屏幕未填满，不播放消除动画");
                return;
            } else {
                eventManager.emit(GameEvent.GAME_BORAD_FULL_START);
            }
        }
        CompBoard.checkAndClearLines(blockIndex, firstBlockRow, firstBlockCol, shape, this.node);
    }

    getFirstBlockRowCol() {
        const CompDragOption = this.node.getComponent(DragOption);
        let worldPos = new Vec3(0, 0, 0);
        CompDragOption._blocks.forEach((blockNode) => {
            const CompBlock = blockNode.getComponent(SuperBlock);
            if (CompBlock.isOffset2FirstBlockZero) {
                // log("找到了零偏移块:");
                worldPos = blockNode.worldPosition;
            }
        });

        const CompBoard = this.boardNode.getComponent(Board);
        const localpos = this.boardNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        const rowCol = CompBoard.getOffsetByPos(localpos);
        return rowCol;
    }

    /**
     * 创建 DragOption 的阴影（在阴影容器中）
     */
    private createOptionShadow(pos: Vec3) {
        const container = this.node.parent.getComponent(DragOptionsContainer);
        if (!container || !container.shadowContainerNode) {
            return;
        }

        // 创建阴影容器节点（用于当前 DragOption 的阴影）
        this.optionShadowNode = new Node(`Shadow_${this.node.name || this.node.uuid}`);
        this.optionShadowNode.parent = container.shadowContainerNode;

        // 添加偏移量，让阴影更明显（向右下方偏移）
        this.optionShadowNode.setPosition(
            pos.x + DragOption.OPTION_SHADOW_OFFSET_X,
            pos.y + DragOption.OPTION_SHADOW_OFFSET_Y,
            pos.z,
        );
        this.optionShadowNode.setScale(this.optionScale, this.optionScale, 1); // 与 DragOption 相同的缩放

        // 创建阴影 block
        const { shapes, blockIndex } = this.config;
        this.optionShadowBlocks = this.createShadowBlocks(shapes[this.shapeIndex]);

        // 应用与 DragOption 相同的 rePos 逻辑
        this.rePosShadow();
    }

    /**
     * 创建阴影 block
     */
    private createShadowBlocks(shape: number[][]): Node[] {
        const blocks: Node[] = [];
        Tool.iterateShape(shape, (offsetRow, offsetCol) => {
            const block = instantiate(this.shadowBlockPrefab);
            block.parent = this.optionShadowNode;

            // 设置阴影效果：降低透明度，并设置为深色（灰色/黑色）
            const sprite = block.getComponent(Sprite);
            if (sprite) {
                // 设置阴影颜色为深灰色，降低透明度
                sprite.color = new Color(0, 0, 0, 80); // 黑色，透明度 120
            }

            const uiTransform = block.getComponent(UITransform);
            uiTransform.setContentSize(BlockSize.width, BlockSize.height);

            const posX = offsetCol * BlockSize.width;
            const posY = -offsetRow * BlockSize.height;
            block.setPosition(new Vec3(posX, posY, 0));
            blocks.push(block);
        });

        return blocks;
    }

    /**
     * 对阴影 block 应用与 DragOption 相同的 rePos 逻辑
     */
    private rePosShadow() {
        const { shapes } = this.config;
        const shape = shapes[this.shapeIndex];
        if (!shape || shape.length === 0 || !this.optionShadowNode) return;

        const [centerOffsetRow, centerOffsetCol] = this.getCenterOffsetOfShape(shape);
        const offsetCol = centerOffsetCol * BlockSize.width;
        const offsetRow = centerOffsetRow * BlockSize.height;

        this.optionShadowNode.children.forEach((child) => {
            const pos = child.position;
            child.setPosition(pos.x - offsetCol, pos.y + offsetRow, pos.z);
        });
    }

    /** 跟手：将托盘选项（及阴影）向目标位移动 ratio 比例的距离（ratio=1 即一次到位） */
    nudgeRestToward(target: Vec3, ratio: number, duration: number): void {
        const moveToward = (node: Node, target: Vec3): void => {
            if (!node?.isValid) return;
            Tween.stopAllByTarget(node);
            const p = node.position;
            const next = new Vec3(
                p.x + (target.x - p.x) * ratio,
                p.y + (target.y - p.y) * ratio,
                p.z,
            );
            if (duration <= 0) {
                node.setPosition(next);
                return;
            }
            tween(node).to(duration, { position: next }, { easing: "sineOut" }).start();
        };

        moveToward(this.node, target);
        if (this.optionShadowNode?.isValid) {
            moveToward(
                this.optionShadowNode,
                new Vec3(
                    target.x + DragOption.OPTION_SHADOW_OFFSET_X,
                    target.y + DragOption.OPTION_SHADOW_OFFSET_Y,
                    target.z,
                ),
            );
        }
    }

    /**
     * 隐藏阴影
     */
    hideShadow() {
        if (this.optionShadowNode) {
            this.optionShadowNode.active = false;
        }
    }

    /**
     * 显示阴影
     */
    showShadow() {
        if (this.optionShadowNode) {
            this.optionShadowNode.active = true;
        }
    }

    /**
     * 销毁阴影
     */
    destroyShadow() {
        if (this.optionShadowNode) {
            this.optionShadowNode.destroy();
            this.optionShadowNode = null!;
            this.optionShadowBlocks = [];
        }
    }

    changeColor(blockIndex: number, systemIndex?: number) {
        for (const block of this._blocks) {
            block.getComponent(SuperBlock).switchSkin(blockIndex, systemIndex);
        }
    }

    private _startHintColorCycle(interval: number = 0.15) {
        this._stopHintColorCycle();
        if (this.hintBlocks.length === 0 && this._brightBlocks.length === 0) return;
        this._cycleStep = 0;
        this._colorCycleFn = () => {
            this._cycleStep++;
            for (let i = 0; i < this.hintBlocks.length; i++) {
                const hint = this.hintBlocks[i];
                if (!hint.isValid) continue;
                const colorIdx = ((this._cycleStep + i) % 7) + 1;
                const comp = hint.getComponent(SuperBlock);
                comp?.switchSkin(colorIdx);
                comp?.setBright();
            }
            for (let i = 0; i < this._brightBlocks.length; i++) {
                const { node } = this._brightBlocks[i];
                if (!node.isValid) continue;
                const colorIdx = ((this._cycleStep + i) % 7) + 1;
                const comp = node.getComponent(SuperBlock);
                comp?.switchSkin(colorIdx);
                comp?.setBright();
            }
        };
        this.schedule(this._colorCycleFn, interval);
    }

    private _stopHintColorCycle() {
        if (this._colorCycleFn) {
            this.unschedule(this._colorCycleFn);
            this._colorCycleFn = null;
        }
    }
}
