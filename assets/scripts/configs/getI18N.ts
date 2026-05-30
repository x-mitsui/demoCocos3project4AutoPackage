import { sys } from "cc";
import { i18nKeys, i18nList } from "./i18nData";

const DEBUG_LANG_IDX = 0; // 0 - 20，调试时使用的语言索引

// @ts-ignore
const IS_DEBUG = (typeof window !== "undefined" && (window as any).IS_DEBUG) || false;
const DEBUG_LANG = IS_DEBUG ? i18nKeys[DEBUG_LANG_IDX] : null;

const ZH_T = ["zh-TW", "zh-HK", "zh-MO"];

/**
 * 获取国际化文本
 * @param str 文本键名，对应 i18nData.ts 中 i18nList 的键
 * @returns 返回对象：
 *   - lang_idx: 当前使用的语言在 key 数组中的索引
 *   - str: 翻译后的文本
 *   - max_width: 第一个语言的文本（通常用于计算按钮宽度等布局）
 */
export function getI18N(str: string) {
    let lang: string = DEBUG_LANG || sys.language;
    const n_lang = navigator.language;

    if (ZH_T.indexOf(n_lang) !== -1) {
        lang = "zh_t";
    }

    const str_list = i18nList[str];
    if (str_list) {
        let index = (i18nKeys as readonly string[]).indexOf(lang);
        if (index < 0 || index >= str_list.length) {
            index = 0;
        }
        return {
            lang_idx: index,
            str: str_list[index] || str,
            max_width: str_list[0],
        };
    }
    return { lang_idx: 0, str };
}
