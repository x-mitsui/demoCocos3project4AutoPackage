import { sys } from "cc";
import { DragOptionConfig } from "./types";

/** 块大小 */
export const BlockSize = {
    width: 120,
    height: 120
};

// prettier-ignore
export const dragOptionsConfig:DragOptionConfig[] = [
    {
        "blockColorIdx": 0,
        "shape": [
            [0, 0], [1, 0], [2, 0],
            [0, 1], [1, 1], [2, 1],
            [0, 2], [1, 2], [2, 2]
        ]
    },
    {
        "blockColorIdx": 1,
        "shape": [
            [0, 0], [1, 0], [2, 0],
                            [2, 1]
        ]
    },
    {
        "blockColorIdx": 2,
        "shape": [
            [0, 0], [1, 0], [2, 0],
            [0, 1], [1, 1], [2, 1],
            [0, 2], [1, 2], [2, 2]
        ]
    },
    {
        "blockColorIdx": 3,
        "shape": [
                     [0, 0],
            [-1, 1], [0, 1], 
            [-1, 2]
        ]
    },
    {
        "blockColorIdx": 3,
        "shape": [
            [0, 0],
            [0, 1], [1, 1], [2, 1]   
        ]
    },
    {
        "blockColorIdx": 3,
        "shape": [
            [0, 0], [1, 0], 
            [0, 1]
        ]
    },
    {
        "blockColorIdx": 3,
        "shape": [
            [0, 0], [1, 0], [2, 0],
            [0, 1], [1, 1], [2, 1],
            [0, 2], [1, 2], [2, 2]
        ]
    },
    {
        "blockColorIdx": 2,
        "shape": [
            [0, 0], [1, 0], [2, 0],
            [0, 1], [1, 1], [2, 1],
            [0, 2], [1, 2], [2, 2]
        ]
    },
    {
        "blockColorIdx": 3, 
        "shape": [
            [0, 0], [1, 0], 
            [0, 1], [1, 1]
        ]
    },
    {
        "blockColorIdx": 2,
        "shape": [
            [0, 0],[1, 0], [2, 0],
                           [2, 1]
        ]
    },
    
    {
        "blockColorIdx": 2, 
        "shape": [
            [0,  0], [1, 0], [2, 0],
            [0,  1]
        ]
    },
    {
        "blockColorIdx": 0, 
        "shape": [
            [0, 0], [1, 0], 
            [0, 1], [1, 1]
        ]
    }
]

export const boardBlocksConfig = [
    [0, 0, 0, 3, 3, 3, 3, 3],
    [1, 1, 0, 1, 1, 0, 0, 0],
    [2, 2, 2, 2, 0, 0, 0, 0],
    [4, 4, 4, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 4, 4],
    [0, 0, 0, 2, 0, 1, 1, 1],
    [0, 0, 0, 1, 1, 0, 1, 1],
    [3, 3, 3, 3, 3, 0, 0, 0]
];

export const GameCustomInfo = {
    name: "BlockBrush"
};

const appUrls = {
    blockblast: {
        android: "https://play.google.com/store/apps/details?id=com.block.juggle",
        ios: "https://apps.apple.com/us/app/block-blast/id1617391485"
    },
    BlockBrush: {
        android: "https://play.google.com/store/apps/details?id=com.wood.block.sudoku.puzzle.bm",
        ios: "https://apps.apple.com/us/app/block-crush-travel-master/id1638139403"
    }
};

export const getJumpUrl = () => {
    const projectName = GameCustomInfo.name;
    // 在 playable 项目中，根据操作系统判断跳转链接
    // sys.os 可以检测 iOS、Android 等操作系统
    if (sys.os === sys.OS.IOS || sys.os === sys.OS.OSX) {
        // iOS 或 macOS 设备，跳转到 App Store
        return appUrls[projectName].ios;
    } else if (sys.os === sys.OS.ANDROID) {
        // Android 设备，跳转到 Google Play
        return appUrls[projectName].android;
    } else {
        // 其他平台（如 Windows、Linux 等），默认返回 iOS 链接
        // 或者可以根据 User Agent 进一步判断
        const userAgent =
            sys.isBrowser && typeof navigator !== "undefined"
                ? navigator.userAgent.toLowerCase()
                : "";
        if (userAgent.includes("android")) {
            return appUrls[projectName].android;
        } else {
            return appUrls[projectName].ios;
        }
    }
};

