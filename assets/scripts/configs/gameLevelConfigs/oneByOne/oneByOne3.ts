import { GameLevelConfig } from "../types";

export const oneByOne3: GameLevelConfig = {
    totalPlacements: 9,
    bestScoreSpecific: 300,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 0, y: 3 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 0,
        targetCol: 5,
        dragOptionIndex: 0,
        offset2FirstRow: 0,
        offset2FirstCol: 2,
    },
    ques: [
        [0, 0, 0, 5, 5, 0, 0, 0],
        [0, 0, 0, 5, 5, 0, 0, 0],
        [0, 0, 0, 2, 2, 0, 0, 0],
        [5, 5, 2, 0, 0, 2, 5, 5],
        [5, 5, 2, 0, 0, 2, 5, 5],
        [0, 0, 0, 2, 2, 0, 0, 0],
        [0, 0, 0, 5, 5, 0, 0, 0],
        [0, 0, 0, 5, 5, 0, 0, 0],
    ],
    answers: [
        null,
        {
            // blockIndex: 4,
            shapes: [
                [
                    [1, 1],
                    [1, 1],
                ],
            ],
        },
        null,
    ],
    theEnd: true,
};
