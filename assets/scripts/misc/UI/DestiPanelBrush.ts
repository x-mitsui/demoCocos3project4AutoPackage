import { _decorator, Component, find, Label, Node, tween, UIOpacity, UITransform, v3 } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { Tool } from "../../utils/tool";
import { GemDestiUI } from "./GemDestiUI";
import { gameLevelConfigs } from "../../configs/gameLevelConfigs";
import { GameManager } from "../../managers/GameManager";
import { Logger } from "../../utils/logger";
import { AudioManager } from "../../managers/AudioManager";
import { SkinsManager } from "../../configs/Skins/SkinsManager";
const { ccclass, property } = _decorator;

@ccclass("DestiPanel")
export class DestiPanel extends Component {
    topNode: Node = null;
    compGemDestiUIOfPanel: GemDestiUI = null;
    percent: Label = null;

    onLoad() {
        this.topNode = find("Top", this.node);
        const topNodeColor = SkinsManager.getInstance().getTopNodeColor();
        Tool.setNodeGradient(this.topNode, topNodeColor);
        this.compGemDestiUIOfPanel = find("GemDestiUI", this.node)?.getComponent(GemDestiUI);
        this.compGemDestiUIOfPanel.isInitDestiScore = true;
        Logger.info("compGemDestiUIOfPanel:", this.compGemDestiUIOfPanel.removeListeners);
        const uiOpacity =
            this.compGemDestiUIOfPanel.getComponent(UIOpacity) || this.compGemDestiUIOfPanel.addComponent(UIOpacity);
        uiOpacity.opacity = 0;
        this.compGemDestiUIOfPanel.node.setScale(0.8, 0.8, 1);
        this.topNode.scale = v3(1, 0.8, 1);
        const topOpacity = this.topNode.getComponent(UIOpacity) ?? this.topNode.addComponent(UIOpacity);
        topOpacity.opacity = 0;
        this.percent = find("Top/DiffcultyTip/Percent", this.node)?.getComponent(Label);
        this.percent.string = gameLevelConfigs[GameManager.instance.gameLevel].percent * 100 + "%";
        this.scheduleOnce(() => {
            this.play();
        }, 1);
    }

    play() {
        this.playPhase0Ani();
    }

    playPhase0Ani() {
        tween(this.node.getComponent(UIOpacity)).to(0.1, { opacity: 255 }, { easing: "backOut" }).start();
        const topOpacity = this.topNode.getComponent(UIOpacity);
        tween(this.compGemDestiUIOfPanel.node)
            .delay(0.3)
            .call(() => {
                AudioManager.instance.playGemDestiPanelEffect();
            })
            .to(0.3, { scale: v3(1, 1, 1) }, { easing: "backOut" })
            .start();
        tween(this.compGemDestiUIOfPanel.getComponent(UIOpacity))
            .delay(0.3)
            .to(0.3, { opacity: 255 }, { easing: "backOut" })
            .start();
        tween(this.topNode)
            .to(0.3, { scale: v3(1, 1, 1) }, { easing: "backOut" })
            .start();
        tween(topOpacity).to(0.3, { opacity: 255 }, { easing: "backOut" }).start();

        this.scheduleOnce(() => {
            this.playPhase1Ani();
        }, 1);
    }
    // 宝石飞到GemDestiUI各个宝石的位置去，飞行过程同Board.ts中的removeBlock方法
    // gems: 要飞的宝石节点数组，每项包含 gemNode（已在 UI 层）、col、blockIdx
    playPhase1Ani() {
        const ui = find("Canvas/UI");
        const compGemDestiUI = find("Canvas/BG/GemDestiUI")?.getComponent(GemDestiUI);
        const destiDatas = gameLevelConfigs[GameManager.instance.gameLevel].desti;

        const gemItems = this.compGemDestiUIOfPanel.node.children;
        for (let i = destiDatas.length - 1; i >= 0; i--) {
            const gemItemOfPanel = this.compGemDestiUIOfPanel.node.getChildByName(
                `GemDestiItem${destiDatas[i].blockIdx}`,
            );
            const gemNodeOfPanel = gemItemOfPanel.getChildByName("Gem");
            const gemItemOfDesti = compGemDestiUI.node.getChildByName(`GemDestiItem${destiDatas[i].blockIdx}`);
            const gemNodeOfDesti = gemItemOfDesti.getChildByName("Gem");
            const destWorldPos = gemItemOfDesti
                .getComponent(UITransform)
                .convertToWorldSpaceAR(gemNodeOfDesti.position);
            const destLocalPos = gemItemOfPanel.getComponent(UITransform).convertToNodeSpaceAR(destWorldPos);
            // 文字消失
            const destiScoreLabel = gemItemOfPanel.getChildByName("DestiScore");
            const gou = gemItemOfPanel.getChildByName("Gou");
            destiScoreLabel.active = false;
            gou.active = false;
            Tool.flyGemTo(
                gemNodeOfPanel,
                gemItemOfPanel.position,
                destLocalPos,
                i < gemItems.length / 2 ? 0 : 7, // 为了适配接口，这里强行将宝石飞行的列数设置为0和7
                i,
                () => {
                    AudioManager.instance.playGemFly2DestiEffect();
                    this.compGemDestiUIOfPanel.removeListeners(); //移除事件监听
                    eventManager.emit(GameEvent.GEM_COUNT_CHANGE);
                    // gemItemOfPanel.removeFromParent();
                    if (i === 0) {
                        this.scheduleOnce(() => {
                            eventManager.emit(GameEvent.GAME_START);
                            this.node.removeFromParent();
                        }, 0.5);
                    }
                },
            );
        }
        // gems.forEach((item, seqIdx) => {
        //     const startPos = item.gemNode.position.clone();
        //     const worldDest = compGemDestiUI?.getGemWorldPosByBlockIndex(item.blockIdx);
        //     if (!worldDest) return;
        //     const destPos = uiTransform.convertToNodeSpaceAR(worldDest);
        // });
    }
}
