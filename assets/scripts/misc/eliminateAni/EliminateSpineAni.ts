import { _decorator, Component, sp, Vec3 } from "cc";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { Logger } from "../../utils/logger";
import { disableSpinePremultipliedAlpha } from "../../utils/spineCompat";

const { ccclass, property } = _decorator;

@ccclass("EliminateSpineAni")
export class EliminateSpineAni extends Component {
    spSkeleton: sp.Skeleton = null!;
    @property(String)
    aniName: string = "in";
    onLoad() {
        this.spSkeleton = this.node.getComponent(sp.Skeleton);
        disableSpinePremultipliedAlpha(this.spSkeleton);
        eventManager.once(GameEvent.GAME_ELIMINATE_START, this.playEliminateAnimation, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_ELIMINATE_START, this.playEliminateAnimation, this);
        // this.spSkeleton?.setCompleteListener(null);
    }

    colorCfg = ["blue", "yellow", "purple", "orange", "red", "green", "cyan"];
    /* 播放消除动画,参数位置,方向(0:横,1:竖) */
    playEliminateAnimation(payload: { worldPos: Vec3; direction: number; blockIndex: number }) {
        Logger.info("EliminateSpineAni:playEliminateAnimation:", "-----播放消除动画", payload.worldPos);
        if (!this.spSkeleton) return;

        const { worldPos, direction, blockIndex } = payload;
        if (!worldPos) return;

        this.spSkeleton.node.setWorldPosition(worldPos);
        this.spSkeleton.node.setScale(1.13, 1.13, 1);
        this.spSkeleton.node.setRotationFromEuler(0, 0, direction === 0 ? 0 : -90);

        const animName = this.colorCfg[(blockIndex - 1) % this.colorCfg.length];
        this.spSkeleton.setAnimation(0, animName, false);
        this.spSkeleton.setCompleteListener((trackEntry) => {
            const finishedName = trackEntry?.animation?.name ?? "";
            if (finishedName === animName) {
                eventManager.emit(GameEvent.GAME_ELIMINATE, worldPos.clone());
            }
            this.node.destroy();
        });
    }
}
