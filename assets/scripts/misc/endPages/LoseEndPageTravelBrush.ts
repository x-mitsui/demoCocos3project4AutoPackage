import { _decorator, dragonBones, Node, tween, UIOpacity, Vec3 } from "cc";
import { Tool } from "../../utils/tool";
import super_html_playable from "../../utils/super_html_playable";
import { GradientConfig, SkinsManager } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { EndPage } from "./EndPage";
import { GemContainer4Travel } from "../UI/GemContainer4Travel";
import { AudioManager } from "../../managers/AudioManager";
const { ccclass, property } = _decorator;

@ccclass("LoseEndPageTravelBrush")
export class LoseEndPageTravelBrush extends EndPage {
    isCanReplay: boolean = true;
    Gradient: Node;
    jumpBtn: Node = null;
    bgColor: GradientConfig;
    titleColor: GradientConfig;
    btnColor: GradientConfig;
    collectionTitle: Node;
    gemContainer4Travel: GemContainer4Travel = null;

    onLoad() {
        const loseEndPageColors = SkinsManager.getInstance().getLoseEndPageColors();
        this.bgColor = loseEndPageColors.gameover_bg;
        this.titleColor = loseEndPageColors.gameover_title;

        this.btnColor = loseEndPageColors.gameover_btn_bg;

        this.Gradient = this.node.getChildByName("Gradient");
        this.jumpBtn = this.node.getChildByName("JumpBtn");
        this.collectionTitle = this.node.getChildByName("CollectionTitle");
        this.gemContainer4Travel = this.node.getChildByName("GemContainer4Travel").getComponent(GemContainer4Travel);

        this.initJumpBtnColor();

        this.initTitlesColor();
    }
    protected start(): void {
        this.gemContainer4Travel.initGemStates4Lose();
        this.show();
    }
    initTitlesColor() {
        this.collectionTitle.getComponent(UIOpacity).opacity = 0;
    }
    amatureTable = {
        TitleBestScore: "newAnimation",
    };
    phase0Animation() {
        const DragonBoneContainer = this.node.getChildByName("DragonBoneContainer");
        if (!DragonBoneContainer) return;
        for (const key in this.amatureTable) {
            const amature = DragonBoneContainer.getChildByName(key);
            const dragonBone = amature.getComponent(dragonBones.ArmatureDisplay);
            dragonBone.playAnimation(this.amatureTable[key], 1);
        }
        this.scheduleOnce(() => {
            this.phase1Animation();
        }, 0.3);
    }
    phase1Animation() {
        tween(this.collectionTitle.getComponent(UIOpacity))
            .to(0.5, { opacity: 255 }, { easing: "sineOut" })
            .call(() => {
                this.phase2Animation();
            })
            .start();
    }

    phase2Animation() {
        this.gemContainer4Travel.startGemAnimation4Lose(() => {
            this.phase3Animation();
        });
    }
    phase3Animation() {
        Logger.info("LoseEndPageTravel:phase3Animation:");
        tween(this.jumpBtn.getComponent(UIOpacity)).to(0.5, { opacity: 255 }, { easing: "sineOut" }).start();
        tween(this.jumpBtn)
            .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: "sineOut" })
            .start();
    }

    initJumpBtnColor() {
        // 为按钮应用渐变（使用 Tool 工具函数）
        Tool.setNodeGradient(this.jumpBtn, this.btnColor);
        this.jumpBtn.getComponent(UIOpacity).opacity = 0;
        this.jumpBtn.setScale(0, 0, 1);
    }

    show() {
        Logger.info("LoseEndPage:show:");
        super_html_playable.game_end();

        this.node.active = true;
        AudioManager.instance.playFailEffect();
        const button = this.node.getChildByName("JumpBtn");
        button.on(Node.EventType.TOUCH_END, this.onJumpButtonClick, this);
        this.phase0Animation();
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
