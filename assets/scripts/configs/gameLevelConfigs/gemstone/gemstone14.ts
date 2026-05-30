import {
    BRUSH_GEM_BLUE_4_EDGE,
    BRUSH_GREEN_DROP,
    BRUSH_ORANGE_5_EDGE,
    BRUSH_YELLOW_8_EDGE,
    BRUSH_RED_HEART,
    BRUSH_PURPLE_6_EDGE,
} from "../blockKinds";
// 机器人布局
const A = BRUSH_GEM_BLUE_4_EDGE;
const B = BRUSH_GREEN_DROP;
const C = BRUSH_ORANGE_5_EDGE;
const D = BRUSH_YELLOW_8_EDGE;
const E = BRUSH_RED_HEART;
const F = BRUSH_PURPLE_6_EDGE;

export const gemstone14 = {
    totalPlacements: 14,
    bestScoreSpecific: 300,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 6, y: 0 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 6.5,
        targetCol: 1,
        dragOptionIndex: 0,
        offset2FirstRow: 1,
        offset2FirstCol: 0,
    },

    percent: 0.08,
    gemCountOfEachOption: 2,
    desti: [
        {
            blockIdx: A,
            destiScore: 9,
        },
        {
            blockIdx: B,
            destiScore: 9,
        },
        {
            blockIdx: E,
            destiScore: 9,
        },
        {
            blockIdx: D,
            destiScore: 9,
        },
    ],

    ques: [
        [0, A, 2, 2, A, 0, 0, 0],
        [0, 0, 2, 0, 0, B, 0, B],
        [0, A, 2, 0, 0, 2, 2, 2],
        [E, 0, 0, A, B, 0, 0, 2],
        [2, 0, 0, E, D, 0, 0, B],
        [2, 2, 2, 0, 0, 2, D, 0],
        [E, 0, E, 0, 0, 2, 0, 0],
        [0, 0, 0, D, 2, 2, D, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, E, 0],
                    [4, D, 4],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [E, A],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, A, 1],
                    [0, B, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, 1],
                    [D, B],
                    [0, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [A, B],
                    [E, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [A, B],
                    [E, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [A, B],
                    [E, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [A, B],
                    [E, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [A, B],
                    [E, D],
                ],
            ],
        },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [A, 1, A],
        //             [1, 0, 0],
        //             [A, 0, 0],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [D, 0, 0],
        //             [1, 0, 0],
        //             [D, 1, D],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [B, 1, B],
        //             [0, 0, 1],
        //             [0, 0, B],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [0, 0, C],
        //             [0, 0, 1],
        //             [C, 1, C],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [D, C, 0],
        //             [0, 1, 1],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [1, 1, 0],
        //             [0, A, B],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [A, B],
        //             [0, B],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [D, 0],
        //             [D, C],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [A, A],
        //             [D, 0],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [
        //         [
        //             [0, B],
        //             [C, C],
        //         ],
        //     ],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [[[A], [B]]],
        // },
        // {
        //     // blockIndex: 2,
        //     shapes: [[[C], [D]]],
        // },
    ],
};
