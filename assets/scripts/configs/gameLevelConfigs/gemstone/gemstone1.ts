// 机器人2布局-1498
import {
    GEM_BLUE_4_EDGE,
    GEM_DEEP_RED_6_EDGE,
    GEM_DEEP_RED_8_EDGE,
    GEM_GREEN_4_TRIANGLE,
    GEM_YELLOW_5_EDGE,
    GEM_YELLOW_5_TRIANGLE,
} from "../blockKinds";
// 机器人2布局
const A = GEM_BLUE_4_EDGE;
const B = GEM_GREEN_4_TRIANGLE;
const C = GEM_YELLOW_5_EDGE;
const D = GEM_YELLOW_5_TRIANGLE;
const E = GEM_DEEP_RED_6_EDGE;
const F = GEM_DEEP_RED_8_EDGE;
// shapefirst:0,0 ; targetrowcol:0.5,0.

export const gemstone1 = {
    totalPlacements: 14,
    bestScoreSpecific: 300000, // 不可达
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 3, y: 6 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 4,
        targetCol: 6.5,
        dragOptionIndex: 0,
        offset2FirstRow: 2,
        offset2FirstCol: 0,
    },
    percent: 0.43,
    gemCountOfEachOption: 1,
    desti: [
        {
            blockIdx: B,
            destiScore: 8,
        },
        {
            blockIdx: C,
            destiScore: 8,
        },
        {
            blockIdx: D,
            destiScore: 8,
        },
        {
            blockIdx: E,
            destiScore: 8,
        },
        {
            blockIdx: F,
            destiScore: 8,
        },
    ],
    ques: [
        [0, 0, E, D, F, 0, 0, 0],
        [0, 2, 0, 5, 0, 2, 0, 0],
        [B, 0, 2, 5, 2, 0, E, 0],
        [C, 5, 5, 2, 5, 5, D, 0],
        [D, 0, 2, 5, 2, 0, C, 0],
        [0, 2, 0, 5, 0, 2, 0, 0],
        [0, 0, E, F, B, 0, 0, 0],
        [0, 5, 5, 0, 5, 5, 0, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, 1],
                    [0, F],
                    [1, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [B, 0],
                    [2, 2],
                    [2, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [D, 1, 1],
                    [0, 1, 0],
                ],
            ],
        },

        // {
        //     shapes: [
        //         [
        //             [1, 1, 1],
        //             [0, 0, B],
        //         ],
        //     ],
        // },
        // {
        //     shapes: [
        //         [
        //             [B, 0],
        //             [2, 2],
        //             [2, 0],
        //         ],
        //     ],
        // },
        // {
        //     shapes: [
        //         [
        //             [0, 7, 0],
        //             [D, 7, 7],
        //         ],
        //     ],
        // },
    ],
};
