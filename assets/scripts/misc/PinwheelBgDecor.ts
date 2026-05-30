import {
    _decorator,
    Color,
    Component,
    Graphics,
    instantiate,
    Node,
    ParticleSystem2D,
    Prefab,
    UITransform,
} from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";

const { ccclass, property } = _decorator;

function fillTriangle(
    g: Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    fill: Color,
): void {
    g.fillColor = fill;
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.close();
    g.fill();
}

function rot90k(x: number, y: number, k: number): [number, number] {
    let px = x,
        py = y;
    for (let i = 0; i < ((k % 4) + 4) % 4; i++) {
        const nx = -py;
        py = px;
        px = nx;
    }
    return [px, py];
}

function pinwheelOuterRadius(s: number): number {
    return 2 * s;
}

function midpoint(ax: number, ay: number, bx: number, by: number): [number, number] {
    return [(ax + bx) * 0.5, (ay + by) * 0.5];
}

/** 高饱和「多巴胺」配色：正方形 / 四叶 / 轴心，按消除线数轮换 */
const DOPAMINE_SWATCHES: ReadonlyArray<{ s: string; b: string; h: string }> = [
    { s: "#FF6B9D", b: "#00F5D4", h: "#FFBE0B" },
    { s: "#FF006E", b: "#8338EC", h: "#FEE440" },
    { s: "#06FFA5", b: "#FF3366", h: "#3A86FF" },
    { s: "#F15BB5", b: "#00BBF9", h: "#FF9505" },
    { s: "#9B5DE5", b: "#00F593", h: "#FFEA00" },
    { s: "#00F5A0", b: "#FF3864", h: "#FFD60A" },
    { s: "#FF5D8F", b: "#7BFCFF", h: "#B388FF" },
    { s: "#B5179E", b: "#4CC9F0", h: "#F72585" },
];

/**
 * Board 下单个风车背景：尺寸铺满 Board，初始极淡、慢转；
 * 消除时热度上升 → 不透明度升高、转速加快；
 * Combo 每 +1 额外叠加热度（转速再抬一档）；
 * `GameManager.noClearRounds` 每 +1 按 heatDropPerNoClearRound×noClearHeatDropScale 衰减热度；达到 3（combo 断）时热度在 comboBreakHeatRampDownSec 内平滑降到 0（转速/透明度随现有平滑跟随）。
 *
 * 透明度写入 Graphics 顶点 alpha 并重绘（UIOpacity 对 Graphics 常不生效）。
 * 粒子：①~③ 在 spinner 上随转；角速度 strength 映射 0~1。
 * 不透明度与「当前实际角速度」一一对应：转得快则更实，转得慢则更淡，同步升降。
 */
@ccclass("PinwheelBgDecor")
export class PinwheelBgDecor extends Component {
    @property({ tooltip: "关闭后不监听消除、不旋转" })
    enabledDecor = true;

    @property({ type: Color, tooltip: "中心正方形颜色（默认金橙 #FFCD45）" })
    squareColor = new Color(255, 205, 69, 255);

    @property({ type: Color, tooltip: "四叶三角扇颜色（默认天蓝，与方块区分）" })
    bladeColor = new Color(74, 158, 243, 255);

    @property({ type: Color, tooltip: "中心圆扣颜色" })
    hubColor = new Color(211, 47, 47, 255);

    @property({ tooltip: "开启后中心方、四叶、轴心按消除线数轮换多巴胺配色（关闭则用上方三色）" })
    useDopaminePalette = true;

    @property({ tooltip: "无消除时的不透明度（0-255）" })
    idleOpacity = 30;

    @property({ tooltip: "消除活跃时的不透明度（0-255）" })
    activeOpacity = 180;

    @property({ tooltip: "每次触发消除动画时增加的热度（0-1），越大越容易拉满" })
    heatPerClear = 0.28;

    @property({ tooltip: "noClearRounds 每 +1（连续空放 1 次或 2 次）时减少的热度；第 3 次见 comboBreakHeatRampDownSec" })
    heatDropPerNoClearRound = 0.34;

    @property({
        tooltip:
            "对单次空放扣热的倍率（≥0）。1=按 heatDropPerNoClearRound 足额扣；调小（如 0.4~0.6）则衰减慢、更柔和",
    })
    noClearHeatDropScale = 0.55;

    @property({
        tooltip:
            "连续 3 次空放（combo 断）后，热度从当前值线性降到 0 的时长（秒）；越大越慢。≤0 时仍为瞬间清零",
    })
    comboBreakHeatRampDownSec = 1.25;

