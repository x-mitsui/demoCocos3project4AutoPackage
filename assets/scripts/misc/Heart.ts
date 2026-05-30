import { _decorator, Animation, Component, log, tween } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
const { ccclass, property } = _decorator;

@ccclass("Heart")
export class Heart extends Component {
    private heartAnimationHandle: number = null!;
    protected onLoad(): void {
        this.node.x = -10000;
        eventManager.on(GameEvent.GAME_HEART_SHOW, this.show, this);
        eventManager.on(GameEvent.GAME_HEART_HIDE, this.hide, this);
    }

    /**
     * 显示心形节点并播放动画
     */
    show(): void {
        // 取消之前的动画句柄
        if (this.heartAnimationHandle) {
            this.unschedule(this.heartAnimationHandle);
            this.heartAnimationHandle = null;
        }

        // 显示心形节点
        this.node.x = 380;
        // 获取 Animation 组件
        const animation = this.node.getComponent(Animation);

        // 监听动画完成事件，播放完成后播放 heart_idle
        animation.once(
            Animation.EventType.FINISHED,
            () => {
                const anim = this.node.getComponent(Animation);
                if (anim) {
                    // 播放 heart_idle 动画（循环播放）
                    anim.play("heart_idle");
                }
            },
            this
        );

        // 播放 heart_start 动画（播放一次）
        animation.play("heart_start");
    }

    /**
     * 隐藏心形节点
     */
    hide(): void {
        if (this.node) {
            this.node.x = -10000;
            // tween(this.node).to(0.2, { x: -10000 }).start();
        }
    }
}
