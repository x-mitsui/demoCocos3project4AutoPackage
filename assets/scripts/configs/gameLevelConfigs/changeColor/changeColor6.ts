// unity定向测试
export const changeColor6 = {
    totalPlacements: 10,
    bestScoreSpecific: 270,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 5, y: 3 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 6,
        targetCol: 3.5,
        dragOptionIndex: 0,
        offset2FirstRow: 2,
        offset2FirstCol: 1,
    },
    // 1053粉红，1054蓝，1055绿，1056土色，1057浅蓝，1058深红，1059靛青，1060紫色
    changeColorCfg: [1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060],
    ques: [
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 1, 0, 0],
        [1, 1, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 1, 1],
    ],
    answers: [
        {
            shapes: [
                [
                    [1, 1],
                    [0, 1],
                    [0, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 1],
                    [1, 1],
                    [1, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 1],
                    [1, 0],
                    [1, 0],
                ],
            ],
        },
    ],
};
