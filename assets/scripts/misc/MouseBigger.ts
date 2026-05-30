import {
    _decorator,
    AudioClip,
    Component,
    find,
    instantiate,
    Node,
    ParticleSystem2D,
    Prefab,
    Sprite,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    v3,
    Vec3,
} from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { AudioManager } from "../managers/AudioManager";
const { ccclass, property } = _decorator;

@ccclass("MouseBigger")
export class MouseBigger extends Component {
    mouse: Sprite = null;
    bg: Sprite = null;

    @property({ tooltip: "老鼠随消除变大时的缓动时长（秒）" })
    mouseGrowDur = 0.2;

    @property({
        tooltip: "落子未消（无行/列消除）时，相对当前缩放的乘数，略小于 1；结果仍受 mouseShrinkMinAbsScale 约束",
    })
    mouseShrinkMulPerNoClear = 0.96;

    @property({ tooltip: "缩小后 scale.x / scale.y 的绝对值不低于该值（默认 1）" })
    mouseShrinkMinAbsScale = 1;

    @property({ tooltip: "剪影层相对本体的缩放倍率，配合透明度形成光晕" })
    bgGlowScaleMul = 1.1;

    @property({ tooltip: "奶酪粒子飞到老鼠目标的时长（秒）" })
    cheeseFlyDur = 0.32;

    // @property({ tooltip: "粒子到达后在销毁前多停留的时间（秒），尾迹更明显可加大" })
    // cheeseLingerAfterArrive = 0.18;

    @property({ tooltip: "粒子飞到终点时保留的缩放（相对飞行起点 1）" })
    cheeseEndScale = 0.58;

    @property({ tooltip: "飞行路径单侧隆起幅度，相对起点→终点弦长的比例（sin(πt)，首尾在直线上）" })
    cheeseFlyPathArcRelative = 0.12;

    @property({ tooltip: "垂直于弦的摆动幅度，相对弦长；与 cheeseFlyPathWiggleCycles 配合" })
    cheeseFlyPathWiggleRelative = 0.07;

    @property({ tooltip: "整段飞行内横向摆动的完整周期数（整数则 t=1 时摆幅为 0，落在目标点）" })
    cheeseFlyPathWiggleCycles = 2;

    @property({ tooltip: "飞行中节点 angle 摆动最大角度（度），周期同 wiggleCycles，首尾为 0" })
    cheeseFlyPathTwistDeg = 22;

    @property({
        tooltip:
            "到达目标后尾迹再保留的时长（秒）：emitter 停发后等已有粒子自然结束再销毁；0=按子节点 ParticleSystem2D 的 life+|lifeVar| 取最大，仍无则 0.35",
    })
    cheeseFlyTailLingerSec = 0;

    @property({ tooltip: "收到 GAME_ELIMINATE_START 后再隔多久开始飞粒子（秒）" })
    particleAfterEliminateStart = 0.3;

    @property({
        type: Prefab,
        tooltip: "从消除行/列中心飞向老鼠的粒子（根节点可挂 ParticleSystem2D）；由 GAME_ELIMINATE_START 触发",
    })
    particlePrefab: Prefab = null;
    @property(AudioClip)
    biggerAudio: AudioClip = null;
    @property(AudioClip)
    smallerAudio: AudioClip = null;
    @property(AudioClip)
    particleFlyAudio: AudioClip = null;
    /** 用于取消过期的延迟粒子（连续消除时只响应最后一次 START） */
    private _particleStartSeq = 0;

    /** 本组件统计：连续「落子未消」次数；有消除时由事件 payload 0 清零；满 2 触发缩小后归零 */
    private _mouseNoClearStreak = 0;

    onLoad() {
        this.mouse = this.node.getChildByName("Mouse").getComponent(Sprite);
        this.bg = this.node.getChildByName("BG").getComponent(Sprite);
        eventManager.on(GameEvent.GAME_ELIMINATE_START, this.onGameEliminateStart, this);
        eventManager.on(GameEvent.GAME_ELIMINATE, this.onGameEliminate, this);
        eventManager.on(GameEvent.GAME_NO_CLEAR_ROUNDS_CHANGED, this.onNoClearRoundsChanged, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ELIMINATE_START, this.onGameEliminateStart, this);
        eventManager.off(GameEvent.GAME_ELIMINATE, this.onGameEliminate, this);
        eventManager.off(GameEvent.GAME_NO_CLEAR_ROUNDS_CHANGED, this.onNoClearRoundsChanged, this);
    }