export const i18nConfig = {
    i18n: {
        key: [
            "en",
            "fr",
            "de",
            "es",
            "ar",
            "zh",
            "zh_t",
            "hi",
            "ru",
            "pt",
            "ko",
            "ja",
            "tr",
            "bn",
            "vi",
            "sw",
            "ur",
            "am",
            "id",
            "th",
            "tl"
        ],
        list: {
            hello: [
                "Hello",
                "Bonjour",
                "Hallo",
                "Hola",
                "مرحبا",
                "你好",
                "你好",
                "नमस्ते",
                "Привет",
                "Olá",
                "안녕하세요",
                "こんにちは",
                "Merhaba",
                "নমস্তে",
                "Xin chào",
                "สวัสดี",
                "नमस्ते",
                "Привет",
                "Olá",
                "안녕하세요",
                "こんにちは",
                "Merhaba",
                "নমস্তে",
                "Xin chào",
                "สวัสดี"
            ],
            freeToPlay: [
                "Free to Play", // 索引 0: 英语
                "Jouer gratuitement", // 索引 1: 法语
                "Kostenlos spielen", // 索引 2: 德语
                "Jugar gratis", // 索引 3: 西班牙语
                "لعب مجانًا", // 索引 4: 阿拉伯语
                "免费游玩", // 索引 5: 简体中文
                "免費遊玩", // 索引 6: 繁体中文
                "मुफ्त खेलें", // 索引 7: 印地语
                "Играть бесплатно", // 索引 8: 俄语
                "Jogar gratuitamente", // 索引 9: 葡萄牙语
                "무료 플레이", // 索引 10: 韩语
                "無料でプレイ", // 索引 11: 日语
                "Ücretsiz oyna", // 索引 12: 土耳其语
                "বিনামূল্যে খেলুন", // 索引 13: 孟加拉语
                "Chơi miễn phí", // 索引 14: 越南语
                "Cheza bila malipo", // 索引 15: 斯瓦希里语
                "مفتی کھیلیں", // 索引 16: 乌尔都语
                "በነፃ ይጫወቱ", // 索引 17: 阿姆哈拉语
                "Main gratis", // 索引 18: 印尼语
                "เล่นฟรี", // 索引 19: 泰语
                "Maglaro nang libre" // 索引 20: 他加禄语
            ],
            playNow: [
                "Play Now", // 索引 0: 英语
                "Jouer maintenant", // 索引 1: 法语
                "Jetzt spielen", // 索引 2: 德语
                "Jugar ahora", // 索引 3: 西班牙语
                "العب الآن", // 索引 4: 阿拉伯语
                "立即游玩", // 索引 5: 简体中文
                "立即遊玩", // 索引 6: 繁体中文
                "अभी खेलें", // 索引 7: 印地语
                "Играть сейчас", // 索引 8: 俄语
                "Jogar agora", // 索引 9: 葡萄牙语
                "지금 플레이", // 索引 10: 韩语
                "今すぐプレイ", // 索引 11: 日语
                "Şimdi oyna", // 索引 12: 土耳其语
                "এখনই খেলুন", // 索引 13: 孟加拉语
                "Chơi ngay", // 索引 14: 越南语
                "Cheza sasa", // 索引 15: 斯瓦希里语
                "ابھی کھیلیں", // 索引 16: 乌尔都语
                "አሁን ይጫወቱ", // 索引 17: 阿姆哈拉语
                "Main sekarang", // 索引 18: 印尼语
                "เล่นตอนนี้", // 索引 19: 泰语
                "Maglaro ngayon" // 索引 20: 他加禄语
            ],
            congratulationsWantMore: [
                "Congratulations!\nWant More?", // 索引 0: 英语
                "Félicitations !\nEn voulez-vous plus ?", // 索引 1: 法语
                "Herzlichen Glückwunsch!\nMöchten Sie mehr?", // 索引 2: 德语
                "¡Felicidades!\n¿Quieres más?", // 索引 3: 西班牙语
                "تهانينا!\nهل تريد المزيد؟", // 索引 4: 阿拉伯语
                "很棒！\n体验其它玩法？", // 索引 5: 简体中文
                "很棒！\n体验其它玩法？", // 索引 6: 繁体中文
                "बधाई हो!\nऔर चाहिए?", // 索引 7: 印地语
                "Поздравляем!\nХотите больше?", // 索引 8: 俄语
                "Parabéns!\nQuer mais?", // 索引 9: 葡萄牙语
                "축하합니다!\n더 원하시나요?", // 索引 10: 韩语
                "おめでとうございます！\nもっと欲しいですか？", // 索引 11: 日语
                "Tebrikler!\nDaha fazlasını ister misiniz?", // 索引 12: 土耳其语
                "অভিনন্দন!\nআরো চান?", // 索引 13: 孟加拉语
                "Chúc mừng!\nBạn muốn thêm không?", // 索引 14: 越南语
                "Hongera!\nUnataka zaidi?", // 索引 15: 斯瓦希里语
                "مبارک ہو!\nمزید چاہیے؟", // 索引 16: 乌尔都语
                "እንኳን ደስ አለህ!\nተጨማሪ ይፈልጋሉ?", // 索引 17: 阿姆哈拉语
                "Selamat!\nIngin lebih?", // 索引 18: 印尼语
                "ยินดีด้วย!\nต้องการเพิ่มเติมไหม?", // 索引 19: 泰语
                "Binabati kita!\nGusto mo pa?" // 索引 20: 他加禄语
            ],
            tryAgain: [
                "TRY AGAIN?", // 索引 0: 英语
                "RÉESSAYER ?", // 索引 1: 法语
                "NOCHMAL VERSUCHEN?", // 索引 2: 德语
                "¿INTENTAR DE NUEVO?", // 索引 3: 西班牙语
                "حاول مرة أخرى؟", // 索引 4: 阿拉伯语
                "再试一次？", // 索引 5: 简体中文
                "再試一次？", // 索引 6: 繁体中文
                "फिर से कोशिश करें?", // 索引 7: 印地语
                "ПОПРОБОВАТЬ СНОВА?", // 索引 8: 俄语
                "TENTAR NOVAMENTE?", // 索引 9: 葡萄牙语
                "다시 시도?", // 索引 10: 韩语
                "もう一度試しますか？", // 索引 11: 日语
                "TEKRAR DENE?", // 索引 12: 土耳其语
                "আবার চেষ্টা করবেন?", // 索引 13: 孟加拉语
                "THỬ LẠI?", // 索引 14: 越南语
                "JARIBU TENGE?", // 索引 15: 斯瓦希里语
                "دوبارہ کوشش کریں؟", // 索引 16: 乌尔都语
                "እንደገና ሞክር?", // 索引 17: 阿姆哈拉语
                "COBA LAGI?", // 索引 18: 印尼语
                "ลองอีกครั้ง?", // 索引 19: 泰语
                "SUBUKAN ULIT?" // 索引 20: 他加禄语
            ],
            exploreNow: [
                "EXPLORE NOW", // 索引 0: 英语
                "EXPLORER MAINTENANT", // 索引 1: 法语
                "JETZT ENTDECKEN", // 索引 2: 德语
                "EXPLORAR AHORA", // 索引 3: 西班牙语
                "استكشف الآن", // 索引 4: 阿拉伯语
                "立即探索", // 索引 5: 简体中文
                "立即探索", // 索引 6: 繁体中文
                "अभी एक्सप्लोर करें", // 索引 7: 印地语
                "ИССЛЕДОВАТЬ СЕЙЧАС", // 索引 8: 俄语
                "EXPLORAR AGORA", // 索引 9: 葡萄牙语
                "지금 탐험하기", // 索引 10: 韩语
                "今すぐ探索", // 索引 11: 日语
                "ŞİMDİ KEŞFET", // 索引 12: 土耳其语
                "এখনই অন্বেষণ করুন", // 索引 13: 孟加拉语
                "KHÁM PHÁ NGAY", // 索引 14: 越南语
                "CHUNGUZA SASA", // 索引 15: 斯瓦希里语
                "ابھی دریافت کریں", // 索引 16: 乌尔都语
                "አሁን ያስሱ", // 索引 17: 阿姆哈拉语
                "JELAJAHI SEKARANG", // 索引 18: 印尼语
                "สำรวจตอนนี้", // 索引 19: 泰语
                "TUKLASIN NGAYON" // 索引 20: 他加禄语
            ],
            splitShapeInstruction: [
                "Split the shape below into the four pieces above", // 索引 0: 英语
                "Divisez la forme ci-dessous en quatre morceaux ci-dessus", // 索引 1: 法语
                "Teilen Sie die Form unten in die vier Teile oben", // 索引 2: 德语
                "Divide la forma de abajo en las cuatro piezas de arriba", // 索引 3: 西班牙语
                "قسّم الشكل أدناه إلى الأربع قطع أعلاه", // 索引 4: 阿拉伯语
                "将下方的形状分割成\n上方的四块", // 索引 5: 简体中文
                "將下方的形狀分割成\n上方的四塊", // 索引 6: 繁体中文
                "नीचे दिए गए आकार को ऊपर के चार टुकड़ों में विभाजित करें", // 索引 7: 印地语
                "Разделите фигуру внизу на четыре части вверху", // 索引 8: 俄语
                "Divida a forma abaixo nas quatro peças acima", // 索引 9: 葡萄牙语
                "아래 모양을 위의 네 조각으로 나누세요", // 索引 10: 韩语
                "下の形を上の四つのピースに分割してください", // 索引 11: 日语
                "Aşağıdaki şekli yukarıdaki dört parçaya bölün", // 索引 12: 土耳其语
                "নীচের আকৃতিটি উপরের চারটি টুকরোতে বিভক্ত করুন", // 索引 13: 孟加拉语
                "Chia hình dạng bên dưới thành bốn mảnh ở trên", // 索引 14: 越南语
                "Gawanya umbo la chini katika vipande vinne vya juu", // 索引 15: 斯瓦希里语
                "نیچے دی گئی شکل کو اوپر کے چار ٹکڑوں میں تقسیم کریں", // 索引 16: 乌尔都语
                "ከታች ያለውን ቅርጽ ወደ ላይ ያሉትን አራት ቁርጥራጮች ይከፋፍሉ", // 索引 17: 阿姆哈拉语
                "Bagi bentuk di bawah menjadi empat bagian di atas", // 索引 18: 印尼语
                "แบ่งรูปร่างด้านล่างเป็นสี่ชิ้นด้านบน", // 索引 19: 泰语
                "Hatiin ang hugis sa ibaba sa apat na piraso sa itaas" // 索引 20: 他加禄语
            ]
        }
    }
};

