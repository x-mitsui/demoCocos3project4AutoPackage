import {
    _decorator,
    Color,
    Component,
    dragonBones,
    instantiate,
    log,
    Node,
    Prefab,
    Sprite,
    UITransform,
    Vec3,
} from "cc";
import { DragOptionConfig } from "../types";
import { BlockSize, GameCustomInfo } from "../configs/config";
import { Board } from "../board/Board";
import { DragOptionsContainer } from "./DragOptionsContainer";
import { DragHandler } from "./DragHandler";
import { Block } from "./Block";
import { GameManager } from "../managers/GameManager";
import { AudioManager } from "../managers/AudioManager";
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
    blockPrefab: Prefab = null;

    @property({ type: DragOptionConfig })
    config: DragOptionConfig = new DragOptionConfig();

    private blockSize: { width: number; height: number } = {
        width: 0,
        height: 0,
    };
    private shadowBlocks: Node[] = [];
    private hintBlocks: Node[] = [];
    private boardNode: Node = null!;
    private _blocks: Node[] = [];
    // rePosDeltaY: number = 0; // 重新定位时的Y轴偏移量
    zeroPos: Vec3 = new Vec3(0, 0, 0);
    private optionShadowNode: Node = null!; // 当前 DragOption 的阴影容器节点
    private optionShadowBlocks: Node[] = []; // 当前 DragOption 的阴影 block 节点

    protected onLoad(): void {
        log("DragOption onLoad");
        this.blockSize = BlockSize;
        this.boardNode =
            this.node.parent.getComponent(DragOptionsContainer).boardNode;
    }

    onDestroy(): void {
        // 清理阴影
        this.destroyShadow();
    }

    render(pos: Vec3) {
        log("DragOption render pos:", pos);
        // 设置当前节点的位置
        this.node.setPosition(pos);
        const { shape, blockColorIdx } = this.config;
        // 先绘制触摸区域
        this.renderTouchArea();

        // 遍历布局，根据布局创建对应的块
        this._blocks = this.createBlocksByShape(shape, blockColorIdx);

        this.rePos();
        this.resize();
        this.rescale();

        // 创建阴影
        this.createOptionShadow(pos);
    }
    // 让内部block整体距离DragOption上下距离相同，这样就能保证和其它选项垂直中心对称
    rePos() {
        const { shape } = this.config;
        if (!shape || shape.length === 0) return;

        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        shape.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        const centerRow = (minY + maxY) / 2;
        const centerCol = (minX + maxX) / 2;

        const offsetX = -centerCol * this.blockSize.width;
        const offsetY = -centerRow * this.blockSize.height;
        // this.rePosDeltaY = offsetY;

        this.node.children.forEach((child) => {
            if (child.getComponent(Block)) {
                const pos = child.position;
                child.setPosition(pos.x + offsetX, pos.y + offsetY, pos.z);
            }
        });
    }

    /**
     * 根据布局调整拖动选项的大小，方便拖动
     */
    resize() {
        const { shape } = this.config;

        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        shape.forEach((p) => {
            const [x, y] = p;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        const touchAreaWidth = (maxX - minX + 2) * this.blockSize.width;
        const touchAreaHeight = (maxY - minY + 3) * this.blockSize.height;
        log("width:", touchAreaWidth, "height:", touchAreaHeight);
        const uiTransform = this.getComponent(UITransform);
        uiTransform.setContentSize(touchAreaWidth, touchAreaHeight);
    }
    /**
     * 缩放拖动选项，防止交叠，方便展示
     */
    rescale() {
        this.node.scale = new Vec3(0.5, 0.5, 1);
    }

    renderTouchArea() {
        // Tool.addColorBG(this.node, new Color(255, 0, 0, 50));

        // 添加拖动功能
        this.node.addComponent(DragHandler);
    }

    createBlocksByShape(
        shape: [number, number][],
        blockColorIdx: number,
        targetPos: Vec3 = Vec3.ZERO,
        opacity: number = 255,
        parentNode?: Node
    ) {
        const blocks: Node[] = [];
        shape.forEach((offset2Center) => {
            const block = this.createBlock(
                offset2Center,
                blockColorIdx,
                targetPos,
                opacity,
                parentNode
            );
            blocks.push(block);
        });
        return blocks;
    }

    createBlock(
        offset2Center: [number, number],
        blockColorIdx: number,
        targetPos: Vec3,
        opacity: number = 255,
        parentNode?: Node
    ) {
        // log("createBlock offset2Center:", offset2Center);
        const block = instantiate(this.blockPrefab);
        block.parent = parentNode || this.node;
        const compBlock = block.getComponent(Block);
        if (compBlock) {
            compBlock.init(blockColorIdx);
            compBlock.initShapeOffset2Center(offset2Center);
            compBlock.setOpacity(opacity);
            if (offset2Center[0] === 0 && offset2Center[1] === 0) {
                compBlock.isOffsetZero = true;
            }
        }

        const { width: blockWidth, height: blockHeight } =
            block.getComponent(UITransform);
        const posX = targetPos.x + offset2Center[0] * blockWidth;
        const posY = targetPos.y + offset2Center[1] * blockHeight;
        // log("createBlock realPos:", posX, posY);
        block.setPosition(new Vec3(posX, posY, 0));
        return block;
    }

    /**
     * 显示拖拽暗影提示
     * @param blockZeroRow DragOption的Zero块所在的行
     * @param blockZeroCol DragOption的Zero块所在的列
     * @param blockColorIdx 方块类型
     * @param shape 俄罗斯方块形状
     */
    showDragShadow(
        shape: [number, number][],
        blockZeroRow: number,
        blockZeroCol: number,
        blockColorIdx: number
    ): void {
        // 先清除之前的暗影和提示
        this.clearDragShadow();
        // 为每个形状位置创建暗影方块
        const pos = this.boardNode
            .getComponent(Board)
            .getPosByOffset(blockZeroRow, blockZeroCol);
        this.shadowBlocks = this.createBlocksByShape(
            shape,
            blockColorIdx,
            pos,
            120,
            this.boardNode
        );
        this.showDragHint(
            shape,
            blockZeroRow,
            blockZeroCol,
            pos,
            blockColorIdx
        );
    }

    showDragHint(
        shape: [number, number][],
        blockZeroRow: number,
        blockZeroCol: number,
        targetPos: Vec3,
        blockColorIdx: number
    ): void {
        if (GameCustomInfo.name === "BlockBrush") {
            blockColorIdx = 5;
        }
        // 先清除之前的提示
        // this.clearDragHint();
        const CompBoard = this.boardNode.getComponent(Board);
        const matches = CompBoard.getMatchesAfterPlace(
            blockZeroRow,
            blockZeroCol,
            shape
        );
        log("matches:", matches);
        const { color2changeOffsetXs, color2changeOffsetYs } = matches;
        for (let i = 0; i < color2changeOffsetXs.length; i++) {
            for (let block of this.node.children) {
                const compBlock = block.getComponent(Block);
                if (
                    compBlock.shapeOffset2Center[0] === color2changeOffsetXs[i]
                ) {
                    compBlock.init(5);
                }
            }
        }
        for (let i = 0; i < color2changeOffsetYs.length; i++) {
            for (let block of this.node.children) {
                const compBlock = block.getComponent(Block);
                if (
                    compBlock.shapeOffset2Center[1] === color2changeOffsetYs[i]
                ) {
                    compBlock.init(5);
                }
            }
        }
        // 为可以消除的行显示提示块
        for (const row of matches.rows) {
            for (let j = 0; j < 8; j++) {
                // 检查这个位置是否已经有暗影块（避免重复显示）
                const hasShadow = shape.some(([offsetX, offsetY]) => {
                    const shadowRow = blockZeroRow - offsetY;
                    const shadowCol = blockZeroCol + offsetX;
                    return shadowRow === row && shadowCol === j;
                });

                // 如果这个位置已经有暗影块，跳过（避免重复）
                if (hasShadow) {
                    continue;
                }

                // 创建提示块
                const hintBlock = this.createBlock(
                    [0, 0],
                    blockColorIdx,
                    this.boardNode.getComponent(Board).getPosByOffset(row, j),
                    255,
                    this.boardNode
                );
                // hintBlock.setPosition(CompBoard.getPosByOffset(row, j));

                this.hintBlocks.push(hintBlock);
            }
        }
        for (const col of matches.cols) {
            for (let i = 0; i < 8; i++) {
                // 检查这个位置是否已经有暗影块（避免重复显示）
                const hasShadow = shape.some(([offsetX, offsetY]) => {
                    const shadowRow = blockZeroRow - offsetY;
                    const shadowCol = blockZeroCol + offsetX;
                    return shadowRow === i && shadowCol === col;
                });
                const inRowHint = matches.rows.indexOf(i) !== -1;
                // 如果这个位置已经有暗影块，跳过（避免重复）
                if (hasShadow || inRowHint) {
                    continue;
                }

                // 创建提示块
                const hintBlock = this.createBlock(
                    [0, 0],
                    blockColorIdx,
                    this.boardNode.getComponent(Board).getPosByOffset(i, col),
                    255,
                    this.boardNode
                );
                // hintBlock.setPosition(CompBoard.getPosByOffset(i, col));

                this.hintBlocks.push(hintBlock);
            }
        }
    }

    /**
     * 清除拖拽暗影和提示
     */
    clearDragShadow(): void {
        for (let i = 0; i < this.node.children.length; i++) {
            const blockNode = this.node.children[i];
            if (blockNode) {
                blockNode.getComponent(Block).init(this.config.blockColorIdx);
            }
        }
        // 清除暗影块
        for (const shadowBlock of this.shadowBlocks) {
            shadowBlock.destroy();
        }
        this.shadowBlocks = [];

        // 清除提示块
        for (const hintBlock of this.hintBlocks) {
            hintBlock.destroy();
        }
        this.hintBlocks = [];
    }

    getBound(centerRowNum: number, centerColNum: number): number[] {
        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        for (const [offsetX, offsetY] of this.config.shape) {
            const row = centerRowNum + offsetY;
            const col = centerColNum + offsetX;

            if (row < minY) minY = row;
            if (row > maxY) maxY = row;
            if (col < minX) minX = col;
            if (col > maxX) maxX = col;
        }
        return [minX, maxX, minY, maxY];
    }

    /**
     * 放置拖动选项
     * @param blockZeroRow 中心行
     * @param blockZeroCol 中心列
     * @param shape 俄罗斯方块形状
     */
    placeDragOption(
        blockZeroRow: number,
        blockZeroCol: number,
        shape: [number, number][]
    ) {
        const CompBoard = this.boardNode.getComponent(Board);
        AudioManager.instance.playPlaceEffect();

        // log(
        //     "CompBoard.blockNodes:",
        //     CompBoard.blockNodes.map((item) =>
        //         item.map((blockNode) => blockNode?.getComponent(Block).colorIdx)
        //     )
        // );
        let colorIdx = null;
        for (const [offsetX, offsetY] of shape) {
            const block = this.createBlock(
                [offsetX, offsetY],
                this.config.blockColorIdx,
                CompBoard.getPosByOffset(blockZeroRow, blockZeroCol),
                255,
                this.boardNode
            );
            colorIdx = block.getComponent(Block).colorIdx;
            CompBoard.blockNodes[blockZeroRow - offsetY][
                blockZeroCol + offsetX
            ] = block;
            startBrightAnimation.call(this, block);
        }
        function startBrightAnimation(block: Node) {
            const dragonNode = block.getChildByName("dragon");
            const dragonAnimation = dragonNode.getComponent(
                dragonBones.ArmatureDisplay
            );
            dragonNode.active = true;
            dragonAnimation.playAnimation("in", 1);
            dragonAnimation.on(
                dragonBones.EventObject.COMPLETE,
                () => {
                    dragonNode.active = false;
                },
                this
            );
        }

        // log(
        //     "CompBoard.blockNodes:",
        //     CompBoard.blockNodes.map((item) =>
        //         item.map((blockNode) => blockNode?.getComponent(Block).colorIdx)
        //     )
        // );
        GameManager.instance.setScoreWithoutClearCount(shape.length);
        CompBoard.checkAndClearLines(colorIdx, blockZeroRow, blockZeroCol);
    }

    getZeroBlockRowCol() {
        const CompDragOption = this.node.getComponent(DragOption);
        let worldPos = new Vec3(0, 0, 0);
        CompDragOption._blocks.forEach((blockNode) => {
            const CompBlock = blockNode.getComponent(Block);
            if (CompBlock.isOffsetZero) {
                // log("找到了零偏移块:");
                worldPos = blockNode.worldPosition;
            }
        });

        const CompBoard = this.boardNode.getComponent(Board);
        const localpos = this.boardNode
            .getComponent(UITransform)
            .convertToNodeSpaceAR(worldPos);
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
        this.optionShadowNode = new Node(
            `Shadow_${this.node.name || this.node.uuid}`
        );
        this.optionShadowNode.parent = container.shadowContainerNode;

        // 添加偏移量，让阴影更明显（向右下方偏移）
        const shadowOffsetX = 8; // 向右偏移
        const shadowOffsetY = -8; // 向下偏移
        this.optionShadowNode.setPosition(
            pos.x + shadowOffsetX,
            pos.y + shadowOffsetY,
            pos.z
        );
        this.optionShadowNode.setScale(0.5, 0.5, 1); // 与 DragOption 相同的缩放

        // 创建阴影 block
        const { shape, blockColorIdx } = this.config;
        this.optionShadowBlocks = this.createShadowBlocks(shape, blockColorIdx);

        // 应用与 DragOption 相同的 rePos 逻辑
        this.rePosShadow();
    }

    /**
     * 创建阴影 block
     */
    private createShadowBlocks(
        shape: [number, number][],
        blockColorIdx: number
    ): Node[] {
        const blocks: Node[] = [];
        shape.forEach((offset2Center) => {
            const block = instantiate(this.blockPrefab);
            block.parent = this.optionShadowNode;
            const compBlock = block.getComponent(Block);
            if (compBlock) {
                compBlock.init(blockColorIdx);
                // 设置阴影效果：降低透明度，并设置为深色（灰色/黑色）
                const sprite = block.getComponent(Sprite);
                if (sprite) {
                    // 设置阴影颜色为深灰色，降低透明度
                    sprite.color = new Color(0, 0, 0, 120); // 黑色，透明度 120
                }
            }

            const { width: blockWidth, height: blockHeight } =
                block.getComponent(UITransform);
            const posX = offset2Center[0] * blockWidth;
            const posY = offset2Center[1] * blockHeight;
            block.setPosition(new Vec3(posX, posY, 0));
            blocks.push(block);
        });
        return blocks;
    }

    /**
     * 对阴影 block 应用与 DragOption 相同的 rePos 逻辑
     */
    private rePosShadow() {
        const { shape } = this.config;
        if (!shape || shape.length === 0 || !this.optionShadowNode) return;

        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        shape.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        const centerRow = (minY + maxY) / 2;
        const centerCol = (minX + maxX) / 2;

        const offsetX = -centerCol * this.blockSize.width;
        const offsetY = -centerRow * this.blockSize.height;

        this.optionShadowNode.children.forEach((child) => {
            if (child.getComponent(Block)) {
                const pos = child.position;
                child.setPosition(pos.x + offsetX, pos.y + offsetY, pos.z);
            }
        });
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
}