    /** 消除动画刚开始时发；延迟后再飞粒子，避免等整段动画播完 */
    onGameEliminateStart({
        worldPos,
        direction,
        blockIndex,
    }: {
        worldPos: Vec3;
        direction: number;
        blockIndex: number;
    }) {
        if (!this.particlePrefab || !worldPos) return;
        const seq = ++this._particleStartSeq;
        this.scheduleOnce(() => {
            if (!this.isValid || seq !== this._particleStartSeq) return;
            this.spawnCheeseFlyParticle(worldPos, direction, blockIndex);
        }, this.particleAfterEliminateStart);
    }

    /** scale 分量绝对值不低于 minAbs，保留正负（翻面） */
    private clampScaleComponentAbsMin(v: number, minAbs: number): number {
        if (minAbs <= 0) return v;
        const sign = v >= 0 ? 1 : -1;
        return sign * Math.max(Math.abs(v), minAbs);
    }

    /**
     * 借 GAME_NO_CLEAR_ROUNDS_CHANGED 区分本手是否未消：payload 为 0 表示有消除，清零本组件计数；
     * payload > 0 表示本手未消，计数 +1；计满 2 次执行缩小后计数归零（与 GameManager 的 rounds 数值脱钩）。
     */
    onNoClearRoundsChanged(rounds: number) {
        if (rounds <= 0) {
            this._mouseNoClearStreak = 0;
            return;
        }
        this._mouseNoClearStreak++;
        if (this._mouseNoClearStreak < 2) return;
        this._mouseNoClearStreak = 0;

        const mouseNode = this.mouse.node;
        const bgNode = this.bg.node;
        Tween.stopAllByTarget(mouseNode);
        Tween.stopAllByTarget(bgNode);

        const mul = this.mouseShrinkMulPerNoClear;
        const floor = this.mouseShrinkMinAbsScale;
        const sx = this.clampScaleComponentAbsMin(mouseNode.scale.x * mul, floor);
        const sy = this.clampScaleComponentAbsMin(mouseNode.scale.y * mul, floor);
        AudioManager.instance.playEffect(this.smallerAudio);
        const shrinkDur = this.mouseGrowDur;
        tween(mouseNode)
            .to(shrinkDur, { scale: v3(sx, sy, 1) }, { easing: "quadOut" })
            .start();
        tween(bgNode)
            .to(shrinkDur, { scale: v3(sx, sy, 1) }, { easing: "quadOut" })
            .start();
    }

    /** 动画播完后发：只驱动老鼠变大与剪影光晕 */
    onGameEliminate() {
        const mouseNode = this.mouse.node;
        const bgNode = this.bg.node;
        Tween.stopAllByTarget(mouseNode);
        Tween.stopAllByTarget(bgNode);

        const sx = mouseNode.scale.x * 1.05;
        const sy = mouseNode.scale.y * 1.05;
        const baseAngle = mouseNode.angle;

        AudioManager.instance.playEffect(this.biggerAudio, 0.5);
        const grow = this.mouseGrowDur;
        tween(mouseNode)
            .parallel(
                tween(mouseNode).to(grow, { scale: v3(sx, sy, 1) }, { easing: "backOut" }),
                tween(mouseNode).sequence(
                    tween().to(grow * 0.22, { angle: baseAngle - 5 }, { easing: "sineInOut" }),
                    tween().to(grow * 0.28, { angle: baseAngle + 6 }, { easing: "sineInOut" }),
                    tween().to(grow * 0.25, { angle: baseAngle - 3 }, { easing: "sineInOut" }),
                    tween().to(grow * 0.25, { angle: baseAngle }, { easing: "sineOut" }),
                ),
            )
            .start();

        const bgOpacity = bgNode.getComponent(UIOpacity) || bgNode.addComponent(UIOpacity);
        Tween.stopAllByTarget(bgOpacity);
        bgNode.setScale(mouseNode.scale);
        bgOpacity.opacity = 0;

        const glow = this.bgGlowScaleMul;
        tween(bgNode)
            .to(grow, { scale: v3(sx * glow, sy * glow, 1) }, { easing: "quadOut" })
            .start();

        tween(bgOpacity)
            .to(grow, { opacity: 80 }, { easing: "quadOut" })
            .call(() => {
                bgOpacity.opacity = 0;
                bgNode.setScale(v3(sx, sy, 1));
            })
            .start();
    }

