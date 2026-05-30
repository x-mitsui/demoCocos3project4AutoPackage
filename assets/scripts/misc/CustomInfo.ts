import { _decorator, Component } from "cc";
import { CustomInfoSuper } from "./CustomInfoSuper";
const { ccclass, property } = _decorator;
@ccclass("CustomInfo")
export class CustomInfo extends Component {
    static info: CustomInfoSuper = null;
    @property
    appName: string = "";
    @property
    androidUrl: string = "";
    @property
    iosUrl: string = "";
    onLoad() {
        CustomInfo.info = new CustomInfoSuper(this.appName, this.androidUrl, this.iosUrl);
    }
}
