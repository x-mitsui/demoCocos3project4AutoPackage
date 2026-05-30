import {
    _decorator,
    Camera,
    Component,
    Node,
    Rect,
    RenderTexture,
    Size,
    Sprite,
    SpriteFrame,
    UITransform,
    Widget,
    director,
    view,
} from "cc";

const { ccclass, property } = _decorator;

/**
 * 路线 B 辅助：把 `sourceCamera` 渲染到一张 `RenderTexture`，并绑定到 `displaySprite` 显示。
 *
 * **仅挂本脚本不够**：脚本只做「RT + 全屏 Sprite 贴图」。`sourceCamera` 一旦绑定 `targetTexture` 就**不再往游戏窗口画**，
 * 必须另有**第二台相机**（通常 Canvas 的 UI 相机）**不绑定 RT**，且 Visibility 能照到 `displaySprite` 所在 Layer，否则**必黑屏**。
 *
 * **本脚本挂在哪都行**（空节点 / 管理节点均可）；不必、也不建议只挂在「即将写 RT 的相机」上却不配第二台相机。
 *
 * **必须**保证：`sourceCamera` 的 Visibility **不要**包含 `displaySprite` 所在节点（否则会递归画进 RT）。
 * 常见做法：游戏内容放在专用 Layer，本相机只勾选该 Layer；全屏 Sprite 放在 UI 层由另一相机绘制。
 */
@ccclass("ScreenLightsRtOverlay2D")
export class ScreenLightsRtOverlay2D extends Component {
    @property({
        type: Camera,
        tooltip:
            "只往 RT 里画的相机（如只勾 GAME 层）。绑定后该相机不再输出到屏幕，故必须另有未绑 RT 的相机画全屏 Sprite。",
    })
    sourceCamera: Camera | null = null;

    @property({
        type: Sprite,
        tooltip:
            "全屏 Sprite：显示 RT 内容，可挂 lightScreen2D。须由「未设置 Target Texture」的相机（如 UI 相机）渲染，且所在 Layer 不要被 sourceCamera 勾选。",
    })
    displaySprite: Sprite | null = null;

    @property({ tooltip: "首次同步 RT 时在控制台打印分层/双相机提示（仅一次）" })
    logSetupHints = true;

    @property({
        tooltip:
            "RT 贴到 Sprite 上常与屏幕 Y 相反，默认 true 对 SpriteFrame 做 flipUVY；若仍倒可关掉试另一面",
    })
    flipRenderTextureY = true;

    private _rt: RenderTexture | null = null;
    private _sf: SpriteFrame | null = null;
    private _didLogHints = false;
    private _didWarnSameCameraNode = false;

    onEnable() {
        view.on("canvas-resize", this._syncRt, this);
        this._syncRt();
    }

    onDisable() {
        view.off("canvas-resize", this._syncRt, this);
        this._didLogHints = false;
        this._didWarnSameCameraNode = false;
    }

    onDestroy() {
        if (this.displaySprite) {
            this.displaySprite.spriteFrame = null;
        }
        if (this.sourceCamera) {
            this.sourceCamera.targetTexture = null;
        }
        this._rt?.destroy();
        this._sf?.destroy();
        this._rt = null;
        this._sf = null;
    }

