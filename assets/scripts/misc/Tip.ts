import {
    _decorator,
    Animation,
    Component,
    find,
    instantiate,
    Node,
    Tween,
    tween,
    UIOpacity,
    UITransform,
    Vec3,
} from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
import { SuperBlock } from "../dragOptions/block/SuperBlock";
import { DragHandler } from "../dragOptions/DragHandler";
import { Board } from "../board/Board";
import { gameLevelConfigs } from "../configs/gameLevelConfigs";
import { GameManager } from "../managers/GameManager";
const { ccclass, property } = _decorator;

@ccclass("Tip")
export class Tip extends Component {
    // ============ 动画参数配置 ============
    @property({ tooltip: "移动到目标位置的时长（秒）" })
    moveDuration: number = 1.5;

    @property({ tooltip: "在目标位置停留的时长（秒）" })
    targetStayDuration: number = 0.5;

    @property({ tooltip: "在起始位置停留的时长（秒）" })
    startStayDuration: number = 0.1;

    @property({ tooltip: "目标位置行号（Board 的 row）" })
    targetRow: number = 6.5;

    @property({ tooltip: "目标位置列号（Board 的 col）" })
    targetCol: number = 1;

    @property({ tooltip: "预览方块的透明度（0-255）" })
    previewOpacity: number = 120;

    @property({ tooltip: "使用第几个 DragOption（0-2）" })
    dragOptionIndex: number = 0;

    @property({
        tooltip: "手指指向的 SuperBlock 偏移量 Row，用于匹配 SuperBlock.offset2FirstBlock[0]",
    })
    offset2FirstRow: number = 0;

    @property({
        tooltip: "手指指向的 SuperBlock 偏移量 Col，用于匹配 SuperBlock.offset2FirstBlock[1]",
    })
    offset2FirstCol: number = 0;

    // 是否已经拖拽
    isAlreadyDrag: boolean = false;

    // ============ 私有属性 ============
    private previewDragOption: Node = null; // 预览的 dragOption 节点
    private startPosition: Vec3 = new Vec3(); // 起始位置
    private targetPosition: Vec3 = new Vec3(); // 目标位置
    private _tweenInstance: Tween<Node> = null;

    onLoad() {
        // 初始时先隐藏在屏幕外，等待 GAME_START_TIP 事件触发后再定位
        this.node.setPosition(-10000, 0, 0);
        eventManager.on(GameEvent.TOUCH_START_FIRST_OPTION, this.onFirstOptionLanded, this);
        eventManager.on(GameEvent.GAME_START_TIP, this.onStartTip, this);
        this.initTipConfig();
    }
    initTipConfig() {
        const config = gameLevelConfigs[GameManager.instance.gameLevel];
        const { targetRow, targetCol, offset2FirstRow, offset2FirstCol } = config.tipConfig;
        this.targetRow = targetRow;
        this.targetCol = targetCol;
        this.dragOptionIndex = config.tipConfig.dragOptionIndex;
        this.offset2FirstRow = offset2FirstRow;
        this.offset2FirstCol = offset2FirstCol;
    }

    onStartTip() {
        if (this.isAlreadyDrag) return;

        this.node.active = true;
        // 定位 Tip 到第一个 DragOption 的第一个 SuperBlock（起始位置）
        this.positionTipToFirstBlock();
        this.startPosition.set(this.node.position);

        // 计算目标位置（Board 的 row=1, col=1）
        this.calculateTargetPosition();

        const animation = this.getComponent(Animation);
        if (animation) {
            animation.play();
        }

        // 创建预览 dragOption
        this.createPreviewDragOption();

        // 开始循环动画
        this.startLoopAnimation();
    }

    /**
     * 将 Tip 节点定位到指定 DragOption 的中心位置（起始位置）
     */
    private positionTipToFirstBlock() {
        const dragOptionsContainer = find("Canvas/DragOptionsContainer");
        if (!dragOptionsContainer || dragOptionsContainer.children.length <= this.dragOptionIndex) {
            Logger.info(
                "Tip:positionTipToFirstBlock:",
                "找不到 DragOptionsContainer 或子节点索引 ${this.dragOptionIndex} 不存在",
            );
            return;
        }

        const targetDragOption = dragOptionsContainer.children[this.dragOptionIndex];

        // 获取指定 DragOption 的世界坐标（中心位置）
        const worldPos = targetDragOption.worldPosition;

        // 转换为 Tip 父节点的本地坐标
        const tipParent = this.node.parent;
        if (tipParent) {
            const tipParentTransform = tipParent.getComponent(UITransform);
            if (tipParentTransform) {
                const localPos = new Vec3();
                tipParentTransform.convertToNodeSpaceAR(worldPos, localPos);
                this.node.setPosition(localPos);
                Logger.info(
                    "Tip:positionTipToFirstBlock:",
                    "起始位置（第 ${this.dragOptionIndex} 个 DragOption 中心）",
                    localPos,
                );
            }
        }
    }

