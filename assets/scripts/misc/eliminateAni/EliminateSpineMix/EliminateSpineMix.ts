import { _decorator } from "cc";
import { EliminateSpineMixBase } from "./EliminateSpineMixBase";

const { ccclass } = _decorator;

/** 消除 mix1 预制体：在编辑器配置 skinEntries */
@ccclass("EliminateSpineMix")
export class EliminateSpineMix extends EliminateSpineMixBase {}
