import {
    _decorator,
    Color,
    Component,
    log,
    Node,
    Sprite,
    sys,
    Vec3,
    view,
} from "cc";
const { ccclass, property } = _decorator;

@ccclass("Decorator")
export class Decorator extends Component {
    originalPos: Vec3 = new Vec3(0, 0, 0);
    onLoad(): void {
        this.originalPos = this.node.position.clone();
    }
    start() {
        // 监听窗口尺寸变化（Web 平台）
        if (sys.isBrowser && typeof window !== "undefined") {
            window.addEventListener("resize", this.onResize.bind(this));
        }
    }
    private onResize() {
        const frameSize = view.getFrameSize();
        const { width, height } = frameSize;
        // log("onResize--------------", width, height, view.getVisibleSize());
        if (width / height < 1.4) {
            this.node.position = new Vec3(0, 10000, 0);
        } else {
            this.node.position = this.originalPos;
        }
    }
}
