/**
 * BorderShaderInit.ts
 * 各 technique 材质属性的初始化函数，接收 Material 实例作为参数，
 * 与 Border.ts 解耦，便于单独调整默认参数。
 */
import { Material } from "cc";
import { SkinsManager } from "../configs/Skins/SkinsManager";

export function initGradientMat(mat: Material): void {
    const borderColor = SkinsManager.getInstance().getBorderColor();
    if (!borderColor) return;
    mat.setProperty("startColor", SkinsManager.hexToColor(borderColor.gradientStart));
    mat.setProperty("endColor", SkinsManager.hexToColor(borderColor.gradientEnd));
    mat.setProperty("gradientAngle", borderColor.angle);
    mat.setProperty("gradientIntensity", borderColor.intensity);
}

export function initRotateMat(mat: Material): void {
    mat.setProperty("speed", 1.7);
    mat.setProperty("saturation", 1.0);
    mat.setProperty("brightness", 1.0);
}

export function initWaveMat(mat: Material): void {
    mat.setProperty("speed", 12.0);
    mat.setProperty("saturation", 1.0);
    mat.setProperty("brightness", 2.5);
}

export function initBreathMat(mat: Material): void {
    mat.setProperty("colorSpeed", 0.15);
    mat.setProperty("breatheSpeed", 1.2);
    mat.setProperty("saturation", 1.0);
    mat.setProperty("brightness", 1.2);
}

export function initGlitterMat(mat: Material): void {
    mat.setProperty("speed", 12.0);
    mat.setProperty("density", 0.35);
    mat.setProperty("saturation", 1.0);
    mat.setProperty("brightness", 2.5);
}

/** shapeBlend: 0=圆形，1=正方形 */
export function initRippleMat(mat: Material, shapeBlend = 0): void {
    mat.setProperty("speed", 0.5);
    mat.setProperty("numRings", 4.0);
    mat.setProperty("sharpness", 1.0);
    mat.setProperty("saturation", 1.0);
    mat.setProperty("brightness", 2.0);
    mat.setProperty("tailLength", 1.5);
    mat.setProperty("shapeBlend", shapeBlend);
}

/**
 * borderRadius: 边框外边缘在 burstAura 节点 UV 空间中的归一化距离
 *   节点尺寸 = 边框 × 1.4 → borderRadius ≈ 0.36
 *   节点尺寸 = 边框 × 1.6 → borderRadius ≈ 0.31
 *   节点尺寸 = 边框 × 2.0 → borderRadius ≈ 0.25
 * shapeBlend: 0=圆形，1=正方形
 */
export function initBurstMat(mat: Material, borderRadius = 0.35, shapeBlend = 0): void {
    mat.setProperty("speed", 0.5);
    mat.setProperty("numRings", 4.0);
    mat.setProperty("sharpness", 1.2);
    mat.setProperty("borderRadius", borderRadius);
    mat.setProperty("brightness", 3.0);
    mat.setProperty("tailLength", 1.5);
    mat.setProperty("saturation", 1.0);
    mat.setProperty("shapeBlend", shapeBlend);
}