    private _syncRt = () => {
        const cam = this.sourceCamera;
        const sp = this.displaySprite;
        if (!cam || !sp) {
            return;
        }
        const vis = view.getVisibleSize();
        // 与 Canvas 在 targetTexture 下的适配一致；优先用「可见区像素尺寸」
        const visPx = view.getVisibleSizeInPixel();
        let wp = Math.max(2, Math.floor(visPx.width));
        let hp = Math.max(2, Math.floor(visPx.height));
        if (!Number.isFinite(wp) || !Number.isFinite(hp)) {
            const rect = view.getViewportRect();
            wp = Math.max(2, Math.floor(rect.width));
            hp = Math.max(2, Math.floor(rect.height));
        }

        // 切勿每次 sync 都 reset：RenderTexture._initWindow 会 destroy 窗口并 clearCameras()，
        // 已绑 targetTexture 的场景相机会被摘挂，再 initialize 也不会自动 attach 回来 → 视锥/采样错位（常见「差半屏」）。
        if (!this._rt) {
            this._rt = new RenderTexture();
            this._rt.reset({ width: wp, height: hp });
        } else if (this._rt.width !== wp || this._rt.height !== hp) {
            this._rt.resize(wp, hp);
        }
        cam.targetTexture = this._rt;
        const rw = this._rt.width;
        const rh = this._rt.height;

        if (!this._sf) {
            this._sf = new SpriteFrame();
            this._sf.packable = false;
        }
        this._sf.texture = this._rt;
        this._sf.rect = new Rect(0, 0, rw, rh);
        this._sf.originalSize = new Size(rw, rh);
        this._sf.flipUVY = this.flipRenderTextureY;
        sp.spriteFrame = this._sf;

        // TRIMMED 会按图素裁边，和 UITransform 一起用时常见「错半屏」；RT 全屏必须用 CUSTOM
        sp.sizeMode = Sprite.SizeMode.CUSTOM;

        const uit = sp.node.getComponent(UITransform);
        if (uit) {
            uit.setAnchorPoint(0.5, 0.5);
            const parentUt = sp.node.parent?.getComponent(UITransform);
            if (parentUt) {
                uit.setContentSize(parentUt.width, parentUt.height);
            } else {
                uit.setContentSize(vis.width, vis.height);
            }
        }
        sp.node.setPosition(0, 0, 0);
        this._ensureFullScreenWidget(sp.node);

        this._warnIfSpriteLayerVisibleToSourceCamera(cam, sp);
        this._warnIfScriptOnSourceCameraNode(cam);
        this._logDualCameraHintsOnce(cam);
    };

    /** 四边贴父节点，避免与 Canvas 设计尺寸有 0.5 像素级累计误差时整块错位 */
    private _ensureFullScreenWidget(n: Node) {
        let w = n.getComponent(Widget);
        if (!w) {
            w = n.addComponent(Widget);
        }
        w.isAlignTop = true;
        w.isAlignBottom = true;
        w.isAlignLeft = true;
        w.isAlignRight = true;
        w.top = 0;
        w.bottom = 0;
        w.left = 0;
        w.right = 0;
        w.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        w.target = null;
        w.updateAlignment();
    }

    /** 组件与 sourceCamera 同节点时，新手极易误以为「一台相机够用」→ 黑屏 */
    private _warnIfScriptOnSourceCameraNode(cam: Camera) {
        if (this._didWarnSameCameraNode || !cam) {
            return;
        }
        const camHere = this.node.getComponent(Camera);
        if (camHere === cam) {
            this._didWarnSameCameraNode = true;
            console.warn(
                `[ScreenLightsRtOverlay2D] 本脚本与 sourceCamera 在同一节点「${cam.node.name}」上：` +
                    `该相机被设为 TargetTexture 后**不会再画到游戏窗口**。` +
                    `请增加一台**不绑定 Target Texture**的相机（常见：Canvas 下 UI 相机），Visibility 包含全屏 Sprite 所在层；` +
                    `否则屏幕会一直黑。`,
            );
        }
    }

    /** 若全屏 Sprite 所在层也被 sourceCamera 渲染，会递归采样 RT，易花屏/异常 */
    private _warnIfSpriteLayerVisibleToSourceCamera(cam: Camera, sp: Sprite) {
        const layerMask = sp.node.layer;
        if ((cam.visibility & layerMask) !== 0) {
            console.warn(
                `[ScreenLightsRtOverlay2D] sourceCamera「${cam.node.name}」的 Visibility 包含了全屏 Sprite 所在 Layer ` +
                    `(layerMask=${layerMask})。请把 Sprite 放到单独 Layer（如 UI_FULLSCREEN），且本相机不要勾选该层。`,
            );
        }
    }

    /** 提醒：Target Texture 的相机不会画到屏幕，需另有相机画 UI */
    private _logDualCameraHintsOnce(cam: Camera) {
        if (!this.logSetupHints || this._didLogHints) {
            return;
        }
        this._didLogHints = true;
        const scene = director.getScene();
        if (!scene) {
            return;
        }
        const cams = scene.getComponentsInChildren(Camera);
        const toScreen = cams.filter((c) => c !== cam && c.enabledInHierarchy && !c.targetTexture);
        if (toScreen.length === 0) {
            console.warn(
                "[ScreenLightsRtOverlay2D] 当前场景未找到「启用且未设置 Target Texture」的相机。" +
                    "仅把画面写入 RT 时窗口不会显示游戏内容，屏幕会黑。" +
                    "请保留或添加一台渲染 UI_FULLSCREEN（及 UI）的相机，且优先级/顺序能画到全屏 Sprite。",
            );
        }
    }
}
