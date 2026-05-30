import { _decorator, dragonBones, instantiate, Label, Node, Prefab, Sprite, tween, UIOpacity, Vec3 } from "cc";
import { AudioManager } from "../../managers/AudioManager";
import { GameManager } from "../../managers/GameManager";
import { Tool } from "../../utils/tool";
import super_html_playable from "../../utils/super_html_playable";
import { GradientConfig, SkinsManager } from "../../configs/Skins/SkinsManager";
import { Logger } from "../../utils/logger";
import { EndPage } from "./EndPage";
import { GemContainer4Travel } from "../UI/GemContainer4Travel";
const { ccclass, property } = _decorator;

@ccclass("WinEndPageTravel")
export class WinEndPageTravel extends EndPage {
    isCanReplay: boolean = false;
    Gradient: Node;
    jumpBtn: Node = null;
    bgColor: GradientConfig;
    btnColor: GradientConfig;
    btnTextColor: string;
    scoreColor: string;
    titleBestScoreColor: string;
    titleScoreColor: string;
    collectionTitle: Node;
    gemConfigs: { blockIdx: number; destiScore: number }[] = [];
    gemContainer4Travel: GemContainer4Travel = null;
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
        this.gemContainer4Travel = this.node.getChildByName("GemContainer4Travel").getComponent(GemContainer4Travel);

        this.gemConfigs = GameManager.instance.gemConfig;
        this.collectionTitle = this.node.getChildByName("CollectionTitle");
        this.collectionTitle.getComponent(UIOpacity).opacity = 0;
        this.initJumpBtnColor();
        this.initDragonBones();
    }
    start() {
        this.gemContainer4Travel.initGemStates4Win();
        this.phase0Animation();
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
        // Title.getComponent(dragonBones.ArmatureDisplay).color = SkinsManager.hexToColor(this.titleBestScoreColor);

        this.collectionTitle.getComponent(Label).color = SkinsManager.hexToColor(this.titleScoreColor);
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
            .to(0.3, { opacity: 255 }, { easing: "sineOut" })
            .call(() => {
                this.phase2Animation();
            })
            .start();
    }
    phase2Animation() {
        this.gemContainer4Travel.startGemAnimation4Win(() => {
            this.jumpBtnAnimation();
        });
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

        AudioManager.instance.playWinEffect();
        this.phase0Animation();

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