/**
 * config 数据结构说明：
 *
 * config = {
 *     i18n: {
 *         // 语言代码数组，按顺序对应所有支持的语言
 *         // 数组索引与翻译数组的索引一一对应
 *         key: [
 *             "en",    // 索引 0: 英语
 *             "fr",    // 索引 1: 法语
 *             "de",    // 索引 2: 德语
 *             "es",    // 索引 3: 西班牙语
 *             "ar",    // 索引 4: 阿拉伯语
 *             "zh",    // 索引 5: 简体中文
 *             "zh_t",  // 索引 6: 繁体中文
 *             "hi",    // 索引 7: 印地语
 *             "ru",    // 索引 8: 俄语
 *             "pt",    // 索引 9: 葡萄牙语
 *             "ko",    // 索引 10: 韩语
 *             "ja",    // 索引 11: 日语
 *             "tr",    // 索引 12: 土耳其语
 *             "bn",    // 索引 13: 孟加拉语
 *             "vi",    // 索引 14: 越南语
 *             "sw",    // 索引 15: 斯瓦希里语
 *             "ur",    // 索引 16: 乌尔都语
 *             "am",    // 索引 17: 阿姆哈拉语
 *             "id",    // 索引 18: 印尼语
 *             "th",    // 索引 19: 泰语
 *             "tl",    // 索引 20: 他加禄语
 *         ],
 *
 *         // 翻译列表对象，键是文本键名，值是所有语言的翻译数组
 *         // 翻译数组的顺序必须与 key 数组的顺序完全一致
 *         list: {
 *             "hello": [
 *                 "Hello",      // 索引 0: 英语翻译
 *                 "Bonjour",    // 索引 1: 法语翻译
 *                 "Hallo",     // 索引 2: 德语翻译
 *                 "Hola",      // 索引 3: 西班牙语翻译
 *                 "مرحبا",     // 索引 4: 阿拉伯语翻译
 *                 "你好",       // 索引 5: 简体中文翻译
 *                 "你好",       // 索引 6: 繁体中文翻译
 *                 "नमस्ते",    // 索引 7: 印地语翻译
 *                 // ... 其他语言的翻译
 *             ],
 *             "world": [
 *                 "World",      // 索引 0: 英语翻译
 *                 "Monde",      // 索引 1: 法语翻译
 *                 // ... 其他语言的翻译
 *             ],
 *             // ... 更多文本键和翻译
 *         }
 *     }
 * }
 *
 * 使用示例：
 * const result = getI18N("hello");
 * // 如果系统语言是 "zh"，则：
 * // result.lang_idx = 5 (简体中文的索引)
 * // result.str = "你好" (简体中文的翻译)
 * // result.max_width = "Hello" (第一个语言的文本，用于布局计算)
 */

