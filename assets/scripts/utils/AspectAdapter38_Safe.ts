import { _decorator, Component, view, screen, ResolutionPolicy, director, Widget, Layout, Enum } from "cc";
// import { DataManager } from './DataManager';

const { ccclass, property, executeInEditMode } = _decorator;

enum AdapterMode {
    /** 根据屏幕比例和设计比例自动选择 FIXED_WIDTH / FIXED_HEIGHT */
    AUTO = 0,

    /** 永远固定设计宽，适合竖屏长屏 */
    FIXED_WIDTH = 1,

    /** 永远固定设计高，适合横向或较宽屏 */
    FIXED_HEIGHT = 2,

    /** 横屏时使用正方形设计分辨率，竖屏时走 AUTO */
    AUTO_WITH_LANDSCAPE_SQUARE = 3,
}

Enum(AdapterMode);

@ccclass("ScreenAdapter38")
@executeInEditMode()
export class ScreenAdapter38 extends Component {
    @property({ tooltip: "基础设计分辨率宽，例如 1080" })
    designWidth = 1080;

    @property({ tooltip: "基础设计分辨率高，例如 1920" })
    designHeight = 1920;

    @property({
        type: Enum(AdapterMode),
        tooltip:
            "AUTO：按设计比例自动适配；FIXED_WIDTH：固定宽；FIXED_HEIGHT：固定高；AUTO_WITH_LANDSCAPE_SQUARE：横屏正方形",
    })
    mode: AdapterMode = AdapterMode.AUTO_WITH_LANDSCAPE_SQUARE;

    @property({ tooltip: "横屏判断阈值。屏幕宽高比 >= 此值时认为是横屏/宽屏" })
    landscapeThreshold = 1.0;

    @property({ tooltip: "横屏正方形设计尺寸，例如 1080 表示 1080x1080" })
    landscapeSquareSize = 1080;

    @property({ tooltip: "resize 后额外刷新 UI 的帧数，防止部分平台尺寸更新慢一帧" })
    refreshUIFrames = 2;

    @property({ tooltip: "是否打印适配日志" })
    debugLog = true;

    /** 当前设计坐标系下的可视宽度 */
    public static visibleWidth = 0;

    /** 当前设计坐标系下的可视高度 */
    public static visibleHeight = 0;

    /** 当前真实屏幕宽高比 */
    public static screenAspect = 0;

    private _pending = false;
    private _applying = false;
    private _lastKey = "";
    private _refreshFrameLeft = 0;

    onLoad() {
        this._requestApply();
    }

    onEnable() {
        view.on("canvas-resize", this._onResize, this);
        this._requestApply();
    }

    onDisable() {
        view.off("canvas-resize", this._onResize, this);

        this.unschedule(this._applyNow);
        this.unschedule(this._refreshUIOnce);

        this._pending = false;
        this._applying = false;
        this._refreshFrameLeft = 0;
    }

    update() {
        // 有些平台 setDesignResolutionSize 后，Widget / Layout 要下一帧才完全稳定。
        if (this._refreshFrameLeft > 0) {
            this._refreshUIOnce();
            this._refreshFrameLeft--;
        }
    }

    private _onResize = () => {
        this._requestApply();
    };

    private _requestApply() {
        if (this._pending) return;

        this._pending = true;

        // 延后一帧，等引擎内部窗口尺寸稳定。
        this.scheduleOnce(this._applyNow, 0);
    }

    private _applyNow = () => {
        this._pending = false;

        if (this._applying) return;
        this._applying = true;

        try {
            const frameSize = this._getFrameSize();
            const sw = frameSize.width;
            const sh = frameSize.height;

            if (sw <= 0 || sh <= 0) {
                return;
            }

            const isPortrait = sh >= sw;
            const result = this._calculatePolicy(sw, sh);

            const key = [
                Math.round(sw),
                Math.round(sh),
                result.designWidth,
                result.designHeight,
                result.policy,
                result.reason,
            ].join("|");

            if (this._lastKey !== key) {
                this._lastKey = key;

                // 先更新设计分辨率，再通知 SquareConManager 读取最新 visible size。
                view.setDesignResolutionSize(result.designWidth, result.designHeight, result.policy);

                ScreenAdapter38.screenAspect = result.screenAspect;
                ScreenAdapter38.visibleWidth = result.visibleWidth;
                ScreenAdapter38.visibleHeight = result.visibleHeight;

                this._refreshUIOnce();
                this._refreshFrameLeft = Math.max(1, this.refreshUIFrames);

                if (this.debugLog) {
                    console.log(
                        `[ScreenAdapter38] ${result.reason}`,
                        `screen=${Math.round(sw)}x${Math.round(sh)}`,
                        `aspect=${result.screenAspect.toFixed(4)}`,
                        `design=${result.designWidth}x${result.designHeight}`,
                        `visible=${result.visibleWidth}x${result.visibleHeight}`,
                        `policy=${this._policyName(result.policy)}`,
                    );
                }
            } else {
                // 分辨率策略没变，也刷新一次 UI，避免浏览器窗口拖拽后 Widget 没更新。
                this._refreshUIOnce();
            }

            this._notifyGameAdaptation(isPortrait);
        } finally {
            this._applying = false;
        }
    };

