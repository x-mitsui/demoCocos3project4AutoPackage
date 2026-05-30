import {
    _decorator,
    Color,
    Component,
    instantiate,
    Label,
    ParticleSystem2D,
    Prefab,
    Quat,
    Sprite,
    tween,
    UITransform,
    v3,
} from "cc";
import { GameManager } from "../../managers/GameManager";
import { Logger } from "../../utils/logger";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { GemSkinsManager } from "../../managers/GemSkinsManager";
const { ccclass, property } = _decorator;

@ccclass("GemDestiUI")
export class GemDestiUI extends Component {
    @property({ type: Prefab })
    gemDestItemPrefab: Prefab = null;
    @property({ type: Boolean, tooltip: "是否初始化目标数量" })
    isInitDestiScore: boolean = true;
    @property({ type: Color })
    destiScoreColor: Color = new Color(255, 255, 255, 255);
    destiDatas: { blockIdx: number; destiScore: number }[] = [];
    onLoad() {
        this.initDatasAndViews();
        this.initDestiScoreColor();
        // this.initLayout([]);
        eventManager.on(GameEvent.GEM_COUNT_CHANGE, this.updateGemCount, this);
    }
    onDestroy() {
        this.removeListeners();
    }
    removeListeners() {
        eventManager.off(GameEvent.GEM_COUNT_CHANGE, this.updateGemCount, this);
    }
    initDestiScoreColor() {
        for (let i = 0; i < this.destiDatas.length; i++) {
            const gemDestItem = this.node.getChildByName(`GemDestiItem${this.destiDatas[i].blockIdx}`);
            const destiScoreLabel = gemDestItem.getChildByName("DestiScore");
            if (destiScoreLabel) {
                destiScoreLabel.getComponent(Label).color = this.destiScoreColor;
            }
        }
    }
    updateGemCount() {
        Logger.info("pareant:", this.node.parent.parent.name);
        const gemConfig = GameManager.instance.gemConfig;
        Logger.info("GemDestiUI:updateGemCount:", `[GemDestiUI] 更新宝石数量: ${JSON.stringify(gemConfig)} `);

        for (let i = 0; i < this.destiDatas.length; i++) {
            const data = gemConfig[i];
            const gemDestItem = this.node.getChildByName(`GemDestiItem${data.blockIdx}`);
            // 目标数量部分
            const destiScoreLabel = gemDestItem.getChildByName("DestiScore");
            if (destiScoreLabel) {
                const str = destiScoreLabel.getComponent(Label).string;
                const newScore = gemConfig[i].destiScore;
                if (str !== newScore.toString()) {
                    destiScoreLabel.getComponent(Label).string = newScore.toString();
                    destiScoreLabel.getComponent(Label).color = this.destiScoreColor;
                } else {
                    continue; // 如果没改变就跳过动画
                }
            }
            tween(destiScoreLabel)
                .to(0.1, { scale: v3(1.1, 1.1, 1) }, { easing: "backOut" })
                .to(0.1, { scale: v3(1, 1, 1) }, { easing: "backIn" })
                .start();
            // 宝石部分
            const gem = gemDestItem.getChildByName("Gem");
            tween(gem)
                .to(0.1, { scale: v3(0.9, 0.9, 1) }, { easing: "backOut" })
                .to(0.1, { scale: v3(0.8, 0.8, 1) }, { easing: "backIn" })
                .start();
            // 宝石粒子部分
            const particle = gem.getChildByName("Particle2D");
            particle.active = data.destiScore >= 0;
            if (data.destiScore >= 0) {
                particle.getComponent(ParticleSystem2D).resetSystem();
            }
            // ✅部分
            if (data.destiScore <= 0) {
                destiScoreLabel.active = false;
                const gou = gemDestItem.getChildByName("Gou");
                gou.scale = v3(1.5, 1.5, 1);
                gou.rotation = Quat.fromAngleZ(new Quat(), 10);
                if (gou) {
                    tween(gou)
                        .parallel(
                            tween(gou).to(0.3, { scale: v3(1, 1, 1) }, { easing: "backOut" }),
                            tween(gou).to(0.3, { rotation: Quat.fromAngleZ(new Quat(), 0) }, { easing: "backOut" }),
                            tween(gou.getComponent(Sprite))
                                .to(0.3, { color: new Color(255, 255, 255, 255) }, { easing: "backOut" })
                                .call(() => {
                                    if (GameManager.instance.isAllGemDestiScoreAchieved()) {
                                        // GameManager.instance.playEndPage(true);
                                        eventManager.emit(GameEvent.GAME_END, true);
                                        return;
                                    }
                                }),
                        )
                        .start();
                }
            }

            // 半透明shader圆形
            const spriteSplash = gem.getChildByName("SpriteSplash");
            const sp = spriteSplash.getComponent(Sprite);

            tween(sp)
                .to(0.1, { color: Color.WHITE }, { easing: "backOut" })
                .to(0.1, { color: new Color(255, 255, 255, 0) }, { easing: "backIn" })
                .call(() => {})
                .start();
        }
        // for (let i = gemConfig.length - 1; i >= 0; i--) {
        //     const data = gemConfig[i];
        //     const index = this.destiDatas.findIndex((item) => item.blockIdx === data.blockIdx);
        //     this.destiDatas[index].destiScore = data.destiScore;
        //     const gemDestItem = this.node.getChildByName(`GemDestiItem${data.blockIdx}`);
        //     const leftScore = this.destiDatas[index].destiScore;
        //     let destiScoreLabel = gemDestItem.getChildByName("DestiScore");
        //     if (destiScoreLabel) {
        //         destiScoreLabel.getComponent(Label).string = leftScore.toString();
        //     }
        //     const gem = gemDestItem.getChildByName("Gem");
        //     const particle = gem.getChildByName("Particle2D");
        //     particle.active = leftScore >= 0;
        //     if (leftScore >= 0) {
        //         particle.getComponent(ParticleSystem2D).resetSystem();
        //     }
        //     if (leftScore <= 0) {
        //         destiScoreLabel.active = false;
        //         const gou = gemDestItem.getChildByName("Gou");
        //         gou.scale = v3(1.5, 1.5, 1);
        //         gou.rotation = Quat.fromAngleZ(new Quat(), 10);
        //         if (gou) {
        //             tween(gou)
        //                 .parallel(
        //                     tween(gou).to(0.3, { scale: v3(1, 1, 1) }, { easing: "backOut" }),
        //                     tween(gou).to(0.3, { rotation: Quat.fromAngleZ(new Quat(), 0) }, { easing: "backOut" }),
        //                     tween(gou.getComponent(Sprite)).to(
        //                         0.3,
        //                         { color: new Color(255, 255, 255, 255) },
        //                         { easing: "backOut" },
        //                     ),
        //                 )
        //                 .start();
        //         }
        //     }
        //     const spriteSplash = gem.getChildByName("SpriteSplash");
        //     const sp = spriteSplash.getComponent(Sprite);

        //     tween(sp)
        //         .to(0.1, { color: Color.WHITE }, { easing: "backOut" })
        //         .to(0.1, { color: new Color(255, 255, 255, 0) }, { easing: "backIn" })
        //         .call(() => {})
        //         .start();
        //     tween(gem)
        //         .to(0.1, { scale: v3(0.9, 0.9, 1) }, { easing: "backOut" })
        //         .to(0.1, { scale: v3(0.8, 0.8, 1) }, { easing: "backIn" })
        //         .start();
        //     tween(destiScoreLabel)
        //         .to(0.1, { scale: v3(1.1, 1.1, 1) }, { easing: "backOut" })
        //         .to(0.1, { scale: v3(1, 1, 1) }, { easing: "backIn" })
        //         .start();
        // }
    }
    initDatasAndViews() {
        this.destiDatas = GameManager.instance.gemConfig;
        if (!this.destiDatas) return;
        for (let i = 0; i < this.destiDatas.length; i++) {
            const gemDestItem = instantiate(this.gemDestItemPrefab);
            Logger.info("GemDestiUI:initDatasAndViews", "this.destiDatas[i].blockIdx:", this.destiDatas[i].blockIdx);
            gemDestItem.name = `GemDestiItem${this.destiDatas[i].blockIdx}`;
            gemDestItem.parent = this.node;
            // 宝石部分
            const gem = gemDestItem.getChildByName("Gem");
            const gemSprite = gem.getComponent(Sprite);
            gemSprite.spriteFrame = GemSkinsManager.instance.getSpriteFrameByBlockIndex(this.destiDatas[i].blockIdx);
            // 目标数量部分
            const destiScoreLabel = gemDestItem.getChildByName("DestiScore");
            if (!this.isInitDestiScore) continue;
            if (destiScoreLabel) {
                destiScoreLabel.getComponent(Label).string = this.destiDatas[i].destiScore.toString();
            }
        }
    }
    initLayout(destiConf: { blockIdx: number; destiScore: number }[]) {
        // const layout = this.node.getComponent(Layout);
        // layout.spacingX = 100;
    }
    getGemWorldPosByIndex(index: number) {
        const gemDestItem = this.node.children[index];
        const gem = gemDestItem.getChildByName("Gem");

        return gem.getComponent(UITransform).convertToWorldSpaceAR(v3(0, 0, 0));
    }
    getGemWorldPosByBlockIndex(blockIdx: number) {
        const index = this.destiDatas.findIndex((item) => item.blockIdx === blockIdx);
        Logger.info("GemDestiUI:getGemWorldPosByBlockIndex:", `[GemDestiUI] 获取宝石世界位置: ${blockIdx}, ${index} `);
        return this.getGemWorldPosByIndex(index);
    }
}
