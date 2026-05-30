// ScreenShake.ts
import { _decorator, Component, Vec3, game, Node, tween } from "cc";
const { ccclass } = _decorator;

@ccclass("ScreenShake")
export class ScreenShake extends Component {
    private originalPosition = new Vec3();
    private isShaking = false;

    onLoad() {
        // 保存相机初始位置
        this.originalPosition.set(this.node.position);
    }

    /**
     * 触发屏幕抖动
     * @param intensity 抖动强度（单位：世界坐标，例如 5 表示最大偏移 5 个单位）
     * @param repeatTimes 重复次数（默认3次）
     */
    shake(intensity: number = 10, repeatTimes: number = 3) {
        if (this.isShaking) return; // 防止重复触发
        this.isShaking = true;

        const tweenDuration = 0.02;

        tween(this.node)
            .to(tweenDuration, { position: new Vec3(intensity * 0.5, intensity * 0.7, 0) })
            .to(tweenDuration, { position: new Vec3(-intensity * 0.6, intensity * 0.7, 0) })
            .to(tweenDuration, { position: new Vec3(-intensity * 1.3, intensity * 0.3, 0) })
            .to(tweenDuration, { position: new Vec3(intensity * 0.3, -intensity * 0.6, 0) })
            .to(tweenDuration, { position: new Vec3(-intensity * 0.5, intensity * 0.5, 0) })
            .to(tweenDuration, { position: new Vec3(intensity * 0.2, -intensity * 0.8, 0) })
            .to(tweenDuration, { position: new Vec3(-intensity * 0.8, -intensity * 1.0, 0) })
            .to(tweenDuration, { position: new Vec3(intensity * 0.3, intensity * 1.0, 0) })
            .to(tweenDuration, { position: this.originalPosition.clone() })
            .repeat(repeatTimes)
            .call(() => {
                this.isShaking = false;
            })
            .start();
    }
}
