import {
    _decorator,
    Animation,
    Component,
    log,
    Node,
    Prefab,
    Vec3,
    view,
    sys,
    dragonBones
} from "cc";
import { ComboAni } from "../ComboAni";
import { EndPage } from "../misc/EndPage";
import { AudioManager } from "./AudioManager";
import { boardBlocksConfig, dragOptionsConfig, GameCustomInfo } from "../configs/config";
import { DragOptionConfig } from "../configs/types";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
    private static _instance: GameManager = null;
    boardBlocksConfig: typeof boardBlocksConfig = null!;
    dragOptionsConfig: DragOptionConfig[] = null!;

    @property(Prefab)
    encouragePrefab: Prefab = null;
    @property(Prefab)
    bonusLabelPrefab: Prefab = null;
    @property(Prefab)
    clearAniPrefab: Prefab = null;
    @property(Node)
    heartNode: Node = null!; // 心形节点
    @property(Node)
    comboAni: Node = null!;
    @property(EndPage)
    endPage: EndPage = null!;
    score: number = 0;
    combo: number = -1;
    noClearRounds: number = 0; // 持续未清除的轮数，连续3次会导致combo中断

    @property(Node)
    adsNode: Node = null!;
    cleanTimes: number = 0;

    public static get instance(): GameManager {
        return this._instance;
    }

    onLoad() {
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
        this.initConfigs();
        if (this.heartNode) {
            if (GameCustomInfo.name === "BlockBrush") return;
            this.heartNode.active = false;
        }
    }

    start() {
        // 延迟一帧确保适配已完成
        this.scheduleOnce(() => {
            this.updateAdsNodePosition();
        }, 0);

        // 监听窗口尺寸变化（Web 平台）
        if (sys.isBrowser && typeof window !== "undefined") {
            window.addEventListener("resize", this.onResize.bind(this));
        }
    }

    initConfigs() {
        this.boardBlocksConfig = boardBlocksConfig;
        this.dragOptionsConfig = dragOptionsConfig;
    }

    /**
     * 更新 adsNode 位置，使其贴紧可见区域底部（黑边下沿）
     */
    private updateAdsNodePosition() {
        if (!this.adsNode) {
            return;
        }
        const frameSize = view.getFrameSize();
        // log("frameSize", frameSize);
        const visibleSize = view.getVisibleSize();
        // log("visibleSize", visibleSize);
        const designWidthScale = frameSize.width / visibleSize.width;
        const designHeightScale = frameSize.height / visibleSize.height;
        // log("designWidthScale", designWidthScale);
        // log("designHeightScale", designHeightScale);
        if (designWidthScale > designHeightScale) {
            // 左右黑边，designHeightScale为设计尺寸拉伸比例，visibleSize.height为设计高度拉伸后的高度
            this.adsNode.setPosition(
                this.adsNode.position.x,
                -visibleSize.height / 2,
                this.adsNode.position.z
            );
        } else {
            // 上下黑边,designWidthScale为设计尺寸拉伸比例
            this.adsNode.setPosition(
                this.adsNode.position.x,
                -frameSize.height / 2 / designWidthScale, // 计算在设计尺寸中的高度
                this.adsNode.position.z
            );
        }
    }

    /**
     * 窗口尺寸变化时的回调
     */
    private onResize() {
        // 延迟一帧确保 view 已更新
        this.scheduleOnce(() => {
            this.updateAdsNodePosition();
        }, 0);
    }

    onDestroy() {
        // 移除事件监听
        if (sys.isBrowser && typeof window !== "undefined") {
            window.removeEventListener("resize", this.onResize.bind(this));
        }
    }

    getBaseScore(lines: number): number {
        if (lines <= 0) return 0;
        if (lines === 1) return 10;
        if (lines === 2) return 20;
        if (lines === 3) return 30;
        if (lines === 4) return 120;
        return 200;
    }

    setScoreWithoutClearCount(score: number) {
        this.score += score;
    }

    setScoreByClearCount(clearCount: number) {
        if (clearCount > 0) {
            this.combo++;
            // log("setScoreByClearCount", this.combo);
            AudioManager.instance.playComboEffect(this.combo);
            if (this.combo > 0) {
                this.comboAni
                    .getComponent(ComboAni)
                    .playComboAnimation(this.combo, Vec3.ZERO, () => {});

                this.showHeartAnimation();
            }
            this.noClearRounds = 0;
        } else {
            this.noClearRounds++;
            if (this.noClearRounds >= 3) {
                this.combo = -1;
                this.hideHeartNode();
            }
        }

        const curRoundScore = (this.combo + 1) * this.getBaseScore(clearCount) + clearCount * 8;
        this.score += curRoundScore;
        return curRoundScore;
    }

    /**
     * 显示心形节点并播放动画
     */
    private showHeartAnimation(): void {
        if (!this.heartNode) {
            Logger.error("GameManager.showHeartAnimation", "heartNode 未设置");
            return;
        }

        // // 如果已经显示，不需要重复播放 heart_start
        // if (this.heartNode.active) {
        //     return;
        // }

        // 显示心形节点
        this.heartNode.active = true;
        if (GameCustomInfo.name === "BlockBrush") {
            const dragon = this.heartNode.getChildByName("dragon");
            dragon.active = true;
            const dragonAnimation = dragon.getComponent(dragonBones.ArmatureDisplay);
            dragon.active = true;
            dragonAnimation.playAnimation("newAnimation_2", 1);
            dragonAnimation.on(
                dragonBones.EventObject.COMPLETE,
                (event: dragonBones.EventObject) => {
                    if (event.animationState.name === "newAnimation_2") {
                        dragonAnimation.playAnimation("newAnimation", 0);
                    }
                },
                this
            );
            return;
        }

        // 获取 Animation 组件
        const animation = this.heartNode.getComponent(Animation);
        if (!animation) {
            log("heartNode 没有 Animation 组件");
            return;
        }

        // 监听动画完成事件，播放完成后播放 heart_idle
        animation.once(
            Animation.EventType.FINISHED,
            () => {
                if (this.heartNode && this.heartNode.active) {
                    const anim = this.heartNode.getComponent(Animation);
                    if (anim) {
                        // 播放 heart_idle 动画（循环播放）
                        anim.play("heart_idle");
                    }
                }
            },
            this
        );

        // 播放 heart_start 动画（播放一次）
        animation.play("heart_start");
    }

    /**
     * 隐藏心形节点
     */
    private hideHeartNode(): void {
        if (GameCustomInfo.name === "BlockBrush") {
            const dragon = this.heartNode.getChildByName("dragon");
            const dragonAnimation = dragon.getComponent(dragonBones.ArmatureDisplay);
            dragon.active = true;
            const aniName2play = "newAnimation_1";
            const curname = dragonAnimation.armature().animation.lastAnimationName;
            if (aniName2play !== curname) {
                dragonAnimation.playAnimation("newAnimation_1", 1);
            }

            return;
        }
        if (this.heartNode) {
            this.heartNode.active = false;
        }
    }
}