    /**
     * 计算目标位置（Board 的 row=7, col=0）
     */
    private calculateTargetPosition() {
        const boardNode = find("Canvas/Board");
        if (!boardNode) {
            Logger.info("Tip:calculateTargetPosition:", "找不到 Board 节点");
            return;
        }

        const board = boardNode.getComponent(Board);
        if (!board || !board.getPosByOffset) {
            Logger.info("Tip:calculateTargetPosition:", "Board 组件或 getPosByOffset 方法不存在");
            return;
        }

        // 获取 Board 上指定位置的本地坐标
        const boardLocalPos = board.getPosByOffset(this.targetRow, this.targetCol);

        // 转换为世界坐标
        const boardTransform = boardNode.getComponent(UITransform);
        if (!boardTransform) {
            Logger.info("Tip:calculateTargetPosition:", "Board 没有 UITransform 组件");
            return;
        }

        const worldPos = new Vec3();
        boardTransform.convertToWorldSpaceAR(boardLocalPos, worldPos);

        // 转换为 Tip 父节点的本地坐标
        const tipParent = this.node.parent;
        if (tipParent) {
            const tipParentTransform = tipParent.getComponent(UITransform);
            if (tipParentTransform) {
                tipParentTransform.convertToNodeSpaceAR(worldPos, this.targetPosition);
                Logger.info(
                    "Tip:calculateTargetPosition:",
                    "目标位置 Board (${this.targetRow}, ${this.targetCol})",
                    this.targetPosition,
                );
            }
        }
    }

    /**
     * 开始循环动画：起始位置 → 目标位置 → 等待 → 瞬间切回起始位置 → 循环
     */
    private startLoopAnimation() {
        if (this._tweenInstance) {
            this._tweenInstance.start();
            return;
        }
        this._tweenInstance = tween(this.node)
            .to(this.moveDuration, { position: this.targetPosition }, { easing: "quintOut" })
            .delay(this.targetStayDuration)
            .call(() => {
                // 瞬间切回起始位置
                this.node.setPosition(this.startPosition);
                Logger.info("Tip:startLoopAnimation:", "瞬间切回起始位置");
            })
            .delay(this.startStayDuration)
            .union()
            .repeatForever()
            .start();
    }

    /**
     * 创建半透明的预览 dragOption
     */
    private createPreviewDragOption() {
        // 获取 DragOptionsContainer 的指定 dragOption
        const dragOptionsContainer = find("Canvas/DragOptionsContainer");
        if (!dragOptionsContainer || dragOptionsContainer.children.length <= this.dragOptionIndex) {
            Logger.info(
                "Tip:createPreviewDragOption:",
                "找不到 DragOptionsContainer 或子节点索引 ${this.dragOptionIndex} 不存在",
            );
            return;
        }

        const targetDragOption = dragOptionsContainer.children[this.dragOptionIndex];

        // 直接 clone 指定的 DragOption
        this.previewDragOption = instantiate(targetDragOption);
        this.previewDragOption.setScale(1, 1, 1);
        this.previewDragOption.parent = this.node; // 作为 Tip 的子节点

        // 设置位置为 (0, 0)，相对于 Tip 节点中心
        this.previewDragOption.setPosition(new Vec3(0, 0, 0));

        // 同步所有 Block 的材质属性
        this.syncBlockMaterials(targetDragOption, this.previewDragOption);

        // 设置透明度
        const uiOpacity = this.previewDragOption.addComponent(UIOpacity);
        uiOpacity.opacity = this.previewOpacity;

        // 移除 DragHandler 组件（而不是禁用）
        const dragHandler = this.previewDragOption.getComponent(DragHandler);
        if (dragHandler) {
            dragHandler.destroy();
            Logger.info("Tip:createPreviewDragOption:", "已移除 DragHandler 组件");
        }

        // 调整 Finger 节点的位置，指向 PreviewDragOption 的第一个 Block
        this.adjustFingerPosition();

        Logger.info(
            "Tip:createPreviewDragOption:",
            "预览 dragOption 创建成功，作为子节点",
            this.previewDragOption.position,
        );
    }

