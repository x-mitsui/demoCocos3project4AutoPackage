import { _decorator, Button, dragonBones, Label, Node, sys, tween, Vec3 } from "cc";
import { AudioManager } from "../../managers/AudioManager";
import { GameCustomInfo } from "../../configs/config";
import { GameManager } from "../../managers/GameManager";
import super_html_playable from "../../utils/super_html_playable";
import { EndPage } from "./EndPage";
const { ccclass, property } = _decorator;

@ccclass("WinEndPageBrush")
export class WinEndPageBrush extends EndPage {
    @property(Button)
    restartButton: Button = null;

    curScore = 0;
    animateScore() {
        // log("animateScore", this.curScore);
        this.curScore += Math.ceil(GameManager.instance.score / 10);
        const bestScoreLabel = this.node.getChildByName("BestScore").getComponent(Label);
        bestScoreLabel.string = Math.min(this.curScore, GameManager.instance.score) + "";
        // log("this.curScore", this.curScore, GameManager.instance.score);
        if (this.curScore < GameManager.instance.score) {
            this.scheduleOnce(() => {
                this.animateScore();
            }, 0.1);
        }
    }
    show() {
        // log("showWinPanel");
        // if (GameManager.instance.isGameOver) return;
        // GameManager.instance.isGameOver = true;
        super_html_playable.game_end();
        const bestScoreLabel = this.node.getChildByName("BestScore").getComponent(Label);
        if (GameCustomInfo.name === "BlockBrush") {
            AudioManager.instance.playWinEffect();
            this.animateScore();
            const dragon = this.node.getChildByName("Dragon");
            dragon.active = true;
            const dragonAnimation = dragon.getComponent(dragonBones.ArmatureDisplay);
            dragonAnimation.playAnimation("BestScore", 1);
        } else {
            AudioManager.instance.playFailEffect();
            const bestScore = sys.localStorage.getItem("bestScore") || "0";

            if (bestScoreLabel) {
                bestScoreLabel.string = bestScore;
            }
        }
        this.node.active = true;

        const button = this.node.getChildByName("JumpBtn");
        button.on(Node.EventType.TOUCH_END, this.onJumpButtonClick, this);
        // 给button创建一个引诱点击的循环动画
        const scaleUp = new Vec3(1.2, 1.2, 1.2);
        const scaleNormal = new Vec3(1, 1, 1);

        // 方法 1：使用 sequence + repeatForever（最稳定）
        tween(button)
            .sequence(tween().to(0.5, { scale: scaleUp }), tween().to(0.5, { scale: scaleNormal }))
            .repeatForever()
            .start();

        // if (this.audioSource) {
        //     this.audioSource.play();
        // }
    }
}
