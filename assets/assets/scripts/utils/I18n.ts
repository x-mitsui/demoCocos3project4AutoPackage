import { _decorator, Component, Label, Node } from "cc";
import { getI18N } from "../configs/config";
const { ccclass, property } = _decorator;

@ccclass("I18n")
export class I18n extends Component {
    protected onLoad(): void {
        const label = this.getComponent(Label);
        label.string = getI18N(label.string).str;
    }
}
