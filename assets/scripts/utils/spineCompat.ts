import { Asset, Component, Node, sp as ccSp } from "cc";
import { Logger } from "./logger";

type SpineTrackEntryLike = { animation?: { name?: string } } | null;

export interface SpineSkeleton extends Component {
    premultipliedAlpha?: boolean;
    skeletonData?: Asset | null;
    clearTracks(): void;
    setSkin(name: string): void;
    setSlotsToSetupPose(): void;
    setAnimation(trackIndex: number, animationName: string, loop: boolean): void;
    setCompleteListener(listener: (trackEntry: SpineTrackEntryLike) => void): void;
}

class DummySkeleton extends Component implements SpineSkeleton {
    skeletonData?: Asset | null = null;

    clearTracks(): void {}

    setSkin(_name: string): void {}

    setSlotsToSetupPose(): void {}

    setAnimation(_trackIndex: number, _animationName: string, _loop: boolean): void {}

    setCompleteListener(_listener: (trackEntry: SpineTrackEntryLike) => void): void {}
}

type SpineSkeletonCtor = new (...args: never[]) => SpineSkeleton;
type SpineSkeletonDataCtor = typeof Asset;

const runtimeSp = ccSp as unknown as {
    Skeleton?: SpineSkeletonCtor;
    SkeletonData?: SpineSkeletonDataCtor;
};

export const hasSpineSupport = !!runtimeSp?.Skeleton;

export namespace sp {
    export type Skeleton = SpineSkeleton;
    export const Skeleton = (runtimeSp?.Skeleton ?? DummySkeleton) as SpineSkeletonCtor;

    export type SkeletonData = Asset;
    export const SkeletonData = (runtimeSp?.SkeletonData ?? Asset) as SpineSkeletonDataCtor;
}

export type SpineSkeletonData = Asset;

export function ensureSpineSupport(warnTag?: string): boolean {
    if (hasSpineSupport) return true;
    if (warnTag) {
        Logger.warn(warnTag, "Spine 模块已被裁剪，跳过 Skeleton 初始化");
    }
    return false;
}

/** 关闭 Spine 预乘 Alpha（项目内 Mix / 动态创建 / getSkeleton 统一不预乘） */
export function disableSpinePremultipliedAlpha(sk: sp.Skeleton | null | undefined): void {
    if (!sk) return;
    const comp = sk as sp.Skeleton & { premultipliedAlpha?: boolean };
    comp.premultipliedAlpha = false;
}

export function getSpineSkeleton(
    ownerNode: Node,
    options?: {
        childName?: string;
        warnTag?: string;
        warnWhenMissingSupport?: boolean;
    },
): sp.Skeleton | null {
    const { childName = "Spine", warnTag = "spineCompat:getSpineSkeleton", warnWhenMissingSupport = true } =
        options ?? {};

    if (!hasSpineSupport) {
        if (warnWhenMissingSupport) {
            Logger.warn(warnTag, "Spine 模块已被裁剪，跳过 Skeleton 初始化");
        }
        return null;
    }

    const childNode = childName ? ownerNode.getChildByName(childName) : null;
    const sk = childNode?.getComponent(sp.Skeleton) ?? ownerNode.getComponent(sp.Skeleton);
    disableSpinePremultipliedAlpha(sk);
    return sk;
}
