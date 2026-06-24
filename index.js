import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

// إعدادات الغرفة والبوت
const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';

const service = new WOLF();

// دالة البحث العكسي مع تنظيف ذكي للنتائج
async function reverseSearch(imageUrl) {
    try {
        const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        const html = await response.text();
        
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        let result = titleMatch ? titleMatch[1] : null;

        if (result) {
            // قائمة الكلمات المزعجة التي يجب حذفها لتصفية النتيجة
            const junkPhrases = [
                "Yandex", "Image search for", "similar products", 
                "clothes and", "tex", "and", "the", "a", "of", "in"
            ];
            
            junkPhrases.forEach(phrase => {
                const regex = new RegExp(phrase, 'gi');
                result = result.replace(regex, '');
            });

            // تنظيف الفواصل والرموز والمسافات الزائدة
            result = result.replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        // إرجاع النتيجة فقط إذا كانت كلمة ذات معنى
        return (result && result.length > 2) ? result : null;
    } catch (e) { return null; }
}

// مراقبة الرسائل
service.on('message', async (message) => {
    if (Number(message.targetGroupId) !== ROOM_ID || Number(message.sourceSubscriberId) !== TARGET_USER_ID) return;
    
    if (message.body?.startsWith('http') && (message.body.includes('.jpg') || message.body.includes('.jpeg'))) {
        console.log('🔍 جاري البحث عن الصورة...');
        const answer = await reverseSearch(message.body);
        
        // شرط الصمت التام: لا يرسل شيئاً إلا إذا وجد إجابة نظيفة
        if (answer && answer.toLowerCase() !== "غير معروف" && answer.toLowerCase() !== "yandex") {
            console.log(`💡 النتيجة المكتشفة: ${answer}`);
            await service.messaging.sendGroupMessage(ROOM_ID, answer);
        } else {
            console.log('⚠️ لا توجد نتيجة دقيقة، البوت سيبقى صامتاً.');
        }
    }
});

// تسجيل الدخول مع تأخير لضمان استقرار البوت في الغرفة
service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(() => {
    console.log('✅ تم تسجيل الدخول بنجاح!');
    setTimeout(async () => {
        await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
        console.log('🚀 تم إرسال أمر البدء!');
    }, 5000);
}).catch(err => {
    console.error('❌ خطأ في التسجيل:', err.message);
});