    @property({ tooltip: "Combo 每 +1（连消多一手）额外增加的热度，可叠加在「每次消除」之上" })
    heatPerComboStep = 0.03;

    @property({ tooltip: "最低转速（度/秒），建议 1~4 才够「很慢」" })
    spinSpeedMinDeg = 2;

    @property({ tooltip: "最高转速（度/秒），建议 200+ 消除时才有明显加速感" })
    spinSpeedMaxDeg = 780;

    @property({ tooltip: "转速映射热度指数：>1 时低热度更慢、高热度更快（对比更强）" })
    spinHeatExponent = 1.45;

    @property({ tooltip: "转速向目标靠近的平滑系数（越大越快跟上热度）" })
    spinSmoothing = 7;

    @property({
        serializable: false,
        tooltip: "当前角速度（度/秒），运行时每帧由热度与平滑更新；仅用于调试观察，不写入场景资源",
    })
    currentSpinDegPerSec = 0;

    @property({
        tooltip:
            "每帧将旋转角折到 0~360°，减轻长时间旋转后 angle 绝对值过大带来的浮点误差；关闭后可对比是否因角度累积导致卡顿",
    })
    wrapSpinnerAngle = true;

    /** 绘制用半边长（逻辑单位），再按 Board 尺寸缩放以铺满 */
    @property
    geometryHalf = 10;

    @property
    hubRadius = 3.2;

    @property({
        type: Prefab,
        tooltip:
            "可选；每片三角扇 3 个位置（外尖/直角/直角—圆心中点），分三阶段随角速度强度解锁。根或子节点需 ParticleSystem2D",
    })
    bladeParticlePrefab: Prefab | null = null;

    @property({
        tooltip: "阶段②：strength≥此值解锁直角顶点粒子；建议 < 阶段③（角速度归一化 0~1）",
    })
    bladeParticlePhase2Strength = 0.28;

    @property({ tooltip: "阶段③：解锁「直角—圆心」中点粒子（在 spinner 上）" })
    bladeParticlePhase3Strength = 0.76;

    @property({
        tooltip: "按角速度映射强度缩放发射率：最低转速→0，最高转速→预制 emissionRate（与 spinSpeedMinDeg/MaxDeg 一致）",
    })
    bladeParticleDriveEmission = true;

    @property({ tooltip: "按角速度映射强度在「最短 life×系数」与预制 life 之间插值" })
    bladeParticleDriveLife = true;

    @property({ tooltip: "最低转速时 life 下限 = 预制 life × 该系数（越小冷机拖尾越短）" })
    bladeParticleLifeMinFactor = 0.12;

    @property({
        tooltip: "按角速度映射强度缩放 totalParticles：最低转速→0，最高转速→预制值（如 200）；频繁改可关",
    })
    bladeParticleDriveTotalParticles = true;

    @property({
        tooltip:
            "角速度 ≤ spinSpeedMinDeg+此值（度/秒）时粒子强度视为 0，避免平滑/浮点略高于最低速时出现 round 成 8 粒等情况",
    })
    bladeParticleSpinDeadZoneDeg = 0.5;

    private _cover: Node | null = null;
    private _spinner: Node | null = null;
    private _graphics: Graphics | null = null;
    private _heat = 0;
    /** combo 断（第 3 次空放）后热度平滑归零 */
    private _comboBreakHeatRampActive = false;
    private _comboBreakHeatRampStart = 0;
    private _comboBreakHeatRampElapsed = 0;
    private _comboBreakHeatRampDuration = 0;
    private _lastRedrawSig = "";
    private _paletteIndex = 0;
    private _effSquare = new Color();
    private _effBlade = new Color();
    private _effHub = new Color();
    /** 粒子父节点 PinwheelBladeParticles（仅作容器，无 UIOpacity） */
    private _bladeParticlesHolder: Node | null = null;

    /** 各实例里 ParticleSystem2D 的预制基准值，每帧按 currentSpinDegPerSec 映射强度回写 */
    private _bladeParticleBases: {
        ps: ParticleSystem2D;
        baseEmissionRate: number;
        baseLife: number;
        baseTotalParticles: number;
        /** 1=外尖 2=直角 3=直角-圆心中点 */
        phaseTier: number;
        wasZeroStrength: boolean;
    }[] = [];

    protected onLoad(): void {
        this._refreshEffectivePaintColors();
        this._buildHierarchy();
        eventManager.on(GameEvent.GAME_CLEAR_ANIMATION_START, this._onClearStart, this);
        eventManager.on(GameEvent.GAME_NO_CLEAR_ROUNDS_CHANGED, this._onNoClearRoundsChanged, this);
        eventManager.on(GameEvent.GAME_COMBO_STEP, this._onComboStep, this);
    }