    /**
     * 同步 Block 的材质属性，确保颜色一致
     */
    private syncBlockMaterials(sourceNode: Node, targetNode: Node) {
        const sourceBlocks: Node[] = [];
        const targetBlocks: Node[] = [];

        // 收集源节点的 Block
        for (const child of sourceNode.children) {
            if (child.getComponent(SuperBlock)) {
                sourceBlocks.push(child);
            }
        }

        // 收集目标节点的 Block
        for (const child of targetNode.children) {
            if (child.getComponent(SuperBlock)) {
                targetBlocks.push(child);
            }
        }

        // 同步每个 Block 的材质
        for (let i = 0; i < Math.min(sourceBlocks.length, targetBlocks.length); i++) {
            const sourceBlock = sourceBlocks[i].getComponent(SuperBlock);
            const targetBlock = targetBlocks[i].getComponent(SuperBlock);

            if (sourceBlock && targetBlock) {
                // 复制材质相关属性
                targetBlock.blockIndex = sourceBlock.blockIndex;

                // 复制 offset2First 相关属性
                targetBlock.offset2FirstBlockCol = sourceBlock.offset2FirstBlockCol;
                targetBlock.offset2FirstBlockRow = sourceBlock.offset2FirstBlockRow;

                // 重新应用皮肤
                if (targetBlock.init) {
                    targetBlock.init(targetBlock.blockIndex);
                }

                Logger.info(
                    "Tip:syncBlockMaterials:",
                    `已同步 Block ${i}: blockIndex=${targetBlock.blockIndex}, offset=[${targetBlock.offset2FirstBlockRow}, ${targetBlock.offset2FirstBlockCol}]`,
                );
            }
        }
    }

    /**
     * 调整 Finger 节点的位置，让它指向 PreviewDragOption 最下层的第一个 Block
     */
    private adjustFingerPosition() {
        const fingerNode = this.node.getChildByName("Finger");
        if (!fingerNode) {
            Logger.warn("Tip:adjustFingerPosition:", "找不到 Finger 节点");
            return;
        }

        if (!this.previewDragOption) {
            Logger.warn("Tip:adjustFingerPosition:", "PreviewDragOption 不存在");
            return;
        }

        // 查找所有 Block 子节点
        const blocks: Node[] = [];
        for (const child of this.previewDragOption.children) {
            if (child.getComponent(SuperBlock)) {
                blocks.push(child);
            }
        }

        if (blocks.length === 0) {
            Logger.warn("Tip:adjustFingerPosition:", "PreviewDragOption 中找不到 Block");
            return;
        }

        // 根据 offset2FirstX 和 offset2FirstY 查找匹配的 Block
        let targetBlock: Node = null;
        for (const block of blocks) {
            const blockComp = block.getComponent(SuperBlock);
            if (blockComp) {
                // 使用独立的 offset2FirstBlockCol 和 offset2FirstBlockRow 属性
                // 注意：不能用 if (blockComp.offset2FirstBlockCol) 因为 0 会被判断为 false
                const offsetCol = blockComp.offset2FirstBlockCol;
                const offsetRow = blockComp.offset2FirstBlockRow;

                Logger.warn("Tip:adjustFingerPosition:", `检查 Block offset=[${offsetCol}, ${offsetRow}]`);

                // 匹配 offset2FirstBlockCol/Row 与 this.offset2FirstCol/Row
                // 使用严格相等判断，包括 0 值
                if (offsetCol === this.offset2FirstCol && offsetRow === this.offset2FirstRow) {
                    targetBlock = block;
                    Logger.warn("Tip:adjustFingerPosition:", `找到匹配的 Block: offset=[${offsetRow}, ${offsetCol}]`);
                    break;
                }
            }
        }

        // 如果没找到匹配的，使用第一个 Block 作为默认
        if (!targetBlock) {
            Logger.warn(
                "Tip:adjustFingerPosition:",
                `未找到 offset2FirstBlock 为 [${this.offset2FirstRow}, ${this.offset2FirstCol}] 的 Block，使用第一个作为默认`,
            );
            targetBlock = blocks[0];
        }

        // 获取目标 block 相对于 PreviewDragOption 的位置
        const blockPos = targetBlock.position;
        fingerNode.setPosition(blockPos);

        // 将 Finger 的层级调到最高（最后渲染，显示在最上层）
        fingerNode.setSiblingIndex(-1);

        Logger.info(
            "Tip:adjustFingerPosition:",
            `Finger 节点已调整到 offset2FirstBlock=[${this.offset2FirstRow}, ${this.offset2FirstCol}] 的 block 位置`,
            blockPos,
        );
        Logger.info("Tip:adjustFingerPosition:", "Finger 层级已调到最高");
    }

    onFirstOptionLanded() {
        Logger.info("Tip:onFirstOptionLanded:", "第一个选项落地");
        this.isAlreadyDrag = true;
        this.node.active = false;
        this.node.setPosition(-10000, 0, 0);
        // Animation动画停止
        const animation = this.getComponent(Animation);
        if (animation) {
            animation.stop();
        }

        // 停止 tween 动画
        tween(this.node).stop();

        // 销毁预览节点
        if (this.previewDragOption) {
            this.previewDragOption.destroy();
            this.previewDragOption = null;
        }
    }

    onDestroy() {
        eventManager.off(GameEvent.TOUCH_START_FIRST_OPTION, this.onFirstOptionLanded, this);
        eventManager.off(GameEvent.GAME_START_TIP, this.onStartTip, this);
        // 停止 tween 动画
        tween(this.node).stop();

        // 清理预览节点
        if (this.previewDragOption) {
            this.previewDragOption.destroy();
            this.previewDragOption = null;
        }
    }
}
