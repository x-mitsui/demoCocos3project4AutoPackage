import {
    _decorator,
    Component,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
} from "cc";
const { ccclass, property } = _decorator;

@ccclass("BgSet")
export class BgSet extends Component {
    @property(SpriteFrame)
    bgSpriteFrame: SpriteFrame = null;

    protected onLoad(): void {
        const contentSize = this.node.getComponent(UITransform).contentSize;
        for (let i = 0; i < 5; i++) {
            const nodeName = "bgSprite" + i;
            if (this.node.getChildByName(nodeName)) {
                continue;
            }
            const childNode = new Node(nodeName);
            childNode.parent = this.node;
            const posX = (-2 + i) * contentSize.width;
            childNode.setPosition(posX, 0, 0);
            childNode.addComponent(Sprite).spriteFrame = this.bgSpriteFrame;

            childNode
                .getComponent(UITransform)
                .setContentSize(contentSize.width, contentSize.height);
        }
    }
}
