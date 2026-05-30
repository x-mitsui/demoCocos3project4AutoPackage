import {
    _decorator,
    Component,
    dragonBones,
    instantiate,
    Label,
    Node,
    Prefab,
    Sprite,
    tween,
    UIOpacity,
    Vec3,
} from "cc";
import { GameManager } from "../../managers/GameManager";
import { GemSkinsManager } from "../../managers/GemSkinsManager";
import { Logger } from "../../utils/logger";
import { AudioManager } from "../../managers/AudioManager";
const { ccclass, property } = _decorator;

@ccclass("GemContainer4Travel")
export class GemContainer4Travel extends Component {
    @property({ type: Prefab })
    gemDestItem4WinEndPrefab: Prefab = null;
    gemConfigs: { blockIdx: number; destiScore: number }[] = [];
    onLoad() {
        this.gemConfigs = GameManager.instance.gemConfig;
        this.initGemDestItem4Travel();
    }
    initGemDestItem4Travel() {
        for (let i = 0; i < this.gemConfigs.length; i++) {
            const gemDestItem = instantiate(this.gemDestItem4WinEndPrefab);
            gemDestItem.name = `GemDestItem4Travel${this.gemConfigs[i].blockIdx}`;
            gemDestItem.parent = this.node;
            // 宝石皮肤部分
            const gem = gemDestItem.getChildByName("Gem");
            const gemSprite = gem.getComponent(Sprite);
            gemSprite.spriteFrame = GemSkinsManager.instance.getSpriteFrameByBlockIndex(this.gemConfigs[i].blockIdx);
        }
    }
    startGemAnimation4Win(callback: () => void) {
        const gemContainer = this.node;
        let dragonPlayedCount = 0;
        for (let i = 0; i < this.gemConfigs.length; i++) {
            const gemItem = gemContainer.getChildByName(`GemDestItem4Travel${this.gemConfigs[i].blockIdx}`);
            gemItem.getComponent(UIOpacity).opacity = 255;

            // 目标数量部分
            let destiScore = this.gemConfigs[i].destiScore;
            const destiScoreLabel = gemItem.getChildByName("DestiScore");
            destiScore = 0;
            if (destiScore > 0) {
                destiScoreLabel.active = true;
                destiScoreLabel.getComponent(Label).string = destiScore.toString();
            } else {
                destiScoreLabel.active = false;
                // 宝石动画部分
                const dragon = gemItem.getChildByName("Dragon");
                dragon.active = true;
                const animationName = `${this.gemConfigs[i].blockIdx}`;
                Logger.info("animationName:", animationName);
                const dragonAnimation = dragon.getComponent(dragonBones.ArmatureDisplay);
                dragonAnimation.on(
                    dragonBones.EventObject.COMPLETE,
                    () => {
                        dragonPlayedCount++;
                        if (dragonPlayedCount === this.gemConfigs.length) {
                            callback?.();
                        }
                    },
                    this,
                );
                dragonAnimation.playAnimation(animationName, 1);
            }
        }
    }
    initGemStates4Win() {
        // 初始隐藏宝石
        const gemContainer = this.node;
        for (let i = 0; i < this.gemConfigs.length; i++) {
            const gemItem = gemContainer.getChildByName(`GemDestItem4Travel${this.gemConfigs[i].blockIdx}`);
            let compUIOpacity = gemItem.getComponent(UIOpacity);
            if (!compUIOpacity) {
                compUIOpacity = gemItem.addComponent(UIOpacity);
            }
            compUIOpacity.opacity = 0;
        }
    }
    initGemStates4Lose() {
        // 初始隐藏宝石
        const gemContainer = this.node;
        for (let i = 0; i < this.gemConfigs.length; i++) {
            const gemItem = gemContainer.getChildByName(`GemDestItem4Travel${this.gemConfigs[i].blockIdx}`);
            gemItem.setScale(0, 0, 1);
        }
    }
    startGemAnimation4Lose(callback: () => void) {
        AudioManager.instance.playEndPageShowGemEffect();
        const gemContainer = this.node;
        const commonCallback = () => {
            playedCount++;
            if (playedCount === this.gemConfigs.length) {
                callback?.();
            }
        };
        let playedCount = 0;
        for (let i = 0; i < this.gemConfigs.length; i++) {
            const blockIdx = this.gemConfigs[i].blockIdx;
            const destiScore = this.gemConfigs[i].destiScore;
            const gemItem = gemContainer.getChildByName(`GemDestItem4Travel${blockIdx}`);
            if (destiScore > 0) {
                tween(gemItem)
                    .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" })
                    .call(() => {
                        // 显示目标
                        const destiScoreLabel = gemItem.getChildByName("DestiScore");
                        destiScoreLabel.active = true;
                        destiScoreLabel.getComponent(Label).string = this.gemConfigs[i].destiScore.toString();
                        commonCallback();
                    })
                    .start();
            } else {
                gemItem.setScale(1, 1, 1);
                const dragon = gemItem.getChildByName("Dragon");
                dragon.active = true;
                const animationName = `${blockIdx}`;
                const dragonAnimation = dragon.getComponent(dragonBones.ArmatureDisplay);
                dragonAnimation.on(
                    dragonBones.EventObject.COMPLETE,
                    () => {
                        commonCallback();
                    },
                    this,
                );
                dragonAnimation.playAnimation(animationName, 1);
            }
        }
    }
}
