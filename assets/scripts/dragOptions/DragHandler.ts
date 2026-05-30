import { _decorator, Component, Node, EventTouch, Vec3, find } from "cc";
import { DragOption } from "./DragOption";
import { DragOptionsContainer } from "./DragOptionsContainer";
import { Board } from "../board/Board";
import { eventManager, GameEvent } from "../managers/EventManager";
import { AudioManager } from "../managers/AudioManager";
import { Logger } from "../utils/logger";
import { GameManager } from "../managers/GameManager";
import { ObjectPoolManager } from "../managers/ObjectPoolManager";
import { SuperBlock } from "./block/SuperBlock";
import { LocalImgToSprite } from "../misc/LocalImgToSprite";
import { jump2DownloadPage } from "../utils/tool";

const { ccclass, property } = _decorator;

@ccclass("DragHandler")
export class DragHandler extends Component {
    @property({ tooltip: "拖拽时的位置偏移（例如向上偏移以免手指遮挡）" })
    offsetY = 300;

    @property({ tooltip: "拖拽时是否将节点层级置顶" })
    bringToFront: boolean = true;

    private isDragging: boolean = false;
    private _originalPosition: Vec3 = new Vec3();
    private boardNode: Node | null = null;

    private touchStartPosY: number = 0;
    private touchMovePosY: number = 0;

    onLoad() {
        this.boardNode = find("Canvas/Board");
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    onTouchStart(event: EventTouch) {
        // AudioManager.instance.playAllRandomEffect();
        Logger.info("DragHandler:onTouchStart");
        AudioManager.instance.playTouchEffect();
        this.isDragging = true;
        this.touchStartPosY = event.getUILocation().y;
        this._originalPosition.set(this.node.position);
        eventManager.emit(GameEvent.TOUCH_START_FIRST_OPTION);
        if (this.bringToFront && this.node.parent) {
            this.node.setSiblingIndex(this.node.parent.children.length - 1);
        }

        // 拖动时缩放为1
        this.node.setScale(1, 1, 1);

        const CompDragOption = this.node.getComponent(DragOption);
        // 隐藏阴影
        CompDragOption.hideShadow();

        // 应用初始偏移（例如向上移动）
        const currentPosX = this.node.x;
        const currentPosY = this.node.y + this.offsetY;
        this.node.setPosition(currentPosX, currentPosY, this.node.z);
        const CompBoard = this.boardNode.getComponent(Board);
        // const [touchRow, touchCol] = CompBoard.getOffsetByPos(
        //     new Vec3(currentPosX, currentPosY, 0)
        // );
        Logger.info(
            "DragHandler:onTouchStart:",
            "blocks",
            "blocks",
            CompBoard.blockNodes.map((row) => row.map((node) => (node ? node.name : "null"))),
        );
        const [firstBlockRow, firstBlockCol] = CompDragOption.getFirstBlockRowCol();
        Logger.info(
            "DragHandler:onTouchStart:",
            "---------zfirstBlockRow:",
            firstBlockRow,
            "firstBlockCol:",
            firstBlockCol,
        );
        if (
            !CompBoard.checkDragOptionCanPlace(
                firstBlockRow,
                firstBlockCol,
                CompDragOption.config.shapes[CompDragOption.shapeIndex],
            )
        ) {
            Logger.info("DragHandler:onTouchStart:", "can't place");

            return;
        }
        if (
            !CompBoard.checkRowColsInBoard(
                firstBlockRow,
                firstBlockCol,
                CompDragOption.config.shapes[CompDragOption.shapeIndex],
            )
        ) {
            Logger.info("DragHandler:onTouchStart:", "out of board");
            CompDragOption.clearDragShadow();

            return;
        }

        // 暗影逻辑
        let { shapes, blockIndex } = CompDragOption.config;
        if (GameManager.instance.enableChangeColor) {
            blockIndex = 1;
        }
        const shape = shapes[CompDragOption.shapeIndex];
        CompDragOption.showDragShadow(shape, firstBlockRow, firstBlockCol, blockIndex);
        // CompDragOption.showDragHint(shape, touchRow, touchCol, new Vec3(currentPosX, currentPosY, 0), blockColorIdx);

        event.propagationStopped = true;
    }

    onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;

        this.touchMovePosY = event.getUILocation().y;
        const delta = event.getUIDelta();
        // 舒适度补偿，补偿系数
        const comfortCoefficient = 0.5;
        const comfortSupplement = new Vec3(delta.x * comfortCoefficient, delta.y * comfortCoefficient, 0);
        const newPos = this.node.position.add(delta.toVec3()).add(comfortSupplement);
        this.node.setPosition(newPos);

        const CompDragOption = this.node.getComponent(DragOption);
        const CompBoard = this.boardNode.getComponent(Board);
        // const [touchRow, touchCol] = CompBoard.getOffsetByPos(
        //     new Vec3(this.node.x, this.node.y + CompDragOption.rePosDeltaY, 0)
        // );
        const [blockZeroRow, blockZeroCol] = CompDragOption.getFirstBlockRowCol();
        if (
            !CompBoard.checkDragOptionCanPlace(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shapes[CompDragOption.shapeIndex],
            )
        ) {
            Logger.info("DragHandler:onTouchMove:", "can't place");
            CompDragOption.clearDragShadow();
            return;
        }
        if (
            !CompBoard.checkRowColsInBoard(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shapes[CompDragOption.shapeIndex],
            )
        ) {
            Logger.info("DragHandler:onTouchMove:", "out of board");
            CompDragOption.clearDragShadow();
            return;
        }
        if (GameManager.instance.enablePhotoMode && LocalImgToSprite.shouldShowPhotoOnDragOption()) {
            CompDragOption.renderOptionPhotos(blockZeroRow, blockZeroCol);
        }
        // 暗影逻辑
        let { shapes, blockIndex } = CompDragOption.config;
        const shape = shapes[CompDragOption.shapeIndex];
        if (GameManager.instance.enableChangeColor) {
            blockIndex = 1;
        }
        CompDragOption.showDragShadow(shape, blockZeroRow, blockZeroCol, blockIndex);

        event.propagationStopped = true;
    }

