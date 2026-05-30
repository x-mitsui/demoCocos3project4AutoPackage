export type Answer = {
    shapes: number[][][];
    blockIndex?: number; // 选择性配置，如果不配置就取shapes中的值
};

export type GameLevelConfig = {
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
};