    private _notifyGameAdaptation(isPortrait: boolean) {
        // const mgr = DataManager.Instance.squareConManager as any;
        // if (!mgr || !mgr.updateAdaptation) return;
        // mgr.updateAdaptation(isPortrait);
        // this.scheduleOnce(() => {
        //   const latest = DataManager.Instance.squareConManager as any;
        //   if (latest && latest.reloadAdaptationPosition) {
        //     latest.reloadAdaptationPosition();
        //   } else if (latest && latest.updateAdaptation) {
        //     latest.updateAdaptation(isPortrait);
        //   }
        // }, 0);
    }

    private _getFrameSize() {
        let width = screen.windowSize.width;
        let height = screen.windowSize.height;

        if (width <= 0 || height <= 0) {
            const frame = view.getFrameSize();
            width = frame.width;
            height = frame.height;
        }

        if (width <= 0 || height <= 0) {
            const visible = view.getVisibleSize();
            width = visible.width;
            height = visible.height;
        }

        return { width, height };
    }

    private _calculatePolicy(screenWidth: number, screenHeight: number) {
        const screenAspect = screenWidth / screenHeight;

        let designWidth = Math.max(1, this.designWidth);
        let designHeight = Math.max(1, this.designHeight);

        let policy = ResolutionPolicy.FIXED_WIDTH;
        let reason = "";

        switch (this.mode) {
            case AdapterMode.FIXED_WIDTH:
                policy = ResolutionPolicy.FIXED_WIDTH;
                reason = "固定宽适配";
                break;

            case AdapterMode.FIXED_HEIGHT:
                policy = ResolutionPolicy.FIXED_HEIGHT;
                reason = "固定高适配";
                break;

            case AdapterMode.AUTO_WITH_LANDSCAPE_SQUARE:
                if (screenAspect >= this.landscapeThreshold) {
                    const side = Math.max(1, this.landscapeSquareSize);
                    designWidth = side;
                    designHeight = side;
                    policy = ResolutionPolicy.FIXED_HEIGHT;
                    reason = "横屏/宽屏：正方形设计分辨率 + 固定高";
                } else {
                    const designAspect = designWidth / designHeight;
                    policy =
                        screenAspect >= designAspect ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;

                    reason =
                        policy === ResolutionPolicy.FIXED_HEIGHT
                            ? "竖屏 AUTO：屏幕更宽，固定高"
                            : "竖屏 AUTO：屏幕更高/更窄，固定宽";
                }
                break;

            case AdapterMode.AUTO:
            default: {
                const designAspect = designWidth / designHeight;
                policy = screenAspect >= designAspect ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;

                reason =
                    policy === ResolutionPolicy.FIXED_HEIGHT ? "AUTO：屏幕更宽，固定高" : "AUTO：屏幕更高/更窄，固定宽";

                break;
            }
        }

        const visibleWidth =
            policy === ResolutionPolicy.FIXED_HEIGHT ? Math.ceil(designHeight * screenAspect) : designWidth;

        const visibleHeight =
            policy === ResolutionPolicy.FIXED_WIDTH ? Math.ceil(designWidth / screenAspect) : designHeight;

        return {
            designWidth,
            designHeight,
            policy,
            reason,
            screenAspect,
            visibleWidth,
            visibleHeight,
        };
    }

    private _refreshUIOnce = () => {
        const scene = director.getScene();
        if (!scene) return;

        // Widget 手动刷新后，当前帧就能拿到对齐后的结果。
        const widgets = scene.getComponentsInChildren(Widget);
        for (const widget of widgets) {
            if (widget.enabled) {
                widget.updateAlignment();
            }
        }

        const layouts = scene.getComponentsInChildren(Layout);
        for (const layout of layouts) {
            if (layout.enabled) {
                layout.updateLayout();
            }
        }
    };

    private _policyName(policy: number) {
        switch (policy) {
            case ResolutionPolicy.FIXED_WIDTH:
                return "FIXED_WIDTH";
            case ResolutionPolicy.FIXED_HEIGHT:
                return "FIXED_HEIGHT";
            case ResolutionPolicy.SHOW_ALL:
                return "SHOW_ALL";
            case ResolutionPolicy.NO_BORDER:
                return "NO_BORDER";
            case ResolutionPolicy.EXACT_FIT:
                return "EXACT_FIT";
            default:
                return String(policy);
        }
    }
}
