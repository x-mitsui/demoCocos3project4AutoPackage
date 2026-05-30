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

export const gemstone13 = {
    totalPlacements: 9,
    bestScoreSpecific: 300000,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 5, y: 1 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 5.5,
        targetCol: 1.5,
        dragOptionIndex: 0,
        offset2FirstRow: 0,
        offset2FirstCol: 0,
    },

    percent: 0.38,
    gemCountOfEachOption: 2,
    desti: [
        {
            blockIdx: B,
            destiScore: 48,
        },
        {
            blockIdx: D,
            destiScore: 48,
        },
    ],

    ques: [
        [D, 2, 2, 0, 2, 2, 2, D],
        [2, 0, 0, 0, 2, 0, 0, 2],
        [2, 0, B, 0, 2, 0, 0, 2],
        [0, 0, 0, 0, B, 2, 2, 2],
        [2, 2, 2, B, 0, 0, 0, 0],
        [2, 0, 0, 2, 0, B, 0, 2],
        [2, 0, 0, 2, 0, 0, 0, 2],
        [D, 2, 2, 2, 0, 2, 2, D],
    ],
    answers: [
        {
            // blockIndex: 2,
            shapes: [
                [
                    [2, D],
                    [D, 2],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [
                [
                    [1, 1],
                    [D, 1],
                ],
            ],
        },
        {
            // blockIndex: 2,
            shapes: [[[B], [B], [2], [2]]],
        },
    ],
};