    protected onDestroy(): void {
        eventManager.off(GameEvent.GAME_CLEAR_ANIMATION_START, this._onClearStart, this);
        eventManager.off(GameEvent.GAME_NO_CLEAR_ROUNDS_CHANGED, this._onNoClearRoundsChanged, this);
        eventManager.off(GameEvent.GAME_COMBO_STEP, this._onComboStep, this);
    }

    protected update(dt: number): void {
        if (!this.enabledDecor || !this._cover?.isValid) return;

        if (this._comboBreakHeatRampActive) {
            this._comboBreakHeatRampElapsed += dt;
            const d = this._comboBreakHeatRampDuration;
            const u = d > 1e-6 ? Math.min(1, this._comboBreakHeatRampElapsed / d) : 1;
            this._heat = this._comboBreakHeatRampStart * (1 - u);
            if (u >= 1) {
                this._heat = 0;
                this._comboBreakHeatRampActive = false;
            }
        }

        const exp = Math.max(0.35, this.spinHeatExponent);
        const spinT = Math.pow(Math.min(1, Math.max(0, this._heat)), exp);
        const targetSpin = this.spinSpeedMinDeg + (this.spinSpeedMaxDeg - this.spinSpeedMinDeg) * spinT;
        this.currentSpinDegPerSec += (targetSpin - this.currentSpinDegPerSec) * Math.min(1, this.spinSmoothing * dt);

        const spinAlpha = this._opacityForSpin(this.currentSpinDegPerSec);
        // 透明度严格跟「当前转速」走，与加速/减速同相位
        this._redrawWindmillIfNeeded(spinAlpha);
        this._syncBladeParticleSystemsBySpinSpeed(this.currentSpinDegPerSec);

        if (this._spinner) {
            this._spinner.angle -= this.currentSpinDegPerSec * dt;
            if (this.wrapSpinnerAngle) {
                this._spinner.angle = PinwheelBgDecor._wrapAngleDeg360(this._spinner.angle);
            }
        }
    }

    /**
     * 角速度在 [spinSpeedMinDeg+deadZone, spinSpeedMaxDeg] → [0,1]；
     * deadZone 用于吃掉平滑角速度略高于最低值时仍算出 ~8 粒（round(200×0.04)）的情况。
     */
    private _particleStrengthFromSpinSpeed(spinDegPerSec: number): number {
        const lo = this.spinSpeedMinDeg;
        const hi = this.spinSpeedMaxDeg;
        if (hi <= lo) return spinDegPerSec >= hi ? 1 : 0;
        const floor = lo + Math.max(0, this.bladeParticleSpinDeadZoneDeg);
        if (spinDegPerSec <= floor) return 0;
        const denom = hi - floor;
        if (denom <= 1e-6) return spinDegPerSec >= hi ? 1 : 0;
        return Math.min(1, Math.max(0, (spinDegPerSec - floor) / denom));
    }

    /** 阶段① strength>0；②③ 在 spinner 上随角速度阈值解锁。 */
    private _maxUnlockedBladeParticlePhase(strength: number): number {
        if (strength <= 0) return 0;
        let p = 1;
        if (strength >= this.bladeParticlePhase2Strength) p = Math.max(p, 2);
        if (strength >= this.bladeParticlePhase3Strength) p = Math.max(p, 3);
        return p;
    }

    private _syncBladeParticleSystemsBySpinSpeed(spinDegPerSec: number): void {
        if (this._bladeParticleBases.length === 0) return;
        const strength = this._particleStrengthFromSpinSpeed(spinDegPerSec);
        const maxPhase = this._maxUnlockedBladeParticlePhase(strength);

        for (let i = 0; i < this._bladeParticleBases.length; i++) {
            const b = this._bladeParticleBases[i];
            const ps = b.ps;
            if (!ps?.isValid) continue;

            const gated = maxPhase >= b.phaseTier ? strength : 0;
            const rawCount = b.baseTotalParticles * gated;
            const effStrength = rawCount < 0.5 ? 0 : gated;

            if (effStrength <= 0) {
                if (this.bladeParticleDriveEmission) ps.emissionRate = 0;
                if (this.bladeParticleDriveTotalParticles) ps.totalParticles = 0;
                if (!b.wasZeroStrength) {
                    ps.stopSystem();
                    b.wasZeroStrength = true;
                }
                continue;
            }

            if (b.wasZeroStrength) {
                ps.resetSystem();
                b.wasZeroStrength = false;
            }

            if (this.bladeParticleDriveEmission) {
                ps.emissionRate = b.baseEmissionRate * effStrength;
            }
            if (this.bladeParticleDriveLife) {
                const lo = b.baseLife * this.bladeParticleLifeMinFactor;
                const hi = b.baseLife;
                ps.life = lo + (hi - lo) * effStrength;
            }
            if (this.bladeParticleDriveTotalParticles) {
                ps.totalParticles = Math.max(1, Math.round(b.baseTotalParticles * effStrength));
            }
        }
    }

