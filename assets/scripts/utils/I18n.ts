import { _decorator, Component, Label, RichText } from "cc";
import { getI18N } from "../configs/getI18N";
const { ccclass, property } = _decorator;

@ccclass("I18n")
export class I18n extends Component {
    protected onLoad(): void {
        let label = null;
        if (this.getComponent(Label)) {
            label = this.getComponent(Label);
        } else if (this.node.getComponent(RichText)) {
            label = this.node.getComponent(RichText);
        }

        label.string = getI18N(label.string).str;
    }
}
