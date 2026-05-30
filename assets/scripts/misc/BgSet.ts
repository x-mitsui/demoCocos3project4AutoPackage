import { _decorator, Component, Material, Node, Sprite, SpriteFrame, Tween, tween, UITransform } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { GameManager } from "../managers/GameManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("BgSet")
export class BgSet extends Component {
    @property(SpriteFrame)
    bgSpriteFrame: SpriteFrame = null;
    @property({ tooltip: "呼吸峰值亮度" })
    breathePeakBrightness: number = 1.2;
    @property({ tooltip: "单次呼吸时长（秒）" })
    breatheDuration: number = 1;
    @property({ type: Material })
    breatheMaterial: Material = null;
    @property({ tooltip: "背景数量" })
    bgCount: number = 60;

    private _breatheTweens: Tween<{ brightness: number }>[] = [];
    protected bgs: Sprite[] = [];

    protected onLoad(): void {
        const contentSize = this.node.getChildByName("bg").getComponent(UITransform).contentSize;
        Logger.info("BgSet:onLoad:contentSize:", contentSize);
        this.bgs.push(this.node.getChildByName("bg").getComponent(Sprite));
        for (let i = 0; i < this.bgCount; i++) {
            const nodeName = "bgSprite" + i;
            if (this.node.getChildByName(nodeName)) continue;
            const childNode = new Node(nodeName);
            childNode.parent = this.node;
            childNode.setPosition((-this.bgCount / 2 + i) * contentSize.width, 0, 0);
            const sprite = childNode.addComponent(Sprite);
            sprite.spriteFrame = this.bgSpriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            if (this.breatheMaterial) sprite.customMaterial = this.breatheMaterial;
            childNode.getComponent(UITransform).setContentSize(contentSize.width, contentSize.height);
            this.bgs.push(sprite);
        }
        eventManager.on(GameEvent.GAME_CLEAR_ANIMATION_START, this._onClearStart, this);
    }

    protected onDestroy(): void {
        eventManager.off(GameEvent.GAME_CLEAR_ANIMATION_START, this._onClearStart, this);
        this._stopAll();
    }

    private _onClearStart(_blockIndex: number) {
        if (!GameManager.instance.enableBackgroundBreatheAnimation) return;
        this._stopAll();

        this.node.children.forEach((child, i) => {
            const mat = child.getComponent(Sprite)?.getMaterialInstance(0);
            if (!mat) return;

            const applyBrightness = (b: number) => mat.setProperty("brightness", b);
            const proxy = { brightness: 1.0 };
            // 每个子节点错开 0.15s，形成波浪感
            const delay = i * 0.15;

            const t = tween(proxy)
                // .delay(delay)
                .to(
                    this.breatheDuration,
                    { brightness: this.breathePeakBrightness },
                    {
                        easing: "sineOut",
                        onUpdate: () => applyBrightness(proxy.brightness),
                    },
                )
                .to(
                    this.breatheDuration,
                    { brightness: 1.0 },
                    {
                        easing: "sineIn",
                        onUpdate: () => applyBrightness(proxy.brightness),
                    },
                )
                .call(() => applyBrightness(1.0))
                .start();

            this._breatheTweens.push(t);
        });
    }

    private _stopAll() {
        this._breatheTweens.forEach((t) => t.stop());
        this._breatheTweens = [];
    }
}
