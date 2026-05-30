import { _decorator, Color, Component, Material, Sprite, UIOpacity, UITransform } from "cc";
import { BlockSize } from "../../configs/config";
import { Logger } from "../../utils/logger";

const { ccclass, property } = _decorator;

@ccclass("SuperBlock")
export abstract class SuperBlock extends Component {
    protected _sprite: Sprite = null;
    protected _materialInstance: Material = null;
    @property({ tooltip: "只为了调试，显示颜色索引" })
    blockIndex: number = 0;

    @property({ tooltip: "只为了调试，显示行偏移量 " })
    offset2FirstBlockRow = 0;
    @property({ tooltip: "只为了调试，显示列偏移量 " })
    offset2FirstBlockCol = 0;

    originalBlockIndex: number = 0;

    onLoad() {
        // 获取当前节点的 Sprite 组件
        this._sprite = this.getComponent(Sprite);
        if (!this._sprite) {
            Logger.error("[BlockShaderSkin] 当前节点没有 Sprite 组件！");
            return;
        }

        // 为每个实例克隆独立的材质
        if (this._sprite.customMaterial) {
            // getMaterialInstance(0) 会自动克隆材质并设置给 Sprite
            this._materialInstance = this._sprite.getMaterialInstance(0);
            if (!this._materialInstance) {
                Logger.error("[BlockShaderSkin] 无法获取材质实例！");
                return;
            }
        } else {
            Logger.info("[BlockShaderSkin] Sprite 没有设置 customMaterial！");
            return;
        }
    }

    get isOffset2FirstBlockZero() {
        return this.offset2FirstBlockRow === 0 && this.offset2FirstBlockCol === 0;
    }

    abstract init(blockIndex: number);
    abstract switchSkin(blockIndex: number, skinSystemIndex?: number);

    initSize() {
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(BlockSize.width, BlockSize.height);
        }
    }
    setOpacity(opacity: number) {
        const compSprite = this.node.getComponent(Sprite);
        if (compSprite) {
            compSprite.color = new Color(255, 255, 255, opacity);
        }
        const uiOpacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        uiOpacity.opacity = opacity;
    }
    setBright() {
        this.setBrightness(1.2);
    }
    resetBright() {
        this.setBrightness(1);
    }
    setBrightness(brightness: number) {
        if (this._materialInstance) {
            this._materialInstance.setProperty("brightness", brightness);
        }
    }
}
