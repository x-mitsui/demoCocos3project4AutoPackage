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

export const gemstone15 = {
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
            blockIdx: C,
            destiScore: 9,
        },
        {
            blockIdx: D,
            destiScore: 9,
        },
        {
            blockIdx: E,
            destiScore: 9,
        },
    ],

    ques: [
        [0, A, 4, 0, 0, 4, A, 0],
        [4, 0, 0, 4, 4, 0, 0, 4],
        [D, 0, E, 0, 0, E, 0, D],
        [D, 0, 0, B, B, 0, 0, D],
        [4, 0, 0, 0, 0, 0, 0, 4],
        [0, 4, 0, C, C, 0, 4, 0],
        [0, 0, 4, 0, 0, 4, 0, 0],
        [0, 0, 0, 4, 4, 0, 0, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, A, 0],
                    [4, A, 4],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, E, 0],
                    [4, E, 4],
                ],
            ],
        },
        {
            shapes: [[[B, B]]],
        },
    ],
};
