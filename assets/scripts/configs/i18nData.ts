export const i18nKeys = [
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
    "tl",
] as const;

export type I18nKey = (typeof i18nKeys)[number];

export const i18nList: Record<string, string[]> = {
    DOWNLOAD: [
        "DOWNLOAD", // en
        "TÉLÉCHARGER", // fr
        "HERUNTERLADEN", // de
        "DESCARGAR", // es
        "تحميل", // ar
        "下载", // zh
        "下載", // zh_t
        "डाउनलोड", // hi
        "СКАЧАТЬ", // ru
        "BAIXAR", // pt
        "다운로드", // ko
        "ダウンロード", // ja
        "İNDİR", // tr
        "ডাউনলোড", // bn
        "TẢI XUỐNG", // vi
        "PAKUA", // sw
        "ڈاؤن لوڈ", // ur
        "አውርድ", // am
        "UNDUH", // id
        "ดาวน์โหลด", // th
        "I-DOWNLOAD", // tl
    ],
    Revive: [
        "Revive", // en
        "Revivre", // fr
        "Wiederbeleben", // de
        "Revivir", // es
        "إحياء", // ar
        "复活", // zh
        "復活", // zh_t
        "पुनर्जीवित करें", // hi
        "Возродиться", // ru
        "Reviver", // pt
        "부활", // ko
        "リバイブ", // ja
        "Canlandır", // tr
        "পুনরুজ্জীবিত করুন", // bn
        "Hồi sinh", // vi
        "Fufua", // sw
        "دوبارہ زندہ کریں", // ur
        "እንደገና አንቁ", // am
        "Hidupkan kembali", // id
        "ฟื้นคืนชีพ", // th
        "Buhayin", // tl
    ],
    "So Close!": [
        "So Close!", // en
        "Si proche !", // fr
        "So nah!", // de
        "¡Tan cerca!", // es
        "!على وشك النجاح", // ar
        "再接再励!", // zh
        "再接再厲!", // zh_t
        "बहुत करीब!", // hi
        "Почти!", // ru
        "Tão perto!", // pt
        "아슬아슬해!", // ko
        "もう少し！", // ja
        "Neredeyse!", // tr
        "এত কাছে!", // bn
        "Gần lắm rồi!", // vi
        "Karibu sana!", // sw
        "!بہت قریب", // ur
        "በጣም ቅርብ ነው!", // am
        "Hampir!", // id
        "เกือบแล้ว!", // th
        "Malapit na!", // tl
    ],
    Collection: [
        "Collection", // en
        "Collection", // fr
        "Sammlung", // de
        "Colección", // es
        "مجموعة", // ar
        "收集情况", // zh
        "收集情况", // zh_t
        "संग्रह", // hi
        "Коллекция", // ru
        "Coleção", // pt
        "수집", // ko
        "コレクション", // ja
        "Koleksiyon", // tr
        "সংগ্রহ", // bn
        "Bộ sưu tập", // vi
        "Mkusanyiko", // sw
        "مجموعہ", // ur
        "ስብስብ", // am
        "Koleksi", // id
        "คอลเลกชัน", // th
        "Koleksyon", // tl
    ],
    "Target Collection": [
        "Target Collection", // en
        "Collection d'objectifs", // fr
        "Zielsammlung", // de
        "Colección de objetivos", // es
        "جمع الأهداف", // ar
        "收集目标", // zh
        "收集目標", // zh_t
        "लक्ष्य संग्रह", // hi
        "Сбор целей", // ru
        "Coleção de objetivos", // pt
        "목표 수집", // ko
        "ターゲット収集", // ja
        "Hedef Koleksiyonu", // tr
        "লক্ষ্য সংগ্রহ", // bn
        "Bộ sưu tập mục tiêu", // vi
        "Ukusanya malengo", // sw
        "ہدف جمع", // ur
        "ዒላማ ስብስብ", // am
        "Koleksi target", // id
        "การรวบรวมเป้าหมาย", // th
        "Koleksyon ng target", // tl
    ],
    DifficultyTip: [
        "player fail in the level.", // en
        "des joueurs échouent au niveau", // fr
        "der Spieler scheitern im Level", // de
        "de jugadores fallan en el nivel", // es
        "من اللاعبين يفشلون في المستوى", // ar
        "的玩家没有通过此关卡", // zh
        "的玩家沒有通過此關卡", // zh_t
        "खिलाड़ी स्तर में विफल होते हैं", // hi
        "игроков проваливают уровень", // ru
        "dos jogadores falham no nível", // pt
        "의 플레이어가 레벨에서 실패합니다", // ko
        "のプレイヤーがレベルに失敗します", // ja
        "oyuncu seviyede başarısız oluyor", // tr
        "খেলোয়াড় এই স্তরে ব্যর্থ হয়", // bn
        "người chơi thất bại ở cấp độ này", // vi
        "ya wachezaji wanashindwa katika ngazi", // sw
        "کھلاڑی اس سطح میں ناکام ہوتے ہیں", // ur
        "ተጫዋቾች ደረጃውን ይከሽፋሉ", // am
        "pemain gagal di level ini", // id
        "ของผู้เล่นล้มเหลวในด่านนี้", // th
        "ng mga manlalaro ay nabigo sa antas", // tl
    ],
    "FREE TO PLAY": [
        "FREE TO PLAY", // en
        "Jouer gratuitement", // fr
        "Kostenlos spielen", // de
        "Jugar gratis", // es
        "لعب مجانًا", // ar
        "免费游玩", // zh
        "免費遊玩", // zh_t
        "मुफ्त खेलें", // hi
        "Играть бесплатно", // ru
        "Jogar gratuitamente", // pt
        "무료 플레이", // ko
        "無料でプレイ", // ja
        "Ücretsiz oyna", // tr
        "বিনামূল্যে খেলুন", // bn
        "Chơi miễn phí", // vi
        "Cheza bila malipo", // sw
        "مفتی کھیلیں", // ur
        "በነፃ ይጫወቱ", // am
        "Main gratis", // id
        "เล่นฟรี", // th
        "Maglaro nang libre", // tl
    ],
    "PLAY NOW": [
        "PLAY NOW", // en
        "Jouer maintenant", // fr
        "Jetzt spielen", // de
        "Jugar ahora", // es
        "العب الآن", // ar
        "立即游玩", // zh
        "立即遊玩", // zh_t
        "अभी खेलें", // hi
        "Играть сейчас", // ru
        "Jogar agora", // pt
        "지금 플레이", // ko
        "今すぐプレイ", // ja
        "Şimdi oyna", // tr
        "এখনই খেলুন", // bn
        "Chơi ngay", // vi
        "Cheza sasa", // sw
        "ابھی کھیلیں", // ur
        "አሁን ይጫወቱ", // am
        "Main sekarang", // id
        "เล่นตอนนี้", // th
        "Maglaro ngayon", // tl
    ],
    "BEST SCORE": [
        "BEST SCORE", // en
        "MEILLEUR SCORE", // fr
        "BESTE SCORE", // de
        "MEJOR PUNTUACIÓN", // es
        "أعلى نتيجة", // ar
        "最佳分数", // zh
        "最佳分數", // zh_t
        "सर्वश्रेष्ठ स्कोर", // hi
        "ЛУЧШИЙ СЧЁТ", // ru
        "MELHOR PONTUAÇÃO", // pt
        "최고 점수", // ko
        "ベストスコア", // ja
        "EN İYİ SKOR", // tr
        "সেরা স্কোর", // bn
        "ĐIỂM CAO NHẤT", // vi
        "ALAMA BORA", // sw
        "بہترین اسکور", // ur
        "ምርጥ ነጥብ", // am
        "SKOR TERBAIK", // id
        "คะแนนสูงสุด", // th
        "PINAKAMATAAS NA ISKOR", // tl
    ],
    SCORE: [
        "SCORE", // en
        "SCORE", // fr
        "PUNKTZAHL", // de
        "PUNTUACIÓN", // es
        "النتيجة", // ar
        "分数", // zh
        "分數", // zh_t
        "स्कोर", // hi
        "СЧЁТ", // ru
        "PONTUAÇÃO", // pt
        "점수", // ko
        "スコア", // ja
        "SKOR", // tr
        "স্কোর", // bn
        "ĐIỂM", // vi
        "ALAMA", // sw
        "اسکور", // ur
        "ነጥብ", // am
        "SKOR", // id
        "คะแนน", // th
        "ISKOR", // tl
    ],
    "PLAY AGAIN": [
        "PLAY AGAIN", // en
        "REJOUIRE", // fr
        "NOCHMAL SPIELEN", // de
        "JUGAR DE NUEVO", // es
        "العب مرة أخرى", // ar
        "再玩一次", // zh
        "再玩一次", // zh_t
        "फिर से खेलें", // hi
        "ИГРАТЬ СНОВА", // ru
        "JOGAR NOVAMENTE", // pt
        "다시 플레이", // ko
        "もう一度プレイ", // ja
        "TEKRAR OYNA", // tr
        "আবার খেলুন", // bn
        "CHƠI LẠI", // vi
        "CHEZA TENA", // sw
        "دوبارہ کھیلیں", // ur
        "እንደገና ይጫወቱ", // am
        "MAIN LAGI", // id
        "เล่นอีกครั้ง", // th
        "MAGLARO MULI", // tl
    ],
};