    /** 折到 [0, 360)，与任意同余角视觉一致 */
    private static _wrapAngleDeg360(angle: number): number {
        let a = angle % 360;
        if (a < 0) a += 360;
        return a;
    }

    /** 角速度 min→idleOpacity，max→activeOpacity，线性对应 */
    private _opacityForSpin(spinDegPerSec: number): number {
        const d = this.spinSpeedMaxDeg - this.spinSpeedMinDeg;
        const u = d > 1e-5 ? (spinDegPerSec - this.spinSpeedMinDeg) / d : 0;
        const t = Math.min(1, Math.max(0, u));
        const v = this.idleOpacity + (this.activeOpacity - this.idleOpacity) * t;
        return Math.round(Math.min(255, Math.max(0, v)));
    }

    private _onClearStart(_blockIndex: number, linesCleared?: number): void {
        if (!this.enabledDecor) return;
        if (this.useDopaminePalette) {
            const n = typeof linesCleared === "number" && linesCleared > 0 ? linesCleared : 1;
            const len = DOPAMINE_SWATCHES.length;
            this._paletteIndex = (this._paletteIndex + n) % len;
            this._refreshEffectivePaintColors();
            this._lastRedrawSig = "";
        }
        this._comboBreakHeatRampActive = false;
        this._heat = Math.min(1, this._heat + this.heatPerClear);
    }

    private _refreshEffectivePaintColors(): void {
        if (this.useDopaminePalette) {
            const w = DOPAMINE_SWATCHES[this._paletteIndex % DOPAMINE_SWATCHES.length];
            this._effSquare = new Color().fromHEX(w.s);
            this._effBlade = new Color().fromHEX(w.b);
            this._effHub = new Color().fromHEX(w.h);
        } else {
            this._effSquare = this.squareColor.clone();
            this._effBlade = this.bladeColor.clone();
            this._effHub = this.hubColor.clone();
        }
    }

    private _paintSquare(): Color {
        return this.useDopaminePalette ? this._effSquare : this.squareColor;
    }

    private _paintBlade(): Color {
        return this.useDopaminePalette ? this._effBlade : this.bladeColor;
    }

    private _paintHub(): Color {
        return this.useDopaminePalette ? this._effHub : this.hubColor;
    }

    private _onNoClearRoundsChanged(rounds: number): void {
        if (!this.enabledDecor) return;
        if (rounds <= 0) return;

        if (rounds >= 3) {
            const rampSec = this.comboBreakHeatRampDownSec;
            if (rampSec <= 1e-4) {
                this._comboBreakHeatRampActive = false;
                this._heat = 0;
                this.currentSpinDegPerSec = this.spinSpeedMinDeg;
                this._lastRedrawSig = "";
                this._redrawWindmillIfNeeded(this._opacityForSpin(this.currentSpinDegPerSec));
            } else {
                this._comboBreakHeatRampDuration = Math.max(0.05, rampSec);
                this._comboBreakHeatRampStart = this._heat;
                this._comboBreakHeatRampElapsed = 0;
                this._comboBreakHeatRampActive = true;
            }
            return;
        }

        const drop = this.heatDropPerNoClearRound * Math.max(0, this.noClearHeatDropScale);
        this._heat = Math.max(0, this._heat - drop);
    }

    private _onComboStep(_combo: number): void {
        if (!this.enabledDecor) return;
        this._heat = Math.min(1, this._heat + this.heatPerComboStep);
    }

