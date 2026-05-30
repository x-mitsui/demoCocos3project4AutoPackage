import { _decorator, Component, find, Label, log, Node, tween, Vec3 } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("MyProgress")
export class MyProgress extends Component {
    x_end = 158;
    x_start = -182;
    @property
    totalScore: number = 50;
    stepScore: number = 0;
    curScore: number = 0;
    isReachEnd: boolean = false;
    protected onLoad(): void {
        eventManager.on(GameEvent.GAME_SCORE_UPDATE, this.setCurScore, this);
        this.stepScore = (this.x_end - this.x_start) / this.totalScore;
        const label = find("pro_di/Label", this.node);
        if (label) {
            label.getComponent(Label).string = this.totalScore.toString();
        }
    }
    onDestroy() {
        eventManager.off(GameEvent.GAME_SCORE_UPDATE, this.setCurScore, this);
    }

    setCurScore(score: number) {
        this.curScore = score;
        const curX = Math.min(this.x_end, this.x_start + this.stepScore * this.curScore);
        const ele = find("pro_di/pro_ele", this.node) as Node;
        const eleLabel = find("pro_di/pro_ele/Label", this.node);
        if (eleLabel) {
            eleLabel.getComponent(Label).string = this.curScore.toString();
        }
        Logger.info("MyProgress:setCurScore:", "curX:", curX);
        const duration = 0.25;
        const targetPos = new Vec3(curX, ele.position.y, ele.position.z);
        tween(ele)
            .to(duration, { position: targetPos })
            .call(() => {
                if (curX >= this.x_end) {
                    eventManager.emit(GameEvent.GAME_WIN);
                }
            })
            .start();
    }
}