const DEBUG_LANG_IDX = 0; // 0 - 20，调试时使用的语言索引
const DEBUG_LANG_LIST = [
    "en",
    "fr",
    "de",
    "es",
    "ar",
    "zh",
    "zh_t",
    "hi",
    "ru",
    "pt",
    "ko",
    "ja",
    "tr",
    "bn",
    "vi",
    "sw",
    "ur",
    "am",
    "id",
    "th",
    "tl"
];

// 注意：IS_DEBUG 需要在外部定义，或者使用全局变量
// @ts-ignore
const IS_DEBUG = (typeof window !== "undefined" && (window as any).IS_DEBUG) || false;
const DEBUG_LANG = IS_DEBUG ? DEBUG_LANG_LIST[DEBUG_LANG_IDX] : null;

const ZH_T = ["zh-TW", "zh-HK", "zh-MO"];

/**
 * 获取国际化文本
 * @param str 文本键名，对应 config.i18n.list 中的键
 * @returns 返回对象：
 *   - lang_idx: 当前使用的语言在 key 数组中的索引
 *   - str: 翻译后的文本
 *   - max_width: 第一个语言的文本（通常用于计算按钮宽度等布局）
 */
export function getI18N(str: string) {
    let lang = DEBUG_LANG || sys.language;
    let n_lang = navigator.language;

    // 处理繁体中文的特殊情况
    if (ZH_T.indexOf(n_lang) !== -1) {
        lang = "zh_t";
    }

    // 注意：config 需要在外部定义，或者使用全局变量
    // @ts-ignore
    const config = i18nConfig;
    if (!config || !config.i18n) {
        return { lang_idx: 0, str: str };
    }

    // 从 config.i18n.list 中获取该文本键对应的所有语言翻译数组
    let str_list = config.i18n.list[str];
    // log("str_list:", str_list);
    if (str_list) {
        // 在 config.i18n.key 数组中查找当前语言的索引
        // 这个索引对应 str_list 数组中相同位置的翻译文本
        let index = config.i18n.key.indexOf(lang);
        // 如果找不到对应语言（index = -1），Math.abs(-1) = 1，会取到错误的索引
        // 应该改为：如果找不到，使用索引 0（默认语言）
        if (index < 0 || index >= str_list.length) {
            index = 0;
        }
        let new_str = str_list[index] || str;
        // log("new_str:", new_str);
        return {
            lang_idx: index, // 语言索引
            str: new_str, // 翻译后的文本
            max_width: str_list[0] // 第一个语言的文本（用于布局计算）
        };
    }
    // 如果找不到对应的翻译，返回原始字符串
    return { lang_idx: 0, str: str };
}
