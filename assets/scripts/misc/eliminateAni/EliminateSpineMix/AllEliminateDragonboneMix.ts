import { _decorator, AudioClip, Component, dragonBones } from "cc";

import { GameManager } from "../../../managers/GameManager";
import { AudioManager } from "../../../managers/AudioManager";
import { eventManager, GameEvent } from "../../../managers/EventManager";
import { Logger } from "../../../utils/logger";
import { MixStateManager } from "./MixStateManager";

const { ccclass, property } = _decorator;

const LOG_TAG = "AllEliminateDragonboneMix";

@ccclass("AllEliminateDragonboneMix")
export class AllEliminateDragonboneMix extends Component {
    private armature: dragonBones.ArmatureDisplay | null = null;
    /** 是否已注册 COMPLETE 回调（避免对已销毁的 ArmatureDisplay 调用 off） */
    private _completeListenerBound = false;

    @property({
        type: dragonBones.ArmatureDisplay,
        tooltip: "可选：直接绑定子节点上的 ArmatureDisplay；留空则按子节点名或整棵子树查找",
    })
    armatureDisplayRef: dragonBones.ArmatureDisplay | null = null;

    @property({
        tooltip: "龙骨子节点名；未找到时依次尝试 Dragon、Spine，再扫描子树",
    })
    armatureChildName = "Spine";

    @property({
        type: [dragonBones.DragonBonesAsset],
        tooltip: "全屏消除前按 skinCfgCounter 切换龙骨资源，下标与 dragonAtlasAssets 一一对应",
    })
    dragonAssets: dragonBones.DragonBonesAsset[] = [];

    @property({
        type: [dragonBones.DragonBonesAtlasAsset],
        tooltip: "与 dragonAssets 同下标的图集；可只配 dragonAssets，沿用预制体默认图集",
    })
    dragonAtlasAssets: dragonBones.DragonBonesAtlasAsset[] = [];

    @property({ tooltip: "切换资源后使用的骨架名；空则保留预制体上的 armatureName" })
    armatureName = "Armature";

    @property({ tooltip: "全屏消除龙骨动画名（unbelievable 资源为 Unbelievable）" })
    animationName = "Unbelievable";

    @property(AudioClip)
    allEliminateAudioClip: AudioClip = null;

    onLoad() {
        this.armature = this.resolveArmature();
        if (!this.armature) {
            Logger.warn(LOG_TAG, "onLoad: 未找到 ArmatureDisplay");
            return;
        }
        eventManager.once(GameEvent.GAME_ALL_ELIMINATE_START, this.playAllEliminateAnimation, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ALL_ELIMINATE_START, this.playAllEliminateAnimation, this);
        this.safeUnbindArmatureComplete();
        this.armature = null;
    }

    /** 编辑器预览销毁时 ArmatureDisplay 内部 eventTarget 可能已为 null，需防护 */
    private safeUnbindArmatureComplete(): void {
        if (!this._completeListenerBound) return;
        this._completeListenerBound = false;
        const ad = this.armature;
        if (!ad?.isValid || !ad.node?.isValid) return;
        try {
            ad.off(dragonBones.EventObject.COMPLETE, this.onDragonBonesComplete, this);
        } catch {
            // ignore: preview / destroy order
        }
    }

    private bindArmatureCompleteOnce(): void {
        if (!this.armature?.isValid || !this.armature.node?.isValid) return;
        this.safeUnbindArmatureComplete();
        try {
            this.armature.once(dragonBones.EventObject.COMPLETE, this.onDragonBonesComplete, this);
            this._completeListenerBound = true;
        } catch (e) {
            Logger.warn(LOG_TAG, "bindArmatureCompleteOnce failed", e);
        }
    }

    private resolveArmature(): dragonBones.ArmatureDisplay | null {
        if (this.armatureDisplayRef?.isValid) {
            return this.armatureDisplayRef;
        }
        const tryNames = [this.armatureChildName, "Spine", "Dragon"].filter((n, i, arr) => n && arr.indexOf(n) === i);
        for (const name of tryNames) {
            const child = this.node.getChildByName(name);
            const ad = child?.getComponent(dragonBones.ArmatureDisplay);
            if (ad) return ad;
        }
        const onRoot = this.node.getComponent(dragonBones.ArmatureDisplay);
        if (onRoot) return onRoot;
        const inChildren = this.node.getComponentsInChildren(dragonBones.ArmatureDisplay);
        return inChildren[0] ?? null;
    }

    private getSkinCfgIndex(): number {
        const len = this.dragonAssets.length;
        if (!len) return 0;
        const counter = MixStateManager.instance?.skinCfgCounter ?? 0;
        return counter % len;
    }

    /** 按皮肤组切换龙骨资源 */
    private switchDragonBonesData(skinCfgIndex: number): void {
        if (!this.armature) return;

        const list = this.dragonAssets;
        if (!list?.length) return;

        const idx = skinCfgIndex % list.length;
        const asset = list[idx];
        if (!asset) {
            Logger.warn(LOG_TAG, "dragonAssets[" + idx + "] 为空");
            return;
        }

        const atlas = this.dragonAtlasAssets[idx];
        if (this.armature.dragonAsset !== asset) {
            this.armature.dragonAsset = asset;
            if (atlas) {
                this.armature.dragonAtlasAsset = atlas;
            }
            if (this.armatureName) {
                this.armature.armatureName = this.armatureName;
            }
        }
    }

    private disposeAllEliminateRoot(): void {
        this.safeUnbindArmatureComplete();
        if (!this.node?.isValid) return;
        this.node.destroy();
    }

    private finishAllEliminate(): void {
        const mix = MixStateManager.instance;
        if (mix) {
            mix.addToken(
                1,
                () => {
                    Logger.info(LOG_TAG, "达到 token 限制");
                },
                () => this.disposeAllEliminateRoot(),
            );
        } else {
            this.disposeAllEliminateRoot();
        }
    }

    private readonly onDragonBonesComplete = (event: dragonBones.EventObject): void => {
        this._completeListenerBound = false;
        const finishedName = event?.animationState?.name ?? "";
        Logger.info(LOG_TAG, "complete", finishedName);
        if (this.animationName && finishedName && finishedName !== this.animationName) {
            Logger.warn(LOG_TAG, "anim mismatch, still dispose", this.animationName, finishedName);
        }
        this.finishAllEliminate();
    };

    playAllEliminateAnimation() {
        if (!this.armature) {
            this.armature = this.resolveArmature();
        }
        if (!this.armature) {
            Logger.warn(LOG_TAG, "playAllEliminateAnimation: 无 ArmatureDisplay");
            this.disposeAllEliminateRoot();
            return;
        }
        AudioManager.instance.playEffect(this.allEliminateAudioClip);
        this.switchDragonBonesData(this.getSkinCfgIndex());

        this.bindArmatureCompleteOnce();
        GameManager.instance.setScoreWithoutClearCount(300);
        this.armature.playAnimation(this.animationName, 1);
    }
}
