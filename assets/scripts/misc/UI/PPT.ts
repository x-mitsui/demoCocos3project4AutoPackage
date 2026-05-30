import {
    _decorator,
    Color,
    Component,
    Graphics,
    ImageAsset,
    Mask,
    Node,
    Sprite,
    SpriteFrame,
    Texture2D,
    Tween,
    tween,
    UIOpacity,
    UITransform,
    v3,
} from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { isPlatformTiktok } from "../../utils/tool";
const { ccclass, property } = _decorator;

type PPTTransitionStyle =
    | "diagonalPieces"
    | "fade"
    | "fadeWhite"
    | "zoomIn"
    | "slideInL"
    | "radialCW"
    | "radialCCW"
    | "ripple";

@ccclass("PPT")
export class PPT extends Component {
    @property(SpriteFrame)
    pptSpriteFrames: SpriteFrame[] = [];

    @property({ tooltip: "分块列数，越大碎块越细" })
    revealColumns: number = 7;

    @property({ tooltip: "分块行数，越大碎块越细" })
    revealRows: number = 7;

    @property({ tooltip: "单个碎块显现时长（秒）" })
    pieceRevealDuration: number = 0.18;

    @property({ tooltip: "左上到右下的延迟波纹（秒）" })
    diagonalDelayStep: number = 0.035;

    @property({ tooltip: "照片圆角半径（像素）" })
    photoCornerRadius: number = 28;

    @property({ tooltip: "除碎块外，通用过渡时长（秒）" })
    transitionDuration: number = 0.42;

    photo: Sprite = null!;
    private _currentFrameIndex = 0;
    private _isTransitioning = false;
    private _pendingSwitchCount = 0;
    private _transitionStyleCursor = 0;
    private _photoMaskNode: Node | null = null;
    private _transitionRoot: Node | null = null;

    private static _whiteSpriteFrame: SpriteFrame | null = null;
    private readonly _transitionStyles: PPTTransitionStyle[] = [
        "diagonalPieces",
        "fade",
        "fadeWhite",
        "zoomIn",
        "slideInL",
        "radialCW",
        "radialCCW",
        "ripple",
    ];

    onLoad() {
        if (isPlatformTiktok()) {
            this.node.scale = v3(0.6, 0.6, 1);
            this.node.y -= 54;
        }
        const show =
            this.node.getChildByName("Show") || this.node.getChildByName("PhotoRoundedMask")?.getChildByName("Show");
        if (!show) return;
        this.photo = show.getComponent(Sprite);
        if (!this.photo) return;

        this.setupPhotoRoundedMask();
        this.initPhotoFrame();
        eventManager.on(GameEvent.GAME_CLEAR_ANIMATION_START, this.onGameEliminateStartTrue, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_CLEAR_ANIMATION_START, this.onGameEliminateStartTrue, this);
        this.destroyTransitionRoot();
    }

    private initPhotoFrame() {
        if (!this.pptSpriteFrames.length) return;
        const current = this.photo.spriteFrame;
        if (!current) {
            this._currentFrameIndex = 0;
            this.photo.spriteFrame = this.pptSpriteFrames[0];
            return;
        }

        const found = this.pptSpriteFrames.findIndex((f) => f === current);
        if (found >= 0) {
            this._currentFrameIndex = found;
            return;
        }

        this._currentFrameIndex = 0;
        this.photo.spriteFrame = this.pptSpriteFrames[0];
    }

    private onGameEliminateStartTrue() {
        if (this.pptSpriteFrames.length <= 1 || !this.photo) return;
        this._pendingSwitchCount++;
        this.tryConsumeSwitch();
    }

    private tryConsumeSwitch() {
        if (this._isTransitioning || this._pendingSwitchCount <= 0) return;
        this._pendingSwitchCount--;

        const nextIndex = (this._currentFrameIndex + 1) % this.pptSpriteFrames.length;
        const nextFrame = this.pptSpriteFrames[nextIndex];
        const style = this.getNextTransitionStyle();

        this._isTransitioning = true;
        this.playTransition(style, nextFrame, () => {
            this._currentFrameIndex = nextIndex;
            this._isTransitioning = false;
            this.tryConsumeSwitch();
        });
    }

