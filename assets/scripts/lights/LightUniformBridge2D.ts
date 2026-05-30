import {
    _decorator,
    Camera,
    Color,
    Component,
    Material,
    Sprite,
    Vec3,
    Vec4,
    view,
} from "cc";
import { Light2D } from "./Light2D";

const { ccclass, property } = _decorator;

const MAX_LIGHTS = 8;
const _scratchLights: Light2D[] = [];
const _screen = new Vec3();
const _prs = [new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4()];
const _cf = [new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4(), new Vec4()];

/**
 * 每帧把 {@link Light2D} 同步到「全屏采样」材质（lightScreen2D.effect）。
 *
 * 使用步骤概要：
 * 1. 按《光照系统-CocosCreator3.8从零搭建指南》接好「场景 → RT / 后效」链路，全屏片元能采样到未调制的场景颜色。
 * 2. 该全屏材质使用工程内 `lightScreen2D` Effect；将**材质实例**赋给本组件的 `targetMaterial`，或赋 `targetSprite` 用其 `getMaterialInstance(0)`。
 * 3. 拖入用于 `worldToScreen` 的 `targetCamera`（与玩家看到的游戏画面一致）。
 * 4. 在场景里挂若干 `Light2D`；调节半径为像素、颜色与强度。
 *
 * 若亮斑与物体错位：试切换 `flipScreenY`，并确认 `screenSize` 与 RT / 视口像素一致。
 */
@ccclass("LightUniformBridge2D")
export class LightUniformBridge2D extends Component {
    @property({ type: Camera, tooltip: "用于 worldToScreen，应与玩家所看游戏画面一致" })
    targetCamera: Camera | null = null;

    @property({ type: Material, tooltip: "已挂 lightScreen2D 的材质实例（勿改磁盘上的共享资源）" })
    targetMaterial: Material | null = null;

    @property({ type: Sprite, tooltip: "若未指定 targetMaterial，则用该 Sprite 的材质实例" })
    targetSprite: Sprite | null = null;

    @property({ type: Color, tooltip: "环境调制色（夜晚偏蓝灰等）" })
    modulateColor: Color = new Color(72, 82, 107, 255);

    @property({ tooltip: "屏幕空间 Y 是否与 worldToScreen 相反时勾选" })
    flipScreenY = false;

    private _mat: Material | null = null;

    onLoad() {
        this._resolveMaterial();
    }

    lateUpdate() {
        this._resolveMaterial();
        const mat = this._mat;
        const cam = this.targetCamera;
        if (!mat || !cam || !cam.node.activeInHierarchy) {
            return;
        }

        // 与 ScreenLightsRtOverlay2D 的 RT 像素尺寸一致（优先可见区像素，避免与片元 v_uv 乘 screenSize 错位）
        const visPx = view.getVisibleSizeInPixel();
        let sw = Math.max(1, Math.floor(visPx.width));
        let sh = Math.max(1, Math.floor(visPx.height));
        if (!Number.isFinite(sw) || !Number.isFinite(sh)) {
            const rect = view.getViewportRect();
            sw = Math.max(1, Math.floor(rect.width));
            sh = Math.max(1, Math.floor(rect.height));
        }
        mat.setProperty("screenSize", new Vec4(sw, sh, 0, 0));
        mat.setProperty("modulate_color", this.modulateColor);

        Light2D.gather(_scratchLights);
        let n = 0;
        for (let i = 0; i < _scratchLights.length && n < MAX_LIGHTS; i++) {
            const L = _scratchLights[i];
            if (!L.activeLight || !L.node.activeInHierarchy) {
                continue;
            }
            const w = L.sampleWorld();
            cam.worldToScreen(w, _screen);
            let sx = _screen.x;
            let sy = _screen.y;
            if (this.flipScreenY) {
                sy = sh - sy;
            }
            const rgb = L.color;
            const r = Math.max(0, L.radius);
            const prs = _prs[n];
            prs.x = sx;
            prs.y = sy;
            prs.z = r;
            prs.w = Math.max(0, L.strength);
            const cf = _cf[n];
            cf.x = rgb.r / 255;
            cf.y = rgb.g / 255;
            cf.z = rgb.b / 255;
            cf.w = Math.max(0.001, L.falloff);
            mat.setProperty(`prs${n}`, prs);
            mat.setProperty(`cf${n}`, cf);
            n++;
        }

        for (let k = n; k < MAX_LIGHTS; k++) {
            const prs = _prs[k];
            prs.set(0, 0, 0, 0);
            const cf = _cf[k];
            cf.set(0, 0, 0, 1);
            mat.setProperty(`prs${k}`, prs);
            mat.setProperty(`cf${k}`, cf);
        }

        mat.setProperty("numLights", n);
    }

    private _resolveMaterial() {
        if (this.targetMaterial) {
            this._mat = this.targetMaterial;
            return;
        }
        if (this.targetSprite) {
            this._mat = this.targetSprite.customMaterial ?? this.targetSprite.getMaterialInstance(0);
            return;
        }
        this._mat = null;
    }
}
