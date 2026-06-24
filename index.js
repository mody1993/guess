import { WOLFBot } from 'wolf.js';

// ==================== [ قسم الإعدادات الآمنة ] ====================
const CONFIG = {
    // هذه البيانات يتم سحبها من إعدادات السيرفر (Environment Variables)
    U_MAIL: process.env.U_MAIL, 
    U_PASS: process.env.U_PASS,
    TARGET_GROUP_ID: 70505,
    PHOTO_BOT_ID: 26491704
};

// ==================== [ قاعدة بيانات الصور والحلول ] ====================
const imageDatabase = {
    "https://example.com/apple.png": "تفاحة",
    "https://example.com/car.png": "سيارة",
    "https://example.com/cat.png": "قطة"
};

let currentCorrectAnswer = null;

// تسجيل الدخول مع التحقق من وجود البيانات
if (!CONFIG.U_MAIL || !CONFIG.U_PASS) {
    console.error("[-] خطأ: لم يتم العثور على الإيميل أو الباسورد في إعدادات السيرفر!");
    process.exit(1);
}

const bot = new WOLFBot({ log: true });

bot.on('ready', async () => {
    console.log(`[+] البوت شغال ومسجل دخول بنجاح الآن!`);
    await bot.group().join(CONFIG.TARGET_GROUP_ID);
    console.log(`[+] تم دخول الغرفة رقم: ${CONFIG.TARGET_GROUP_ID}`);
});

bot.on('message', async (message) => {
    if (!message.isGroup || message.targetGroupId !== CONFIG.TARGET_GROUP_ID) { return; }

    if (message.isImage && message.senderId === CONFIG.PHOTO_BOT_ID) {
        const imageUrl = message.body;
        if (imageDatabase[imageUrl]) {
            currentCorrectAnswer = imageDatabase[imageUrl];
            console.log(`[💡] تم رصد صورة، الحل: (${currentCorrectAnswer})`);
        } else {
            currentCorrectAnswer = null;
        }
        return;
    }

    if (message.isText && currentCorrectAnswer && message.body.trim() === currentCorrectAnswer) {
        const subscriber = await bot.subscriber().getById(message.senderId);
        const playerName = subscriber ? subscriber.nickname : "اللاعب";
        await bot.messaging().sendGroupMessage(CONFIG.TARGET_GROUP_ID, `🎉 إجابة صحيحة يا [ ${playerName} ]! الجواب هو: ${currentCorrectAnswer}`);
        currentCorrectAnswer = null;
    }
});

bot.login(CONFIG.U_MAIL, CONFIG.U_PASS);