    /**
     * 老鼠节点 anchor (0.5,0)，worldPosition 在脚底；粒子应飞向贴图几何中心：
     * 本地向上半格高（UITransform 已乘当前 scale/旋转）。
     */
    private getMouseParticleTargetWorld(): Vec3 {
        const n = this.mouse.node;
        const ui = n.getComponent(UITransform);
        if (!ui) return n.worldPosition.clone();
        return ui.convertToWorldSpaceAR(v3(40, ui.height * 0.5, 0));
    }

    /** 子节点里粒子寿命上界，用于停发后再等多久可整体销毁 */
    private estimateCheeseParticleTailSeconds(pss: ParticleSystem2D[]): number {
        let maxSec = 0;
        for (const ps of pss) {
            const life = ps.life;
            const lifeVar = (ps as ParticleSystem2D & { lifeVar?: number }).lifeVar ?? 0;
            maxSec = Math.max(maxSec, life + Math.abs(lifeVar));
        }
        return maxSec;
    }

    /** 到达目标后不再发射，尾迹粒子在原地（目标点）自然消亡 */
    private stopCheeseParticleEmit(pss: ParticleSystem2D[]): void {
        for (const ps of pss) {
            ps.emissionRate = 0;
        }
    }

    private scheduleDestroyCheeseFly(fly: Node, pss: ParticleSystem2D[]): void {
        if (pss.length === 0) {
            if (fly.isValid) fly.destroy();
            return;
        }
        this.stopCheeseParticleEmit(pss);
        let wait = this.cheeseFlyTailLingerSec;
        if (wait <= 0) {
            wait = this.estimateCheeseParticleTailSeconds(pss);
        }
        if (wait <= 0) wait = 0.35;
        this.scheduleOnce(() => {
            if (fly.isValid) fly.destroy();
        }, wait);
    }

    /** 粒子挂在 Canvas 下，用同一 UITransform 做世界坐标 → 本地坐标的飞行 */
    private spawnCheeseFlyParticle(cheeseWorld: Vec3, direction: number, blockIndex: number) {
        const canvas = find("Canvas");
        if (!canvas) return;
        const canvasTf = canvas.getComponent(UITransform);
        if (!canvasTf) return;

        const fly = instantiate(this.particlePrefab);
        fly.parent = canvas;
        const startLocal = canvasTf.convertToNodeSpaceAR(cheeseWorld);
        const endLocal = canvasTf.convertToNodeSpaceAR(this.getMouseParticleTargetWorld());
        fly.setPosition(startLocal);
        fly.setScale(1, 1, 1);

        const pss = fly.getComponentsInChildren(ParticleSystem2D);
        for (const ps of pss) {
            ps.resetSystem();
        }
        // AudioManager.instance.playEffect(this.particleFlyAudio);

        const flyDur = this.cheeseFlyDur;
        const endSc = this.cheeseEndScale;
        const baseAngle = fly.angle;

        tween(fly)
            .to(flyDur, { scale: v3(endSc, endSc, 1) }, { easing: "sineOut" })
            .start();

        const dx = endLocal.x - startLocal.x;
        const dy = endLocal.y - startLocal.y;
        const chord = Math.hypot(dx, dy);
        const invChord = chord > 1e-4 ? 1 / chord : 0;
        const perpX = -dy * invChord;
        const perpY = dx * invChord;

        const arcA = chord * this.cheeseFlyPathArcRelative;
        const wigA = chord * this.cheeseFlyPathWiggleRelative;
        const wCycles = Math.max(1, Math.round(this.cheeseFlyPathWiggleCycles));
        const twist = this.cheeseFlyPathTwistDeg;

        const pathT = { t: 0 };
        const posTmp = new Vec3();
        tween(pathT)
            .to(
                flyDur,
                { t: 1 },
                {
                    easing: "quadOut",
                    onUpdate: () => {
                        if (!fly.isValid) return;
                        const t = pathT.t;
                        Vec3.lerp(posTmp, startLocal, endLocal, t);
                        const arcOff = Math.sin(t * Math.PI) * arcA;
                        const wigOff = Math.sin(t * Math.PI * 2 * wCycles) * wigA;
                        const side = arcOff + wigOff;
                        fly.setPosition(posTmp.x + perpX * side, posTmp.y + perpY * side, posTmp.z);
                        fly.angle = baseAngle + Math.sin(t * Math.PI * 2 * wCycles) * twist;
                    },
                },
            )
            .call(() => {
                if (!fly.isValid) return;
                fly.setPosition(endLocal);
                fly.angle = baseAngle;
                this.scheduleDestroyCheeseFly(fly, pss);
            })
            .start();
    }
}