    /** 把不透明度写进 fill 的 alpha（Graphics 顶点色，不依赖节点 UIOpacity） */
    private _redrawWindmillIfNeeded(alpha255: number): void {
        const g = this._graphics;
        if (!g?.isValid) return;

        const sq = this._paintSquare();
        const bl = this._paintBlade();
        const hb = this._paintHub();
        const ck = (c: Color) => `${c.r},${c.g},${c.b}`;
        const sig = `${alpha255}|${ck(sq)}|${ck(bl)}|${ck(hb)}`;
        if (sig === this._lastRedrawSig) return;
        this._lastRedrawSig = sig;

        const a = (c: Color) => {
            const o = c.clone();
            o.a = alpha255;
            return o;
        };

        const s = this.geometryHalf;
        g.clear();

        const blx = -s,
            bly = -s;
        const brx = s,
            bry = -s;
        const trx = s,
            try_ = s;
        const tlx = -s,
            tly = s;

        g.fillColor = a(sq);
        g.moveTo(blx, bly);
        g.lineTo(brx, bry);
        g.lineTo(trx, try_);
        g.lineTo(tlx, tly);
        g.close();
        g.fill();

        const colBlade = a(bl);
        const p0: [number, number][] = [
            [-s, -s],
            [0, 0],
            [0, -2 * s],
        ];
        for (let k = 0; k < 4; k++) {
            const [ax, ay] = rot90k(p0[0][0], p0[0][1], k);
            const [bx, by] = rot90k(p0[1][0], p0[1][1], k);
            const [cx, cy] = rot90k(p0[2][0], p0[2][1], k);
            fillTriangle(g, ax, ay, bx, by, cx, cy, colBlade);
        }

        g.fillColor = a(hb);
        g.circle(0, 0, this.hubRadius);
        g.fill();
    }

    private _buildHierarchy(): void {
        const boardUt = this.node.getComponent(UITransform);
        if (!boardUt) return;

        const existing = this.node.getChildByName("PinwheelBoardCover");
        if (existing) existing.destroy();

        const cover = new Node("PinwheelBoardCover");
        cover.parent = this.node;
        cover.setPosition(0, 30, 0);
        cover.setSiblingIndex(0);

        const cut = cover.addComponent(UITransform);
        cut.setAnchorPoint(0.5, 0.5);
        cut.setContentSize(boardUt.width, boardUt.height);

        const spinner = new Node("PinwheelSpinner");
        spinner.parent = cover;
        spinner.setPosition(0, 0, 0);
        const sUt = spinner.addComponent(UITransform);
        sUt.setAnchorPoint(0.5, 0.5);

        const s = this.geometryHalf;
        const bound = pinwheelOuterRadius(s);
        sUt.setContentSize(bound * 2 + 6, bound * 2 + 6);

        const boardW = boardUt.width;
        const boardH = boardUt.height;
        const uniform = Math.max(boardW, boardH) / (4 * s);
        spinner.setScale(uniform, uniform, 1);

        const g = spinner.addComponent(Graphics);
        this._graphics = g;

        this.currentSpinDegPerSec = this.spinSpeedMinDeg;
        this._setupBladeParticles(spinner, s);

        this._lastRedrawSig = "";
        this._cover = cover;
        this._spinner = spinner;
        this._redrawWindmillIfNeeded(this._opacityForSpin(this.currentSpinDegPerSec));
    }

    /**
     * 每片三角与 Graphics 一致：顶点 0=(-s,-s) 直角，1=(0,0) 圆心，2=(0,-2s) 外尖。
     * 阶段①仅外尖；②+直角；③+直角—圆心中点。
     */
    private _setupBladeParticles(spinner: Node, s: number): void {
        this._bladeParticlesHolder = null;
        this._bladeParticleBases.length = 0;
        const old = spinner.getChildByName("PinwheelBladeParticles");
        if (old?.isValid) old.destroy();

        if (!this.bladeParticlePrefab) return;

        const holder = new Node("PinwheelBladeParticles");
        holder.parent = spinner;
        holder.setPosition(0, 0, 0);
        this._bladeParticlesHolder = holder;

        const pushAt = (lx: number, ly: number, k: number, phaseTier: number, nameSuffix: string): void => {
            const [x, y] = rot90k(lx, ly, k);
            const n = instantiate(this.bladeParticlePrefab);
            n.name = `BladeP_${k}_${nameSuffix}`;
            n.parent = holder;
            n.setPosition(x, y, 0);
            const ps = n.getComponent(ParticleSystem2D) ?? n.getComponentInChildren(ParticleSystem2D);
            if (ps) {
                this._bladeParticleBases.push({
                    ps,
                    baseEmissionRate: ps.emissionRate,
                    baseLife: ps.life,
                    baseTotalParticles: ps.totalParticles,
                    phaseTier,
                    wasZeroStrength: false,
                });
            }
        };

        for (let k = 0; k < 4; k++) {
            const rx = -s,
                ry = -s;
            const ox = 0,
                oy = -2 * s;
            const [mxRc, myRc] = midpoint(rx, ry, 0, 0);

            pushAt(ox, oy, k, 1, "tip");
            pushAt(rx, ry, k, 2, "right");
            pushAt(mxRc, myRc, k, 3, "midHub");
        }

        this._syncBladeParticleSystemsBySpinSpeed(this.currentSpinDegPerSec);
    }
}
