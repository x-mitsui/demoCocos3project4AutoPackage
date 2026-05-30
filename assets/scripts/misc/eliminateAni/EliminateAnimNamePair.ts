import { _decorator, CCString } from "cc";

const { ccclass, property } = _decorator;

@ccclass("EliminateAnimNamePair")
export class EliminateAnimNamePair {
    @property({ type: CCString, tooltip: "行消除 direction=0" })
    horizontal: string = "in_x";

    @property({ type: CCString, tooltip: "列消除 direction=1" })
    vertical: string = "in_x";
}
