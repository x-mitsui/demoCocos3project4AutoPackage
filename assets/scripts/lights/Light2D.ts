import { _decorator, Color, Component, Vec3 } from "cc";

const { ccclass, property } = _decorator;

const _tmpWorld = new Vec3();

/**
 * 2D 屏幕空间点光源占位：挂在火把、玩家光晕等节点上，由 {@link LightUniformBridge2D} 读取并写入材质。
 */
@ccclass("Light2D")
export class Light2D extends Component {
    private static readonly _registry: Light2D[] = [];

    @property({ tooltip: "关闭时不参与叠加" })
    activeLight = true;

    @property({ type: Color, tooltip: "光源颜色（线性近似，与引擎 Color 一致）" })
    color: Color = new Color(255, 220, 160, 255);

    @property({ tooltip: "屏幕空间半径（像素），与 Bridge 写入的 screenSize 一致" })
    radius = 180;

    @property({ tooltip: "强度系数" })
    strength = 1.2;

    @property({ tooltip: "衰减指数，越大边缘越硬" })
    falloff = 1.35;

    onEnable() {
        Light2D._register(this);
    }

    onDisable() {
        Light2D._unregister(this);
    }

    /** 供 {@link LightUniformBridge2D} 遍历（含 inactive，由 Bridge 过滤） */
    public static gather(out: Light2D[]): void {
        out.length = 0;
        for (let i = 0; i < Light2D._registry.length; i++) {
            out.push(Light2D._registry[i]);
        }
    }

    private static _register(c: Light2D) {
        const a = Light2D._registry;
        if (a.indexOf(c) >= 0) {
            return;
        }
        a.push(c);
    }

    private static _unregister(c: Light2D) {
        const a = Light2D._registry;
        const i = a.indexOf(c);
        if (i >= 0) {
            a.splice(i, 1);
        }
    }

    /** 世界坐标（用于 worldToScreen） */
    public sampleWorld(): Vec3 {
        return this.node.getWorldPosition(_tmpWorld);
    }
}