    onTouchEnd(event: EventTouch) {
        Logger.info("DragHandler:onTouchEnd");
        this.isDragging = false;
        this.placeDragOption();
        event.propagationStopped = true;
    }

    onTouchCancel(event: EventTouch) {
        Logger.info("DragHandler:onTouchCancel");
        this.isDragging = false;
        this.placeDragOption();
        event.propagationStopped = true;
    }

    placeDragOption() {
        //todo: 如果DragOption最终放置的位置，允许放置就执行放置操作
        const CompBoard = this.boardNode.getComponent(Board);
        const CompDragOption = this.node.getComponent(DragOption);
        // const [touchRow, touchCol] = CompBoard.getOffsetByPos(
        //     new Vec3(this.node.x, this.node.y + CompDragOption.rePosDeltaY, 0)
        // );
        const [firstBlockRow, firstBlockCol] = CompDragOption.getFirstBlockRowCol();
        const parent = this.node.parent;
        if (
            CompBoard.checkDragOptionCanPlace(
                firstBlockRow,
                firstBlockCol,
                CompDragOption.config.shapes[CompDragOption.shapeIndex],
            )
        ) {
            if (GameManager.instance.placeTimes === 0) {
                Logger.info("DragHandler:placeDragOption:", "can place>>>>>>>>>>>>");
                eventManager.emit(GameEvent.FIRST_OPTION_LANDED);
            }
            GameManager.instance.placeTimes++;

            CompDragOption.placeDragOption(
                firstBlockRow,
                firstBlockCol,
                CompDragOption.config.shapes[CompDragOption.shapeIndex],
            );
            CompDragOption.clearDragShadow();
            // 销毁DragOption的阴影
            CompDragOption.destroyShadow();

            parent.getComponent(DragOptionsContainer)?.nudgeRemainingOptionsToward(this._originalPosition, this.node);

            parent.removeChild(this.node);
            if (GameManager.instance.oneByOne) {
                this.scheduleOnce(() => {
                    GameManager.instance.playNextQuestion();
                }, 1);
                return;
            }
            parent.getComponent(DragOptionsContainer).checkAndShowMask();
            // 触发检查补充逻辑
            Logger.info("DragHandler:placeDragOption:", "parent.children.length:", parent.children.length);
            if (parent.children.length === 0) {
                Logger.info("DragHandler:placeDragOption:", "check refill???");
                parent.emit("check-refill");
            }

            for (let i = this.node.children.length - 1; i >= 0; i--) {
                const child = this.node.children[i];
                // 回收Block节点
                if (child.getComponent(SuperBlock)) {
                    ObjectPoolManager.instance.put("Block", child);
                }
            }

            this.node.destroy();

            return;
        }

        // 恢复到初始位置并缩放回0.5
        this.node.setPosition(this._originalPosition);
        this.node.setScale(0.5, 0.5, 1);

        CompDragOption.clearDragShadow();

        // 恢复显示阴影
        CompDragOption.showShadow();
    }
}
