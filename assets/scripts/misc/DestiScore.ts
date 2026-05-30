import { _decorator, Component, find, Label, Sprite, UITransform, Node, Vec3 } from "cc";
import { GameEvent } from "../managers/EventManager";
import { eventManager } from "../managers/EventManager";
import { GameManager } from "../managers/GameManager";
const { ccclass, property } = _decorator;

@ccclass("DestiScore")
export class DestiScore extends Component {
    @property({ tooltip: "pro2_ele起始位置的X坐标" })
    pro2_start_posX = -292.717;

    @property({ tooltip: "pro2_ele结束位置的X坐标" })
    pro2_end_posX = 119.576;

    @property({ tooltip: "目标分数" })
    destiScore = 10000;

    maskTotalLength = 412;
    pro2_ele: Node = null;
    barMask: Node = null;
    currentScore: number = 0;

    protected onLoad(): void {
        // 获取节点引用
        const bar = find("BarMask/Bar", this.node);
        this.maskTotalLength = bar?.getComponent(UITransform)?.width || 412;

        this.pro2_ele = find("pro2_ele", this.node);
        this.barMask = find("BarMask", this.node);
        const destiScoreLabel = find("DestiScoreLabel", this.node);
        if (destiScoreLabel) {
            destiScoreLabel.getComponent(Label).string = this.destiScore.toString();
        }
        GameManager.instance.setBestScore(this.destiScore); // 设置最佳分数为目标分数，这样就不会触发新的最高分动画
        // 初始化
        this.updateBar(0);

        // 监听分数更新事件
        eventManager.on(GameEvent.GAME_SCORE_UPDATE, this.updateBar, this);
    }

    protected onDestroy(): void {
        eventManager.off(GameEvent.GAME_SCORE_UPDATE, this.updateBar, this);
    }

    updateBar(score: number) {
        this.currentScore = score;

        // 计算当前分数与目标分数的比例（0-1之间）
        const ratio = Math.min(1, Math.max(0, this.currentScore / this.destiScore));

        // 更新 barMask 的宽度
        if (this.barMask) {
            const barMaskTransform = this.barMask.getComponent(UITransform);
            if (barMaskTransform) {
                barMaskTransform.width = this.maskTotalLength * ratio;
            }
        }

        // 更新 pro2_ele 的位置（从 pro2_start_posX 移动到 pro2_end_posX）
        if (this.pro2_ele) {
            const targetX = this.pro2_start_posX + (this.pro2_end_posX - this.pro2_start_posX) * ratio;
            const currentPos = this.pro2_ele.position;
            this.pro2_ele.setPosition(new Vec3(targetX, currentPos.y, currentPos.z));
            const scoreLabel = find("pro2_ele/Score", this.node);
            if (scoreLabel) {
                scoreLabel.getComponent(Label).string = Math.floor(this.currentScore).toString();
            }
            if (this.currentScore >= this.destiScore) {
                GameManager.instance.setBestScore(this.destiScore);
                // GameManager.instance.playEndPage(true);
                eventManager.emit(GameEvent.GAME_END, true);
            }
        }
    }
}
