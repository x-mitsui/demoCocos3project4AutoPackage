import { _decorator, Component, google, Material, Sprite, Vec2 } from "cc";
import { isPlatformGoogle, isPlatformTiktok } from "../../utils/tool";
const { ccclass, property } = _decorator;

@ccclass("Word")
export class Word extends Component {
    @property({ tooltip: "扫光从左到右完整走一遍的时长（秒）" })
    scanDuration = 5;

    @property({ tooltip: "扫光起点 X（UV，通常小于 0）" })
    scanStartX = -0.35;

    @property({ tooltip: "扫光终点 X（UV，通常大于 1）" })
    scanEndX = 1.35;

    private _mat: Material | null = null;
    private _scanY = 0.5;
    private _elapsed = 0;

    onLoad() {
        if (isPlatformGoogle()) {
            this.node.y -= 300;
        }
        if (isPlatformTiktok()) {
            this.node.y -= 250;
        }
    }
    start() {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        this._mat = sprite.getMaterialInstance(0);
        if (!this._mat) return;

        // 尽量沿用材质里已配置的 Y，只驱动 X 做循环扫光
        const center = this._mat.getProperty("lightCenterPoint");
        if (center instanceof Vec2) {
            this._scanY = center.y;
        } else if (Array.isArray(center) && center.length >= 2) {
            this._scanY = Number(center[1]) || this._scanY;
        }

        this._mat.setProperty("lightCenterPoint", new Vec2(this.scanStartX, this._scanY));
    }

    update(deltaTime: number) {
        if (!this._mat) return;

        const dur = Math.max(0.05, this.scanDuration);
        this._elapsed = (this._elapsed + deltaTime) % dur;
        const t = this._elapsed / dur;
        const x = this.scanStartX + (this.scanEndX - this.scanStartX) * t;
        this._mat.setProperty("lightCenterPoint", new Vec2(x, this._scanY));
    }
}
