import { _decorator, Component, dragonBones } from "cc";
const { ccclass, property } = _decorator;

@ccclass("StartAnimationCfg")
export class StartAnimationCfg {
    @property({ tooltip: "节点名称" })
    nodeName: string = "";
    @property({ tooltip: "动画名称" })
    aniName: string = "";
    @property
    isLoop: boolean = false;
    @property
    timeScale: number = 1;
}
@ccclass("StartDragonAnimation")
export class StartDragonAnimation extends Component {
    @property({ type: [StartAnimationCfg], tooltip: "开始动画配置" })
    cfgs: StartAnimationCfg[] = [];
    play() {
        this.cfgs.forEach((item) => {
            const node = this.node.getChildByName(item.nodeName);
            if (node) {
                const armatureDisplay = node.getComponent(dragonBones.ArmatureDisplay);
                if (item.timeScale) {
                    armatureDisplay.timeScale = item.timeScale;
                }
                let playTimes = -1;
                if (item.isLoop) {
                    playTimes = 0;
                } else {
                    playTimes = 1;
                }
                armatureDisplay.playAnimation(item.aniName, playTimes);
            }
        });
    }
}
