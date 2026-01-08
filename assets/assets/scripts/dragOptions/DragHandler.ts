import { _decorator, Component, Node, EventTouch, log, Vec3 } from "cc";
import { DragOption } from "./DragOption";
import { DragOptionsContainer } from "./DragOptionsContainer";
import { Board } from "../board/Board";
import { eventManager, GameEvent } from "../managers/EventManager";
import { AudioManager } from "../managers/AudioManager";
import { GameManager } from "../managers/GameManager";

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
        this.boardNode =
            this.node.parent.getComponent(DragOptionsContainer).boardNode;
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
        log("onTouchStart");
        AudioManager.instance.playClickEffect();
        this.isDragging = true;
        this.touchStartPosY = event.getUILocation().y;
        this._originalPosition.set(this.node.position);

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
        log(
            "blocks",
            CompBoard.blockNodes.map((row) =>
                row.map((node) => (node ? node.name : "null"))
            )
        );
        const [blockZeroRow, blockZeroCol] =
            CompDragOption.getZeroBlockRowCol();
        log(
            "---------zblockZeroRow:",
            blockZeroRow,
            "blockZeroCol:",
            blockZeroCol
        );
        if (
            !CompBoard.checkDragOptionCanPlace(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shape
            )
        ) {
            log("can't place");

            return;
        }
        if (
            !CompBoard.checkRowColsInBoard(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shape
            )
        ) {
            log("out of board");
            CompDragOption.clearDragShadow();

            return;
        }

        // 暗影逻辑
        const { shape, blockColorIdx } = CompDragOption.config;
        CompDragOption.showDragShadow(
            shape,
            blockZeroRow,
            blockZeroCol,
            blockColorIdx
        );
        // CompDragOption.showDragHint(shape, touchRow, touchCol, new Vec3(currentPosX, currentPosY, 0), blockColorIdx);

        event.propagationStopped = true;
    }

    onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;

        this.touchMovePosY = event.getUILocation().y;
        const delta = event.getUIDelta();
        const newPos = this.node.position
            .add(delta.toVec3())
            .add(new Vec3(0, delta.y, 0));
        this.node.setPosition(newPos);

        const CompDragOption = this.node.getComponent(DragOption);
        const CompBoard = this.boardNode.getComponent(Board);
        // const [touchRow, touchCol] = CompBoard.getOffsetByPos(
        //     new Vec3(this.node.x, this.node.y + CompDragOption.rePosDeltaY, 0)
        // );
        const [blockZeroRow, blockZeroCol] =
            CompDragOption.getZeroBlockRowCol();
        if (
            !CompBoard.checkDragOptionCanPlace(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shape
            )
        ) {
            log("can't place");
            CompDragOption.clearDragShadow();
            return;
        }
        if (
            !CompBoard.checkRowColsInBoard(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shape
            )
        ) {
            log("out of board");
            CompDragOption.clearDragShadow();
            return;
        }

        // 暗影逻辑
        const { shape, blockColorIdx } = CompDragOption.config;
        CompDragOption.showDragShadow(
            shape,
            blockZeroRow,
            blockZeroCol,
            blockColorIdx
        );

        event.propagationStopped = true;
    }

    onTouchEnd(event: EventTouch) {
        log("onTouchEnd");
        this.isDragging = false;
        this.placeDragOption();
        event.propagationStopped = true;
    }

    onTouchCancel(event: EventTouch) {
        log("onTouchCancel");
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
        const [blockZeroRow, blockZeroCol] =
            CompDragOption.getZeroBlockRowCol();
        const parent = this.node.parent;
        if (
            CompBoard.checkDragOptionCanPlace(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shape
            )
        ) {
            log("can place>>>>>>>>>>>>");
            CompDragOption.placeDragOption(
                blockZeroRow,
                blockZeroCol,
                CompDragOption.config.shape
            );
            CompDragOption.clearDragShadow();
            // 销毁阴影
            CompDragOption.destroyShadow();
            eventManager.emit(GameEvent.FIRST_OPTION_LANDED);
            parent.removeChild(this.node);
            parent.getComponent(DragOptionsContainer).checkAndShowMask();
            // 触发检查补充逻辑
            log("parent.children.length:", parent.children.length);
            if (parent.children.length === 0) {
                log("check refill???");
                parent.emit("check-refill");
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
