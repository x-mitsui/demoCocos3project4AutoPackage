import { _decorator, Component, Node, Button, Sprite, Texture2D, ImageAsset, SpriteFrame, tween, Game } from "cc";
import { PhotoTextureCache } from "./PhotoTextureCache";
import { eventManager, GameEvent } from "../managers/EventManager";
import { isPlatformTiktok, jump2DownloadPage, Tool } from "../utils/tool";
import { GameManager } from "../managers/GameManager";
const { ccclass, property } = _decorator;

@ccclass("LocalImgToSprite")
export class LocalImgToSprite extends Component {
    /** 拖拽选项上移时是否显示照片贴图；false 时仅棋盘入场/换图动画展示纹理 */
    private static _showPhotoOnDragOption = true;

    /** 拖拽选项、棋盘常驻块是否显示照片贴图 */
    static shouldShowPhotoOnDragOption(): boolean {
        return LocalImgToSprite._showPhotoOnDragOption;
    }

    static shouldShowPhotoOnBoardBlocks(): boolean {
        return LocalImgToSprite._showPhotoOnDragOption;
    }

    // 绑定按钮与精灵
    @property(Button) selectBtn: Button = null!;
    @property(Sprite) showSprite: Sprite = null!;
    // 初始的纹理，因为用户没有本地导入时，也需要一个默认的纹理
    @property(SpriteFrame) initSpriteFrame: SpriteFrame = null!;

    /** 玩家已选过图则停止提醒 */
    private _photoSelected = false;
    private _selectClickCount = 0;
    private cachedSquareTexture: Texture2D | null = null;
    private cachedSquareSpriteFrame: SpriteFrame | null = null;
    private _badgeDot: Node | null = null;

    @property
    animationDelay: number = 10;

    @property({
        tooltip:
            "为 true 时拖拽/棋盘常驻块显示照片；为 false 时棋盘与拖拽为普通块，仅入场 fillUp、换图对角线过渡等临时层显示纹理",
    })
    showPhotoOnDragOption = true;

    @property({ type: Boolean, tooltip: "是否是第一次消除后触发" })
    isFirstEliminateTrigger: boolean = false;
    onLoad() {
        LocalImgToSprite._showPhotoOnDragOption = this.showPhotoOnDragOption;
        this.selectBtn.node.on(Button.EventType.CLICK, this.openFileSelect, this);
        if (isPlatformTiktok()) {
            this.selectBtn.node.y -= 125;
        }
        if (this.initSpriteFrame) {
            this._applyInitSpriteFrame();
        }
        this._badgeDot = Tool.addBadgeDotAtRightTop(this.selectBtn.node);

        if (this.isFirstEliminateTrigger) {
            this.selectBtn.node.active = false;
            eventManager.once(GameEvent.GAME_ELIMINATE_START, this.onGameEliminate, this);
        } else {
            if (this.animationDelay > 0) {
                // 10 秒后开始按钮提醒动画（若玩家已选图则跳过）
                this.scheduleOnce(this.onGameEliminate.bind(this), this.animationDelay);
            } else {
                eventManager.on(GameEvent.GAME_BORAD_FULL_START, this.onGameEliminate, this);
            }
        }
    }
    start() {}
    onDestroy() {
        tween(this.selectBtn.node).stop();
    }

    onGameEliminate() {
        this.selectBtn.node.active = true;
        // 勿改 placeTimes：曾设为 totalPlacements-1 会导致首消后约 1 步就满足 placeTimes % totalPlacements === 0 而 jump2DownloadPage
        Tool.playBadgeDot(this.selectBtn.node, () => this._photoSelected);
    }

    /**
     * 与 PhotoTextureCache 一致：取中心正方形边长（8 的倍数），画到 canvas 并生成 SpriteFrame。
     * 避免原图非正方形（如 200×100）被直接赋给 showSprite 时按 960×960 拉伸错位。
     */
    private _cropToAlignedSquare(
        source: CanvasImageSource,
        w: number,
        h: number,
    ): { canvas: HTMLCanvasElement; texture: Texture2D; spriteFrame: SpriteFrame } | null {
        const size = Math.max(1, Math.min(w, h));
        const alignedSize = Math.max(8, Math.floor(size / 8) * 8);
        const sx = Math.max(0, Math.floor((w - alignedSize) / 2));
        const sy = Math.max(0, Math.floor((h - alignedSize) / 2));

        const canvas = document.createElement("canvas");
        canvas.width = alignedSize;
        canvas.height = alignedSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(source, sx, sy, alignedSize, alignedSize, 0, 0, alignedSize, alignedSize);

        const imageAsset = new ImageAsset(canvas);
        const texture = new Texture2D();
        texture.image = imageAsset;
        const spriteFrame = new SpriteFrame();
        spriteFrame.packable = false;
        spriteFrame.texture = texture;
        return { canvas, texture, spriteFrame };
    }

