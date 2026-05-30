import { _decorator } from "cc";
import { PreClearSpineMixBase } from "./PreClearSpineMixBase";

const { ccclass } = _decorator;

/** 预消除 mix1 预制体：在编辑器配置 skinEntries */
@ccclass("PreClearSpineMix")
export class PreClearSpineMix extends PreClearSpineMixBase {}
