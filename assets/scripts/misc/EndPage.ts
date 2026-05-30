import {
    _decorator,
    Button,
    Component,
    dragonBones,
    Label,
    log,
    Node,
    ParticleSystem2D,
    sys,
    tween,
    Vec3,
} from "cc";
import { AudioManager } from "../managers/AudioManager";
import { jump2DownloadPage } from "../utils/tool";
import { GameCustomInfo } from "../configs/config";
import { GameManager } from "../managers/GameManager";
const { ccclass, property } = _decorator;

@ccclass("EndPage")
export class EndPage extends Component {
    @property(Node)
    winPanel: Node = null;

    @property(Button)
    restartButton: Button = null;

    @property(Node)
    Particle: Node = null;

    @property(Node)
    flag1: Node = null;
    @property(Node)
    flag2: Node = null;

    playParticle() {
        // log("playParticle");
        // Particle可以在数独都完成后立即播放
        if (this.Particle) {
            this.Particle.active = true;
            this.Particle.getComponent(ParticleSystem2D)?.resetSystem();
        }

        // 播放胜利音效
        // AudioManager.instance.playEffect(this.winAudio);

        // 延迟切换到winPanel，等待高亮动画播放完
        // 最长的动画时间大概是 (4 + 4) * 0.1 + 0.3 + 0.5 ≈ 1.6s，这里取 2s 安全值

        this.scheduleOnce(() => {
            this.showWinPanel();
        }, 2);
    }
    curScore = 0;
    animateScore() {
        // log("animateScore", this.curScore);
        this.curScore += Math.ceil(GameManager.instance.score / 10);
        const bestScoreLabel = this.winPanel
            .getChildByName("BestScore")
            .getComponent(Label);
        bestScoreLabel.string =
            Math.min(this.curScore, GameManager.instance.score) + "";
        // log("this.curScore", this.curScore, GameManager.instance.score);
        if (this.curScore < GameManager.instance.score) {
            this.scheduleOnce(() => {
                this.animateScore();
            }, 0.1);
        }
    }
    showWinPanel() {
        // log("showWinPanel");
        const bestScoreLabel = this.winPanel
            .getChildByName("BestScore")
            .getComponent(Label);
        if (GameCustomInfo.name === "BlockBrush") {
            AudioManager.instance.playWinEffect();
            this.animateScore();
            const dragon = this.winPanel.getChildByName("dragon");
            dragon.active = true;
            const dragonAnimation = dragon.getComponent(
                dragonBones.ArmatureDisplay
            );
            dragonAnimation.playAnimation("BestScore", 1);
        } else {
            AudioManager.instance.playFailEffect();
            const bestScore = sys.localStorage.getItem("bestScore") || "0";

            if (bestScoreLabel) {
                bestScoreLabel.string = bestScore;
            }
        }
        this.winPanel.active = true;

        const button = this.winPanel.getChildByName("jump");
        button.on(Node.EventType.TOUCH_END, this.onJumpButtonClick, this);
        // 给button创建一个引诱点击的循环动画
        const scaleUp = new Vec3(1.2, 1.2, 1.2);
        const scaleNormal = new Vec3(1, 1, 1);

        // 方法 1：使用 sequence + repeatForever（最稳定）
        tween(button)
            .sequence(
                tween().to(0.5, { scale: scaleUp }),
                tween().to(0.5, { scale: scaleNormal })
            )
            .repeatForever()
            .start();

        this.playFlagsAni();
        // if (this.audioSource) {
        //     this.audioSource.play();
        // }
    }
    onJumpButtonClick() {
        jump2DownloadPage();
    }
    playFlagsAni() {
        const startY = 1240; // 起始位置
        const endY = 969; // 目标位置
        const bounceHeight1 = 999; // 第一次反弹高度
        const bounceHeight2 = 979; // 第二次反弹高度
        // 抽取出旗帜动画的公共逻辑
        const createFlagBounceTween = (flag: Node) =>
            tween(flag)
                // 第一次下落
                .to(
                    0.2,
                    { position: new Vec3(0, endY, 0) },
                    { easing: "quadIn" }
                )
                // 第一次反弹
                .to(
                    0.15,
                    { position: new Vec3(0, bounceHeight1, 0) },
                    { easing: "quadOut" }
                )
                // 第二次下落
                .to(
                    0.1,
                    { position: new Vec3(0, endY, 0) },
                    { easing: "quadIn" }
                )
                // 第二次反弹
                .to(
                    0.08,
                    { position: new Vec3(0, bounceHeight2, 0) },
                    { easing: "quadOut" }
                )
                // 最终稳定
                .to(
                    0.06,
                    { position: new Vec3(0, endY, 0) },
                    { easing: "quadIn" }
                );

        // 为两个旗帜分别创建并启动动画
        createFlagBounceTween(this.flag1).start();
        this.scheduleOnce(() => {
            createFlagBounceTween(this.flag2).start();
        }, 1);
    }
}
