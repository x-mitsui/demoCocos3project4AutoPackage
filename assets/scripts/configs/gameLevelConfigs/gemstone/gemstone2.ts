import {
    GEM_BLUE_4_EDGE,
    GEM_DEEP_RED_6_EDGE,
    GEM_DEEP_RED_8_EDGE,
    GEM_GREEN_4_TRIANGLE,
    GEM_YELLOW_5_EDGE,
    GEM_YELLOW_5_TRIANGLE,
} from "../blockKinds";
// 机器人布局
const A = GEM_BLUE_4_EDGE;
const B = GEM_GREEN_4_TRIANGLE;
const C = GEM_YELLOW_5_EDGE;
const D = GEM_YELLOW_5_TRIANGLE;
const E = GEM_DEEP_RED_6_EDGE;
const F = GEM_DEEP_RED_8_EDGE;
export const gemstone2 = {
    totalPlacements: 15,
    bestScoreSpecific: 300000, // 不可达
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 0, y: 0 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 0.5,
        targetCol: 0.5,
        dragOptionIndex: 0,
        offset2FirstRow: 1,
        offset2FirstCol: 0,
    },
    gemCountOfEachOption: 2,
    desti: [
        {
            blockIdx: A,
            destiScore: 10,
        },
        {
            blockIdx: B,
            destiScore: 10,
        },
        {
            blockIdx: C,
            destiScore: 10,
        },
        // {
        //     blockIdx: D,
        //     destiScore: 4,
        // },
        // {
        //     blockIdx: E,
        //     destiScore: 5,
        // },
        // {
        //     blockIdx: F,
        //     destiScore: 6,
        // },
    ],
    ques: [
        // [0, 0, F, 0, 0, 0, 0, 0],
        // [0, 7, 0, 0, 0, 0, 7, 0],
        // [7, 7, 0, 3, 3, 0, 7, 7],
        // [7, C, 0, A, A, 0, C, 7],
        // [0, 7, 2, B, B, 2, 7, 0],
        // [0, 0, 0, 2, 2, 0, 0, 0],
        // [1, 0, 0, 5, 5, 5, 2, A],
        // [1, 0, 5, D, E, 5, 5, C],
        // [0, 0, A, 0, 0, 0, 0, 0],
        // [0, 7, 0, 0, 0, 0, 7, 0],
        // [7, 7, 0, 3, 3, 0, 7, 7],
        // [7, C, 0, A, A, 0, C, 7],
        // [0, 7, 2, B, B, 2, 7, 0],
        // [0, 0, 0, 2, 2, 0, 0, 0],
        // [0, 0, 0, 5, 5, 0, 0, 0],
        // [0, 0, 5, A, B, 5, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, A, 0, 0, 0, 0, A, 0],
        [7, 7, 0, 3, 3, 0, 7, 7],
        [7, C, 0, A, A, 0, C, 7],
        [0, 7, 2, B, B, 2, 7, 0],
        [0, 0, 0, 2, 2, 0, 0, 0],
        [0, 0, 5, 5, 5, 5, 0, 0],
        [0, C, B, 0, 0, B, C, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [1, B],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, C],
                    [0, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 1],
                    [A, 0],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, B],
                    [0, 1],
                    [0, 1],
                ],
            ],
        },
        {
            shapes: [[[4, A, 4, 4]]],
        },
        {
            shapes: [[[4], [B], [4], [4]]],
        },
    ],
};
