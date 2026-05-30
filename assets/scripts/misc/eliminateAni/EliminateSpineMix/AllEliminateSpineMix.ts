import { _decorator, AudioClip, Component } from "cc";

import { eventManager, GameEvent } from "../../../managers/EventManager";
import { Logger } from "../../../utils/logger";
import { MixStateManager } from "./MixStateManager";
import { GameManager } from "../../../managers/GameManager";
import { AudioManager } from "../../../managers/AudioManager";
import { disableSpinePremultipliedAlpha, ensureSpineSupport, sp } from "../../../utils/spineCompat";
const { ccclass, property } = _decorator;

@ccclass("AllEliminateSpineMix")
export class AllEliminateSpineMix extends Component {
    spSkeleton: sp.Skeleton | null = null;

    @property({
        type: [sp.SkeletonData],
        tooltip: "播消除前按皮肤组行下标切换 Spine.skeletonData；对应动作见mix1.ts中的配置",
    })
    skeletonDatas: sp.SkeletonData[] = [];

    @property(AudioClip)
    allEliminateAudioClip: AudioClip = null;

    @property
    finishAnimationName: string = "in_300";

    onLoad() {
        if (!ensureSpineSupport("AllEliminateSpineMix:onLoad")) return;
        this.spSkeleton = this.node.getChildByName("Spine")?.getComponent(sp.Skeleton) ?? null;
        disableSpinePremultipliedAlpha(this.spSkeleton);
        // once就可以，因为就触发一次
        eventManager.once(GameEvent.GAME_ALL_ELIMINATE_START, this.playAllEliminateAnimation, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ALL_ELIMINATE_START, this.playAllEliminateAnimation, this);
    }

    /**
     * 按行切换 SkeletonData；否则 Spine 一直用预制体默认骨骼，其它行的动画名可能不存在或不可见。
     */
    private switchSkeletonData(skinCfgIndex: number): void {
        if (!this.spSkeleton) return;

        const list = this.skeletonDatas;
        if (!list?.length) return;

        const idx = skinCfgIndex % list.length;
        const data = list[idx];
        if (!data) {
            Logger.warn("EliminateSpineMix:applySkeletonDataForRow", "skeletonDatas[" + idx + "] 为空");
            return;
        }

        if (this.spSkeleton.skeletonData !== data) {
            this.spSkeleton.skeletonData = data;
            this.spSkeleton.clearTracks();
            this.spSkeleton.setSkin("default");
            this.spSkeleton.setSlotsToSetupPose();
        }
    }

    /* 播放消除动画,参数位置,方向(0:横,1:竖) */
    playAllEliminateAnimation() {
        if (!this.spSkeleton) return;
        AudioManager.instance.playEffect(this.allEliminateAudioClip);
        // this.spSkeleton.node.setScale(1.13, 1.13, 1);
        if (MixStateManager.instance) {
            const skinCfgIndex = MixStateManager.instance.skinCfgCounter % this.skeletonDatas.length;
            this.switchSkeletonData(skinCfgIndex);
        } else {
            this.switchSkeletonData(0);
        }

        this.spSkeleton.setCompleteListener((trackEntry) => {
            Logger.info("EliminateSpineMix:playEliminateAnimation:", "-----trackEntry", trackEntry);
            const finishedName = trackEntry?.animation?.name ?? "";
            if (finishedName === this.finishAnimationName) {
                if (MixStateManager.instance) {
                    MixStateManager.instance.addToken(
                        1,
                        () => {
                            Logger.info("EliminateSpineMix:playEliminateAnimation:", "-----达到token限制");
                        },
                        () => {
                            this.node.destroy();
                        },
                    );
                } else {
                    this.node.destroy();
                }
            }
        });
        GameManager.instance.setScoreWithoutClearCount(300);
        this.spSkeleton.setAnimation(0, this.finishAnimationName, false);
    }
}
