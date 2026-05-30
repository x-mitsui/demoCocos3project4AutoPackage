import { _decorator, dragonBones, Label, Node, Sprite, tween, Vec3 } from "cc";
import { AudioManager } from "../../managers/AudioManager";
import { GameManager } from "../../managers/GameManager";
import { Tool } from "../../utils/tool";
import super_html_playable from "../../utils/super_html_playable";
import { GradientConfig, SkinsManager } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { EndPage } from "./EndPage";
const { ccclass, property } = _decorator;

@ccclass("WinEndPage")
export class WinEndPage extends EndPage {
    Gradient: Node;
    jumpBtn: Node = null;
    bgColor: GradientConfig;
    btnColor: GradientConfig;
    btnTextColor: string;
    scoreColor: string;
    titleBestScoreColor: string;
    titleScoreColor: string;
    onLoad() {
        const winEndPageColors = SkinsManager.getInstance().getWinEndPageColors();
        this.bgColor = winEndPageColors.bestscore_bg;
        this.btnColor = winEndPageColors.bestscore_btn_bg;
        this.btnTextColor = winEndPageColors.bestscore_btn_icon;
        this.scoreColor = winEndPageColors.bestscore_score;
        this.titleBestScoreColor = winEndPageColors.bestscore_parameter1;
        this.titleScoreColor = winEndPageColors.bestscore_parameter3;
        this.Gradient = this.node.getChildByName("Gradient");
        this.jumpBtn = this.node.getChildByName("JumpBtn");
        this.jumpBtn.setScale(0, 0, 1);
        this.initJumpBtnColor();
        this.initDragonBones();
        this.playDragonBone();
    }

    initJumpBtnColor() {
        const jumpBtnSprite = this.jumpBtn.getComponent(Sprite);
        if (!jumpBtnSprite) return;
        const material = jumpBtnSprite.getMaterialInstance(0);
        if (!material) return;

        // gradient.effect 已默认启用 USE_TEXTURE，直接设置属性即可
        material.setProperty("startColor", SkinsManager.hexToColor(this.btnColor.gradientStart));
        material.setProperty("endColor", SkinsManager.hexToColor(this.btnColor.gradientEnd));
        material.setProperty("gradientAngle", this.btnColor.angle);
        material.setProperty("gradientIntensity", this.btnColor.intensity);

        const btnTextLabel = this.jumpBtn.getChildByName("Label").getComponent(Label);
        if (btnTextLabel) {
            btnTextLabel.color = SkinsManager.hexToColor(this.btnTextColor);
        }
    }

    initDragonBones() {
        const DragonBoneContainer = this.node.getChildByName("DragonBoneContainer");
        if (!DragonBoneContainer) return;
        const Title = DragonBoneContainer.getChildByName("TitleBestScore");
        Title.getComponent(dragonBones.ArmatureDisplay).color = SkinsManager.hexToColor(this.titleBestScoreColor);
        const TitleScore = DragonBoneContainer.getChildByName("TitleScore");
        TitleScore.getComponent(dragonBones.ArmatureDisplay).color = SkinsManager.hexToColor(this.titleScoreColor);
    }

    amatureTable = {
        TitleBestScore: "newAnimation_2",
        TitleScore: "newAnimation_3",
        HighLight: "newAnimation_1",
        Fireworks: "newAnimation_4",
    };
    playDragonBone() {
        const DragonBoneContainer = this.node.getChildByName("DragonBoneContainer");
        if (!DragonBoneContainer) return;
        for (const key in this.amatureTable) {
            const amature = DragonBoneContainer.getChildByName(key);
            const dragonBone = amature.getComponent(dragonBones.ArmatureDisplay);
            dragonBone.playAnimation(this.amatureTable[key], 1);
        }
        this.scheduleOnce(() => {
            this.startNumberAnimation();
        }, 0.5);
    }

    startNumberAnimation() {
        const bestScore = this.node.getChildByName("BestScoreLabel");
        const bestScoreValue = GameManager.instance.getBestScore();
        const bestScoreLabel = bestScore.getComponent(Label);

        // 初始化：scale 设为 0，数字设为 0
        bestScore.setScale(0, 0, 1);
        bestScoreLabel.string = "0";

        // 第一步：放大到 scale 1
        tween(bestScoreLabel.node)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
            .call(() => {
                // 第二步：数字从 0 增长到 bestScore（使用 Tool 中的优化版本）
                Tool.animateNumber(
                    bestScoreLabel,
                    0,
                    bestScoreValue,
                    1.0,
                    (current) => {
                        Logger.info("WinEndPage:startNumberAnimation:", "current:", current);
                        AudioManager.instance.playDiEffect();
                    },
                    () => {
                        AudioManager.instance.playShowBtnEffect();
                        this.jumpBtnAnimation();
                    },
                );
            })
            .start();
    }

    jumpBtnAnimation() {
        tween(this.jumpBtn)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
            .start();
    }

    show() {
        Logger.info("WinEndPage:show:", "winPage show");
        super_html_playable.game_end();
        this.node.active = true;

        // AudioManager.instance.playWinEffect();
        AudioManager.instance.playAllEliminateEffect4WinEndPage();
        // AudioManager.instance.playAllRandomEffect();
        this.playDragonBone();

        const button = this.node.getChildByName("JumpBtn");
        button.on(Node.EventType.TOUCH_END, this.onJumpButtonClick, this);
        // 给button创建一个引诱点击的循环动画
        // const scaleUp = new Vec3(1.2, 1.2, 1.2);
        // const scaleNormal = new Vec3(1, 1, 1);

        // // 方法 1：使用 sequence + repeatForever（最稳定）
        // tween(button)
        //     .sequence(tween().to(0.5, { scale: scaleUp }), tween().to(0.5, { scale: scaleNormal }))
        //     .repeatForever()
        //     .start();
    }
}
