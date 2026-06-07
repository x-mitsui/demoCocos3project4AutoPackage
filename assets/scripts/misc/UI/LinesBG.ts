import {
    _decorator,
    Component,
    Graphics,
    math,
    UITransform,
    view,
    EventTouch,
    EventMouse,
    Size,
    Vec2,
    Color,
    Node
} from "cc";

const { ccclass, property } = _decorator;

type Dot = {
    x: number;
    y: number;
    vx: number;
    vy: number;
};

@ccclass("LinesBG")
export class LinesBG extends Component {
    @property(Graphics)
    graphics: Graphics | null = null;

    @property
    particleCount = 56;

    @property
    maxConnectDistance = 180;

    @property
    dotRadius = 1.6;

    @property
    speed = 0.75;

    @property
    lineAlpha = 0.9;

    @property
    mobileScale = 1;

    @property
    mobileMaxWidth = 768;

    @property
    pixelRatioCap = 1.5;

    @property({ tooltip: "Only redraw every N frames on touch devices to reduce GPU/CPU load." })
    mobileFrameSkip = 1;

    private dots: Dot[] = [];
    private contentWidth = 0;
    private contentHeight = 0;
    private isMobile = false;
    private frameTick = 0;
    private pointer: Vec2 | null = null;
    private uiTransform: UITransform | null = null;
    private g: Graphics | null = null;

    onLoad() {
        this.g = this.graphics ?? this.getComponent(Graphics);
        this.uiTransform = this.getComponent(UITransform);
        this.isMobile = this.detectMobile();

        this.applyCanvasSize();
        this.buildDots();
        this.bindInput();
        this.scheduleOnce(() => this.redraw(), 0);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_MOVE, this.onNodeTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
        this.node.off(Node.EventType.MOUSE_MOVE, this.onNodeMouseMove, this);
    }

    update() {
        if (!this.g || this.contentWidth <= 0 || this.contentHeight <= 0) return;

        if (this.isMobile && this.frameTick++ % (this.mobileFrameSkip + 1) !== 0) {
            return;
        }

        this.stepDots();
        this.redraw();
    }

    private bindInput() {
        this.node.on(Node.EventType.TOUCH_MOVE, this.onNodeTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
        this.node.on(Node.EventType.MOUSE_MOVE, this.onNodeMouseMove, this);
    }

    private detectMobile() {
        const width = view.getVisibleSize().width;
        const touchCapable = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        return touchCapable || width <= this.mobileMaxWidth;
    }

    private applyCanvasSize() {
        const size = view.getVisibleSize();
        this.contentWidth = Math.max(1, Math.floor(size.width));
        this.contentHeight = Math.max(1, Math.floor(size.height));

        if (this.uiTransform) {
            this.uiTransform.setAnchorPoint(0.5, 0.5);
            this.uiTransform.setContentSize(new Size(this.contentWidth, this.contentHeight));
        }

        this.centerNode();

        if (this.isMobile) {
            this.particleCount = Math.max(36, Math.floor(this.particleCount * 1.1));
            this.maxConnectDistance = Math.max(160, Math.floor(this.maxConnectDistance * 1.2));
            this.dotRadius = Math.max(1.8, this.dotRadius);
            this.speed = Math.max(1.0, this.speed);
        }
    }

    private buildDots() {
        this.dots.length = 0;
        for (let i = 0; i < this.particleCount; i++) {
            this.dots.push(this.createDot());
        }
    }

    private getHalfSizes() {
        return {
            halfWidth: Math.max(1, this.contentWidth / 2),
            halfHeight: Math.max(1, this.contentHeight / 2)
        };
    }

    private createDot(): Dot {
        const speed = this.speed * (this.isMobile ? 0.85 : 1);
        const { halfWidth, halfHeight } = this.getHalfSizes();
        return {
            x: (Math.random() * 2 - 1) * halfWidth,
            y: (Math.random() * 2 - 1) * halfHeight,
            vx: (Math.random() * 2 - 1) * speed,
            vy: (Math.random() * 2 - 1) * speed
        };
    }

    private stepDots() {
        const { halfWidth, halfHeight } = this.getHalfSizes();
        for (const dot of this.dots) {
            dot.x += dot.vx;
            dot.y += dot.vy;

            if (dot.x < -halfWidth || dot.x > halfWidth) {
                dot.vx *= -1;
                dot.x = math.clamp(dot.x, -halfWidth, halfWidth);
            }
            if (dot.y < -halfHeight || dot.y > halfHeight) {
                dot.vy *= -1;
                dot.y = math.clamp(dot.y, -halfHeight, halfHeight);
            }
        }
    }

    private redraw() {
        if (!this.g) return;

        const g = this.g;
        g.clear();

        const dots = this.dots;
        const maxDisSq = this.maxConnectDistance * this.maxConnectDistance;

        if (this.pointer) {
            const pointerDot: Dot = { x: this.pointer.x, y: this.pointer.y, vx: 0, vy: 0 };
            this.drawConnections([pointerDot, ...dots], maxDisSq);
        } else {
            this.drawConnections(dots, maxDisSq);
        }

        this.drawDots();
    }

    private drawDots() {
        if (!this.g) return;
        const g = this.g;
        g.fillColor = new Color(255, 255, 255, 235);

        for (const dot of this.dots) {
            g.circle(dot.x, dot.y, this.dotRadius);
            g.fill();
        }
    }

    private drawConnections(pool: Dot[], maxDisSq: number) {
        if (!this.g) return;
        const g = this.g;

        for (let i = 0; i < pool.length; i++) {
            const a = pool[i];
            for (let j = i + 1; j < pool.length; j++) {
                const b = pool[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const disSq = dx * dx + dy * dy;
                if (disSq > maxDisSq) continue;

                const ratio = 1 - disSq / maxDisSq;
                const alpha = Math.max(0, Math.min(1, ratio * this.lineAlpha));
                const width = 1.4 + ratio * 2.8;
                const hue = (Date.now() / 30 + a.x + a.y) % 360;

                g.lineWidth = width;
                g.strokeColor = this.hsvToColor(hue / 360, 0.75, 1, alpha);
                g.moveTo(a.x, a.y);
                g.lineTo(b.x, b.y);
                g.stroke();
            }
        }
    }

    private centerNode() {
        this.node.setPosition(0, 0, 0);
        this.node.setScale(1, 1, 1);
    }

    private toLocalPoint(uiPos: { x: number; y: number }) {
        const transform = this.uiTransform ?? this.getComponent(UITransform);
        if (!transform) return null;
        const size = transform.contentSize;
        const width = size.width || this.contentWidth;
        const height = size.height || this.contentHeight;
        return new Vec2(uiPos.x - width / 2, uiPos.y - height / 2);
    }

    private onNodeTouchMove(event: EventTouch) {
        const local = this.toLocalPoint(event.getUILocation());
        if (!local) return;
        this.pointer = new Vec2(local.x, local.y);
    }

    private onNodeMouseMove(event: EventMouse) {
        const local = this.toLocalPoint(event.getUILocation());
        if (!local) return;
        this.pointer = new Vec2(local.x, local.y);
    }

    private hsvToColor(h: number, s: number, v: number, a: number) {
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        let r = 0;
        let g = 0;
        let b = 0;

        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
        }

        return new Color(
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255),
            Math.round(a * 255)
        );
    }

    private onGlobalTouchEnd() {
        this.pointer = null;
    }
}
