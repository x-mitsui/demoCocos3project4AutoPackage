import { _decorator, Label, Node, tween, UIOpacity, Vec3 } from "cc";
import { AudioManager } from "../../managers/AudioManager";
import { GameManager } from "../../managers/GameManager";
import { Tool } from "../../utils/tool";
import super_html_playable from "../../utils/super_html_playable";
import { GradientConfig, SkinsManager } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { EndPage } from "./EndPage";
const { ccclass, property } = _decorator;

@ccclass("LoseEndPage")
export class LoseEndPage extends EndPage {
    Gradient: Node;
    jumpBtn: Node = null;

    bgColor: GradientConfig;
    titleColor: GradientConfig;
    scoreTitleColor: GradientConfig;
    bestScoreTitleColor: GradientConfig;
    scoreColor: GradientConfig;
    bestScoreColor: GradientConfig;
    btnColor: GradientConfig;
    btnTextColor: string;
    Title: Node;
    TitleShadow: Node;
    scoreTitle: Node;
    ScoreLabel: Node;
    ScoreLabelShadow: Node;
    BestScoreLabel: Node;
    BestScoreLabelShadow: Node;
    BestScoreTitle: Node;
    onLoad() {
        const loseEndPageColors = SkinsManager.getInstance().getLoseEndPageColors();
        this.bgColor = loseEndPageColors.gameover_bg;
        this.titleColor = loseEndPageColors.gameover_title;
        this.scoreTitleColor = loseEndPageColors.gameover_score_icon;
        this.bestScoreTitleColor = loseEndPageColors.gameover_bestscore_icon;
        this.scoreColor = loseEndPageColors.gameover_score;
        this.bestScoreColor = loseEndPageColors.gameover_bestscore;
        this.btnColor = loseEndPageColors.gameover_btn_bg;
        this.btnTextColor = loseEndPageColors.gameover_btn_icon;

        this.Gradient = this.node.getChildByName("Gradient");
        this.jumpBtn = this.node.getChildByName("JumpBtn");
        this.Title = this.node.getChildByName("Title");
        this.TitleShadow = this.node.getChildByName("TitleShadow");
        this.scoreTitle = this.node.getChildByName("ScoreTitle");
        this.ScoreLabel = this.node.getChildByName("ScoreLabel");
        this.ScoreLabelShadow = this.node.getChildByName("ScoreLabelShadow");
        this.BestScoreLabel = this.node.getChildByName("BestScoreLabel");
        this.BestScoreLabelShadow = this.node.getChildByName("BestScoreLabelShadow");
        this.BestScoreTitle = this.node.getChildByName("BestScoreTitle");

        this.init();

        this.initJumpBtnColor();

        this.initTitlesColor();

        this.phase0Animation();
    }
    init() {
        this.jumpBtn.setScale(0, 0, 1);
        this.ScoreLabel.setScale(0, 0, 1);
        this.ScoreLabelShadow.setScale(0, 0, 1);
        this.BestScoreLabel.getComponent(Label).string = GameManager.instance.getBestScore().toString();
        this.BestScoreLabelShadow.getComponent(Label).string = GameManager.instance.getBestScore().toString();
    }
    initTitlesColor() {
        // 为 Title 和 TitleShadow 应用渐变
        Tool.setNodeGradient(this.Title, this.titleColor);
        Tool.setNodeGradient(this.TitleShadow, this.titleColor);

        // 为 BestScoreTitle 应用渐变
        Tool.setNodeGradient(this.BestScoreTitle, this.bestScoreTitleColor);

        // 为 scoreTitle应用渐变
        Tool.setNodeGradient(this.scoreTitle, this.scoreTitleColor);
    }
    phase0Animation() {
        // 为每个节点添加 UIOpacity 组件（如果没有）并设置初始透明度为 0
        const nodes = [
            this.Title,
            this.TitleShadow,
            this.BestScoreLabel,
            this.BestScoreLabelShadow,
            this.BestScoreTitle,
        ];

        nodes.forEach((node) => {
            if (!node) return;

            let opacity = node.getComponent(UIOpacity);
            if (!opacity) {
                opacity = node.addComponent(UIOpacity);
            }
            opacity.opacity = 0;

            // 1秒淡入动画
            tween(opacity).to(1, { opacity: 255 }, { easing: "sineOut" }).start();
        });
        this.scheduleOnce(() => {
            this.phase1Animation();
        }, 0.7);
    }
    phase1Animation() {
        const scoreLabels = [this.ScoreLabel, this.ScoreLabelShadow];
        const currentScore = GameManager.instance.score || 500;
        let completedCount = 0;

        scoreLabels.forEach((node, index) => {
            if (!node) return;

            const label = node.getComponent(Label);
            if (!label) return;

            // 初始化：scale 设为 0，数字设为 0
            node.setScale(0, 0, 1);
            label.string = "0";

            // 第一步：放大到 scale 1
            tween(node)
                .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
                .call(() => {
                    // 第二步：数字从 0 增长到 currentScore（使用 Tool 中的优化版本）
                    Tool.animateNumber(label, 0, currentScore, 1.0, undefined, () => {
                        // 只在第一个标签动画完成时触发 phase2Animation
                        // 避免重复触发（因为有两个标签）
                        completedCount++;
                        if (completedCount === 1) {
                            this.phase2Animation();
                        }
                    });
                })
                .start();
        });
    }

    phase2Animation() {
        AudioManager.instance.playShowBtnEffect();
        this.jumpBtn.setScale(0, 0, 1);
        tween(this.jumpBtn)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
            .start();
    }

    initJumpBtnColor() {
        // 为按钮应用渐变（使用 Tool 工具函数）
        Tool.setNodeGradient(this.jumpBtn, this.btnColor);

        // 设置按钮文本颜色
        const btnTextLabel = this.jumpBtn.getChildByName("Label").getComponent(Label);
        if (btnTextLabel) {
            btnTextLabel.color = SkinsManager.hexToColor(this.btnTextColor);
        }
    }

    show() {
        Logger.info("LoseEndPage:show:");
        super_html_playable.game_end();

        this.node.active = true;

        const button = this.node.getChildByName("JumpBtn");
        button.on(Node.EventType.TOUCH_END, this.onJumpButtonClick, this);
        // 给button创建一个引诱点击的循环动画
        // const scaleUp = new Vec3(1.2, 1.2, 1.2);
        // const scaleNormal = new Vec3(1, 1, 1);

        // 方法 1：使用 sequence + repeatForever（最稳定）
        // tween(button)
        //     .sequence(tween().to(0.5, { scale: scaleUp }), tween().to(0.5, { scale: scaleNormal }))
        //     .repeatForever()
        //     .start();
    }
}