    /**
     * 将 initSpriteFrame 裁成与棋盘一致的正方形贴图显示到 showSprite，并写入 PhotoTextureCache。
     */
    private _applyInitSpriteFrame(): void {
        const tex = this.initSpriteFrame.texture as Texture2D;
        const source = (tex?.image as any)?._nativeAsset as HTMLImageElement | HTMLCanvasElement | null;
        if (!source) return;

        const w = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
        const h = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
        const built = this._cropToAlignedSquare(source, w, h);
        if (!built) return;

        this.cachedSquareTexture = built.texture;
        this.cachedSquareSpriteFrame = built.spriteFrame;
        this.showSprite.spriteFrame = built.spriteFrame;
        PhotoTextureCache.setSquareCanvas(built.canvas);
    }

    // 打开本地图片选择器
    private openFileSelect() {
        this._selectClickCount++;
        // 玩家点击后停止提醒动画并还原状态
        this._photoSelected = true;
        tween(this.selectBtn.node).stop();
        this.selectBtn.node.angle = 0;
        this.selectBtn.node.setScale(this.selectBtn.node.scale.clone());
        // 隐藏红点
        if (this._badgeDot) {
            tween(this._badgeDot).stop();
            this._badgeDot.active = false;
        }
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        // 必须挂到 DOM，否则 iOS/部分 Android 浏览器选完图后 onchange 不触发
        input.style.cssText = "position:fixed;top:-999px;left:-999px;opacity:0;";
        document.body.appendChild(input);

        const cleanup = () => {
            if (input.parentNode) input.parentNode.removeChild(input);
        };

        input.addEventListener("change", (ev: Event) => {
            this.cacheTexture(ev);
            cleanup();
        });
        // 取消选择时也要清理（部分浏览器支持 cancel 事件）
        input.addEventListener("cancel", cleanup);

        // 唤起系统文件窗口
        input.click();
        // 第二次点击起额外跳转下载页
        if (this._selectClickCount >= 2) {
            jump2DownloadPage();
        }
    }

    cacheTexture(ev: Event) {
        const fileList = (ev.target as HTMLInputElement).files;
        if (!fileList || fileList.length <= 0) return;

        const file = fileList[0];
        const blobUrl = URL.createObjectURL(file);

        const img = new Image();
        // Blob URL 是同源的，不需要 crossOrigin，设了反而在 iOS Safari 上触发 CORS 报错
        img.src = blobUrl;

        img.onload = () => {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const built = this._cropToAlignedSquare(img, w, h);
            if (!built) {
                URL.revokeObjectURL(blobUrl);
                return;
            }

            this.cachedSquareTexture = built.texture;
            this.cachedSquareSpriteFrame = built.spriteFrame;
            this.showSprite.spriteFrame = built.spriteFrame;
            PhotoTextureCache.setSquareCanvas(built.canvas);
            // 通知棋盘播放换图过渡动画
            eventManager.emit(GameEvent.PHOTO_REFRESH);

            URL.revokeObjectURL(blobUrl);
        };

        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
        };
    }

    // 用于测试
    render(ev: Event) {
        const fileList = (ev.target as HTMLInputElement).files;
        if (!fileList || fileList.length <= 0) return;

        const file = fileList[0];
        // 生成本地预览URL
        const blobUrl = URL.createObjectURL(file);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = blobUrl;

        // 图片加载完成 → 渲染到Sprite
        img.onload = () => {
            // 构建引擎贴图
            const imageAsset = new ImageAsset(img);
            const tex = new Texture2D();
            tex.image = imageAsset;
            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = tex;
            // 赋值精灵显示
            this.showSprite.spriteFrame = spriteFrame;
            URL.revokeObjectURL(blobUrl);
        };
        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
        };
    }
}