    private getNextTransitionStyle(): PPTTransitionStyle {
        const style = this._transitionStyles[this._transitionStyleCursor % this._transitionStyles.length];
        this._transitionStyleCursor = (this._transitionStyleCursor + 1) % this._transitionStyles.length;
        return style;
    }

    private playTransition(style: PPTTransitionStyle, nextFrame: SpriteFrame, onDone: () => void) {
        switch (style) {
            case "diagonalPieces":
                this.playDiagonalPiecesReveal(nextFrame, onDone);
                return;
            case "fade":
                this.playFadeTransition(nextFrame, onDone, false);
                return;
            case "fadeWhite":
                this.playFadeTransition(nextFrame, onDone, true);
                return;
            case "zoomIn":
                this.playZoomInTransition(nextFrame, onDone);
                return;
            case "slideInL":
                this.playSlideInLTransition(nextFrame, onDone);
                return;
            case "radialCW":
                this.playRadialTransition(nextFrame, onDone, true);
                return;
            case "radialCCW":
                this.playRadialTransition(nextFrame, onDone, false);
                return;
            case "ripple":
                this.playRippleTransition(nextFrame, onDone);
                return;
            default:
                this.photo.spriteFrame = nextFrame;
                onDone();
        }
    }

    private playDiagonalPiecesReveal(nextFrame: SpriteFrame, onDone: () => void) {
        const photoTf = this.photo.node.getComponent(UITransform);
        if (!photoTf) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }
        this.destroyTransitionRoot();
        const root = this.createTransitionRoot(photoTf, "PPTTransitionPieces");
        if (!root) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }

        const cols = Math.max(2, Math.floor(this.revealColumns));
        const rows = Math.max(2, Math.floor(this.revealRows));
        const pieceW = photoTf.width / cols;
        const pieceH = photoTf.height / rows;
        const maxDiag = cols + rows - 2;
        let finished = 0;
        const total = cols * rows;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const pieceNode = new Node(`piece_${row}_${col}`);
                pieceNode.parent = root;
                const pieceTf = pieceNode.addComponent(UITransform);
                pieceTf.setContentSize(pieceW, pieceH);
                const centerX = -photoTf.width * 0.5 + pieceW * (col + 0.5);
                const centerY = photoTf.height * 0.5 - pieceH * (row + 0.5);
                pieceNode.setPosition(centerX, centerY, 0);
                pieceNode.setScale(0.84, 0.84, 1);
                pieceNode.addComponent(Mask);

                const chunkNode = new Node("chunk");
                chunkNode.parent = pieceNode;
                const chunkTf = chunkNode.addComponent(UITransform);
                chunkTf.setContentSize(photoTf.width, photoTf.height);
                chunkNode.setPosition(-centerX, -centerY, 0);
                const chunkSprite = chunkNode.addComponent(Sprite);
                chunkSprite.sizeMode = Sprite.SizeMode.CUSTOM;
                chunkSprite.spriteFrame = nextFrame;

                const opacity = pieceNode.addComponent(UIOpacity);
                opacity.opacity = 0;
                const delay = ((row + col) / Math.max(1, maxDiag)) * this.diagonalDelayStep * maxDiag;
                const revealDur = Math.max(0.05, this.pieceRevealDuration);

                tween(opacity)
                    .delay(delay)
                    .to(revealDur, { opacity: 255 }, { easing: "quadOut" })
                    .call(() => {
                        finished++;
                        if (finished >= total) {
                            this.photo.spriteFrame = nextFrame;
                            this.destroyTransitionRoot();
                            onDone();
                        }
                    })
                    .start();

                tween(pieceNode)
                    .delay(delay)
                    .to(revealDur, { scale: v3(1, 1, 1) }, { easing: "backOut" })
                    .start();
            }
        }
    }

    private playFadeTransition(nextFrame: SpriteFrame, onDone: () => void, withWhiteFlash: boolean) {
        const photoTf = this.photo.node.getComponent(UITransform);
        if (!photoTf) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }
        this.destroyTransitionRoot();
        const root = this.createTransitionRoot(photoTf, "PPTTransitionFade");
        if (!root) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }

        const dur = Math.max(0.12, this.transitionDuration);
        const overlay = this.createOverlaySprite(root, "Next", nextFrame, photoTf.width, photoTf.height);
        const overlayOpacity = overlay.getComponent(UIOpacity) || overlay.addComponent(UIOpacity);
        overlayOpacity.opacity = 0;
        tween(overlayOpacity)
            .to(dur, { opacity: 255 }, { easing: "quadOut" })
            .call(() => {
                this.photo.spriteFrame = nextFrame;
                this.destroyTransitionRoot();
                onDone();
            })
            .start();

        if (!withWhiteFlash) return;
        const whiteFrame = this.getOrCreateWhiteSpriteFrame();
        if (!whiteFrame) return;
        const flash = this.createOverlaySprite(root, "Flash", whiteFrame, photoTf.width, photoTf.height);
        const flashSprite = flash.getComponent(Sprite);
        if (flashSprite) flashSprite.color = Color.WHITE.clone();
        const flashOpacity = flash.getComponent(UIOpacity) || flash.addComponent(UIOpacity);
        flashOpacity.opacity = 0;
        tween(flashOpacity)
            .to(dur * 0.35, { opacity: 180 }, { easing: "quadOut" })
            .to(dur * 0.65, { opacity: 0 })
            .start();
    }

    private playZoomInTransition(nextFrame: SpriteFrame, onDone: () => void) {
        const photoTf = this.photo.node.getComponent(UITransform);
        if (!photoTf) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }
        this.destroyTransitionRoot();
        const root = this.createTransitionRoot(photoTf, "PPTTransitionZoom");
        if (!root) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }

        const dur = Math.max(0.12, this.transitionDuration);
        const overlay = this.createOverlaySprite(root, "Next", nextFrame, photoTf.width, photoTf.height);
        overlay.setScale(1.18, 1.18, 1);
        const overlayOpacity = overlay.getComponent(UIOpacity) || overlay.addComponent(UIOpacity);
        overlayOpacity.opacity = 0;
        tween(overlayOpacity).to(dur, { opacity: 255 }, { easing: "quadOut" }).start();
        tween(overlay)
            .to(dur, { scale: v3(1, 1, 1) }, { easing: "quadOut" })
            .call(() => {
                this.photo.spriteFrame = nextFrame;
                this.destroyTransitionRoot();
                onDone();
            })
            .start();
    }

    private playSlideInLTransition(nextFrame: SpriteFrame, onDone: () => void) {
        const photoTf = this.photo.node.getComponent(UITransform);
        if (!photoTf) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }
        this.destroyTransitionRoot();
        const root = this.createTransitionRoot(photoTf, "PPTTransitionSlideInL");
        if (!root) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }

        const dur = Math.max(0.12, this.transitionDuration);
        const overlay = this.createOverlaySprite(root, "Next", nextFrame, photoTf.width, photoTf.height);
        overlay.setPosition(-photoTf.width, 0, 0);
        tween(overlay)
            .to(dur, { position: v3(0, 0, 0) }, { easing: "quartOut" })
            .call(() => {
                this.photo.spriteFrame = nextFrame;
                this.destroyTransitionRoot();
                onDone();
            })
            .start();
    }

    private playRadialTransition(nextFrame: SpriteFrame, onDone: () => void, clockwise: boolean) {
        const photoTf = this.photo.node.getComponent(UITransform);
        if (!photoTf) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }
        this.destroyTransitionRoot();
        const root = this.createTransitionRoot(photoTf, "PPTTransitionRadial");
        if (!root) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }

        root.getComponent(Mask) || root.addComponent(Mask);
        const graphics = root.getComponent(Graphics) || root.addComponent(Graphics);
        this.createOverlaySprite(root, "Next", nextFrame, photoTf.width, photoTf.height);

        const progress = { value: 0 };
        const dur = Math.max(0.12, this.transitionDuration);
        tween(progress)
            .to(
                dur,
                { value: 1 },
                {
                    easing: "quadOut",
                    onUpdate: () => {
                        this.drawRadialMask(graphics, photoTf.width, photoTf.height, progress.value, clockwise);
                    },
                },
            )
            .call(() => {
                this.photo.spriteFrame = nextFrame;
                this.destroyTransitionRoot();
                onDone();
            })
            .start();
    }

    private playRippleTransition(nextFrame: SpriteFrame, onDone: () => void) {
        const photoTf = this.photo.node.getComponent(UITransform);
        if (!photoTf) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }
        this.destroyTransitionRoot();
        const root = this.createTransitionRoot(photoTf, "PPTTransitionRipple");
        if (!root) {
            this.photo.spriteFrame = nextFrame;
            onDone();
            return;
        }

        const dur = Math.max(0.12, this.transitionDuration);
        const overlay = this.createOverlaySprite(root, "Next", nextFrame, photoTf.width, photoTf.height);
        overlay.setScale(1.08, 1.08, 1);
        const overlayOpacity = overlay.getComponent(UIOpacity) || overlay.addComponent(UIOpacity);
        overlayOpacity.opacity = 0;
        tween(overlayOpacity).to(dur, { opacity: 255 }, { easing: "quadOut" }).start();
        tween(overlay)
            .to(dur, { scale: v3(1, 1, 1) }, { easing: "sineOut" })
            .start();

        const maxR = Math.max(photoTf.width, photoTf.height) * 0.58;
        this.spawnRippleRing(root, maxR, 0);
        this.spawnRippleRing(root, maxR * 0.9, dur * 0.18);
        tween(root)
            .delay(dur)
            .call(() => {
                this.photo.spriteFrame = nextFrame;
                this.destroyTransitionRoot();
                onDone();
            })
            .start();
    }

    private spawnRippleRing(root: Node, maxRadius: number, delay: number) {
        const ring = new Node("RippleRing");
        ring.parent = root;
        const ringTf = ring.addComponent(UITransform);
        ringTf.setContentSize(maxRadius * 2 + 10, maxRadius * 2 + 10);
        const ringGraphics = ring.addComponent(Graphics);
        ringGraphics.lineWidth = 4;
        ringGraphics.strokeColor = new Color(255, 255, 255, 255);
        ringGraphics.circle(0, 0, maxRadius);
        ringGraphics.stroke();

        const op = ring.addComponent(UIOpacity);
        op.opacity = 0;
        ring.setScale(0.1, 0.1, 1);

        const dur = Math.max(0.12, this.transitionDuration) * 0.82;
        tween(op)
            .delay(delay)
            .to(dur * 0.18, { opacity: 120 })
            .to(dur * 0.82, { opacity: 0 })
            .start();
        tween(ring)
            .delay(delay)
            .to(dur, { scale: v3(1.12, 1.12, 1) }, { easing: "quadOut" })
            .start();
    }

    private drawRadialMask(graphics: Graphics, width: number, height: number, progress: number, clockwise: boolean) {
        const p = Math.max(0, Math.min(1, progress));
        graphics.clear();
        if (p <= 0) return;

        const radius = Math.sqrt(width * width + height * height);
        const startAngle = Math.PI * 0.5;
        const sweep = Math.PI * 2 * p * (clockwise ? -1 : 1);
        const segments = Math.max(8, Math.floor(64 * p));
        graphics.moveTo(0, 0);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = startAngle + sweep * t;
            graphics.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        graphics.close();
        graphics.fill();
    }

    private createTransitionRoot(photoTf: UITransform, nodeName: string): Node | null {
        const host = this._photoMaskNode || this.node;
        if (!host) return null;
        const root = new Node(nodeName);
        root.parent = host;
        const rootTf = root.addComponent(UITransform);
        rootTf.setContentSize(photoTf.width, photoTf.height);
        root.setPosition(this._photoMaskNode ? v3(0, 0, 0) : this.photo.node.position);
        root.setSiblingIndex(this._photoMaskNode ? 1 : this.photo.node.getSiblingIndex() + 1);
        this._transitionRoot = root;
        return root;
    }

    private createOverlaySprite(root: Node, name: string, frame: SpriteFrame, width: number, height: number): Node {
        const overlay = new Node(name);
        overlay.parent = root;
        const tf = overlay.addComponent(UITransform);
        tf.setContentSize(width, height);
        const sp = overlay.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = frame;
        return overlay;
    }

    private destroyTransitionRoot() {
        if (!this._transitionRoot) return;
        Tween.stopAllByTarget(this._transitionRoot);
        for (const child of this._transitionRoot.children) {
            Tween.stopAllByTarget(child);
            const op = child.getComponent(UIOpacity);
            if (op) Tween.stopAllByTarget(op);
        }
        this._transitionRoot.destroy();
        this._transitionRoot = null;
    }

    private setupPhotoRoundedMask() {
        const photoNode = this.photo.node;
        const photoTf = photoNode.getComponent(UITransform);
        if (!photoTf) return;

        if (photoNode.parent && photoNode.parent.name === "PhotoRoundedMask") {
            this._photoMaskNode = photoNode.parent;
            const existedMaskTf =
                this._photoMaskNode.getComponent(UITransform) || this._photoMaskNode.addComponent(UITransform);
            existedMaskTf.setContentSize(photoTf.width, photoTf.height);
            this._photoMaskNode.getComponent(Mask) || this._photoMaskNode.addComponent(Mask);
            const existedGraphics =
                this._photoMaskNode.getComponent(Graphics) || this._photoMaskNode.addComponent(Graphics);
            this.drawRoundedRectMask(existedGraphics, photoTf.width, photoTf.height, this.photoCornerRadius);
            return;
        }

        const originalPos = photoNode.position.clone();
        const originalScale = photoNode.scale.clone();
        const originalAngle = photoNode.angle;
        const originalIndex = photoNode.getSiblingIndex();

        const oldMaskNode = this.node.getChildByName("PhotoRoundedMask");
        if (oldMaskNode) oldMaskNode.destroy();

        const maskNode = new Node("PhotoRoundedMask");
        maskNode.parent = this.node;
        maskNode.setPosition(originalPos);
        maskNode.setScale(originalScale);
        maskNode.angle = originalAngle;
        maskNode.setSiblingIndex(originalIndex);

        const maskTf = maskNode.getComponent(UITransform) || maskNode.addComponent(UITransform);
        maskTf.setContentSize(photoTf.width, photoTf.height);
        maskNode.getComponent(Mask) || maskNode.addComponent(Mask);
        const graphics = maskNode.getComponent(Graphics) || maskNode.addComponent(Graphics);
        this.drawRoundedRectMask(graphics, photoTf.width, photoTf.height, this.photoCornerRadius);

        photoNode.parent = maskNode;
        photoNode.setPosition(0, 0, 0);
        photoNode.setScale(1, 1, 1);
        photoNode.angle = 0;
        this._photoMaskNode = maskNode;
    }

    private drawRoundedRectMask(graphics: Graphics, width: number, height: number, radius: number) {
        const r = Math.max(0, Math.min(radius, Math.min(width, height) * 0.5));
        graphics.clear();
        graphics.roundRect(-width * 0.5, -height * 0.5, width, height, r);
        graphics.fill();
    }

    private getOrCreateWhiteSpriteFrame(): SpriteFrame | null {
        if (PPT._whiteSpriteFrame) return PPT._whiteSpriteFrame;
        if (typeof document === "undefined") return null;

        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const imageAsset = new ImageAsset(canvas);
        const texture = new Texture2D();
        texture.image = imageAsset;
        const sp = new SpriteFrame();
        sp.packable = false;
        sp.texture = texture;
        PPT._whiteSpriteFrame = sp;
        return PPT._whiteSpriteFrame;
    }
}
