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

export const gemstone12 = {
    totalPlacements: 14,
    bestScoreSpecific: 300,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 0, y: 0 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 1,
        targetCol: 1,
        dragOptionIndex: 0,
        offset2FirstRow: 0,
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
            blockIdx: C,
            destiScore: 9,
        },
        {
            blockIdx: D,
            destiScore: 9,
        },
    ],

    ques: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 2, 2, 2, 0, 2, 2, 0],
        [0, 2, 0, 0, B, 0, 2, 0],
        [0, 0, A, 0, 0, 0, 2, 0],
        [0, 2, 0, 0, 0, C, 0, 0],
        [0, 2, 0, D, 0, 0, 2, 0],
        [0, 2, 2, 0, 2, 2, 2, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    answers: [
        {
            // blockIndex: 2,
            shapes: [
                [
                    [A, 1, A],
                    [1, 0, 0],
                    [A, 0, 0],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [D, 0, 0],
                    [1, 0, 0],
                    [D, 1, D],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [B, 1, B],
                    [0, 0, 1],
                    [0, 0, B],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [0, 0, C],
                    [0, 0, 1],
                    [C, 1, C],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [D, C, 0],
                    [0, 1, 1],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [1, 1, 0],
                    [0, A, B],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [A, B],
                    [0, B],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [D, 0],
                    [D, C],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [A, A],
                    [D, 0],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [0, B],
                    [C, C],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [[[A], [B]]],
        },
        {
            // blockIndex: 2,
            shapes: [[[C], [D]]],
        },
    ],
};
