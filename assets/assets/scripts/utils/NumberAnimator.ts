import { Component, sys } from "cc";

/**
 * 数字递增动画工具
 * 用于实现数字从一个值递增到另一个值的动画效果
 */
export class NumberAnimator {
    /**
     * 开始数字递增动画
     * @param component Component 实例，用于调用 scheduleOnce
     * @param currentValue 当前值（会被修改）
     * @param targetValue 目标值
     * @param onUpdate 每次更新时的回调函数 (currentValue) => void
     * @param onComplete 动画完成时的回调函数（可选）
     * @param interval 更新间隔（秒），默认 0.01 秒
     */
    static animate(
        component: Component,
        currentValue: { value: number },
        targetValue: number,
        onUpdate: (value: number) => void,
        onComplete?: () => void,
        interval: number = 0.01
    ): void {
        if (currentValue.value < targetValue) {
            // 每次只增加1
            currentValue.value++;

            // 调用更新回调
            onUpdate(currentValue.value);

            // 继续动画
            component.scheduleOnce(() => {
                NumberAnimator.animate(
                    component,
                    currentValue,
                    targetValue,
                    onUpdate,
                    onComplete,
                    interval
                );
            }, interval);
        } else {
            // 动画完成，确保值精确
            currentValue.value = targetValue;
            onUpdate(currentValue.value);
            if (onComplete) {
                onComplete();
            }
        }
    }

    /**
     * 数字递增动画（带最佳分数更新）
     * @param component Component 实例
     * @param currentValue 当前值（会被修改）
     * @param targetValue 目标值
     * @param onUpdate 每次更新时的回调函数 (value) => void
     * @param bestScoreKey localStorage 中最佳分数的 key，如果提供则会自动更新最佳分数
     * @param onBestScoreUpdate 最佳分数更新时的回调函数 (bestScore) => void（可选）
     * @param onComplete 动画完成时的回调函数（可选）
     * @param interval 更新间隔（秒），默认 0.01 秒
     */
    static animateWithBestScore(
        component: Component,
        currentValue: { value: number },
        targetValue: number,
        onUpdate: (value: number) => void,
        bestScoreKey: string = "bestScore",
        onBestScoreUpdate?: (bestScore: number) => void,
        onComplete?: () => void,
        interval: number = 0.01
    ): void {
        if (currentValue.value < targetValue) {
            // 每次只增加1
            currentValue.value++;

            // 调用更新回调
            onUpdate(currentValue.value);

            // 检查并更新最佳分数
            const bestScore = parseInt(
                sys.localStorage.getItem(bestScoreKey) || "0"
            );
            if (currentValue.value > bestScore) {
                sys.localStorage.setItem(
                    bestScoreKey,
                    currentValue.value.toString()
                );
                if (onBestScoreUpdate) {
                    onBestScoreUpdate(currentValue.value);
                }
            }

            // 继续动画
            component.scheduleOnce(() => {
                NumberAnimator.animateWithBestScore(
                    component,
                    currentValue,
                    targetValue,
                    onUpdate,
                    bestScoreKey,
                    onBestScoreUpdate,
                    onComplete,
                    interval
                );
            }, interval);
        } else {
            // 动画完成，确保值精确
            currentValue.value = targetValue;
            onUpdate(currentValue.value);
            if (onComplete) {
                onComplete();
            }
        }
    }
}
