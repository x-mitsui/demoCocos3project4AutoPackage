import { BlockSkinConfig, FrameOuterColorConfig, GradientConfig } from "../SkinsManager";

/**
 * 皮肤系统配置
 */
export interface SkinTheme {
    name: string;
    game_bg?: GradientConfig;
    board_out_line?: GradientConfig;
    board_line?: string;
    board_bg?: string;
    crown?: GradientConfig;
    crown_score?: GradientConfig;
    travel_gemstone_substrate?: FrameOuterColorConfig;
    travel_target_ribbon_up?: GradientConfig;
    travel_target_ribbon_down?: GradientConfig;
    comboTips1?: { inColor: string; initColor: string };
    comboTips2?: { inColor: string; initColor: string };
    comboTips3?: { inColor: string; initColor: string };
    revive_progressbar?: GradientConfig;
    revive_progressbar_line?: GradientConfig;
    revive_progressbar_bg?: GradientConfig;
    revive_countdown?: {
        parameter1: GradientConfig;
        parameter2: GradientConfig;
        parameter3: GradientConfig;
    };
    revive_btn?: {
        parameter1: GradientConfig;
        parameter2: GradientConfig;
    };
    winEndPage?: {
        bestscore_bg: GradientConfig;
        bestscore_btn_bg: GradientConfig;
        bestscore_btn_icon: string;
        bestscore_score: string;
        bestscore_parameter1: string;
        bestscore_parameter3: string;
    };
    loseEndPage?: {
        gameover_bg: GradientConfig;
        gameover_title: GradientConfig;
        gameover_score_icon: GradientConfig;
        gameover_bestscore_icon: GradientConfig;
        gameover_score: GradientConfig;
        gameover_bestscore: GradientConfig;
        gameover_btn_bg: GradientConfig;
        gameover_btn_icon: string;
    };
    newHighScore?: {
        outline: [string, number];
        pause: [string, number];
        light: [string, number];
        show: [string, number];
    };
    colors: {
        [colorId: string]: BlockSkinConfig;
    };
}
