import { Answer } from "../config";
import { normal49 } from "./normal/normal49";

// ✅ 只改这里切换关卡，然后运行 npm run gen
// 可用值：oneByOne, oneByOne1, oneByOne2, oneByOne3, oneByOne4, normal1, normal10, normal11, normal12, normal13, normal14, normal15, normal16, normal17, normal18, normal19, normal2, normal20, normal21, normal22, normal23, normal24, normal25, normal26, normal27, normal28, normal29, normal3, normal30, normal31, normal32, normal33, normal34, normal35, normal36, normal37, normal38, normal39, normal4, normal40, normal41, normal42, normal43, normal44, normal45, normal46, normal47, normal48, normal49, normal5, normal50, normal6, normal7, normal8, normal9, gemstone1, gemstone10, gemstone11, gemstone12, gemstone13, gemstone14, gemstone15, gemstone16, gemstone2, gemstone3, gemstone4, gemstone5, gemstone6, gemstone7, gemstone8, gemstone9, changeColor1, changeColor2, changeColor3, changeColor4, changeColor5, changeColor6
const ACTIVE_CONFIG = normal49;

export const gameLevelConfigs: {
    totalPlacements?: number;
    bestScoreSpecific?: number; // 指定的最高分
    changeColorCfg?: number[];
    gemCountOfEachOption?: number;
    percent?: number;
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: number; y: number };
        autoShapeDragOptionIndex: number;
    };
    tipConfig: {
        targetRow: number;
        targetCol: number;
        dragOptionIndex: number;
        offset2FirstRow: number;
        offset2FirstCol: number;
    };
    ques: number[][];
    answers: Answer[];
    theEnd?: boolean;
    desti?: { blockIdx: number; destiScore: number }[];
}[] = [ACTIVE_CONFIG];
