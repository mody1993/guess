import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

// إعدادات الغرفة والبوت
const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';

const service = new WOLF();

// دالة البحث العكسي - تجلب النتيجة وتستبعد "غير معروف"
async function reverseSearch(imageUrl) {
    try {
        const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        const html = await response.text();
        
        // محاولة استخراج العنوان أو الوصف
        const metaMatch = html.match(/<meta name="description" content="(.*?)"/i);
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const result = metaMatch ? metaMatch[1] : (titleMatch ? titleMatch[1] : null);
        
        return result ? result.replace(/Yandex/gi, '').replace(/Images/gi, '').trim().substring(0, 50) : null;
    } catch (e) { return null; }
}

service.on('message', async (message) => {
    // التأكد من الغرفة والمستخدم
    if (Number(message.targetGroupId) !== ROOM_ID || Number(message.sourceSubscriberId) !== TARGET_USER_ID) return;
    
    // التحقق من أن الرسالة عبارة عن رابط صورة
    if (message.body?.startsWith('http') && (message.body.includes('.jpg') || message.body.includes('.jpeg'))) {
        console.log('🔍 جاري البحث عن الصورة...');
        const answer = await reverseSearch(message.body);
        
        // التحقق من أن النتيجة صالحة وغير "مبهمة"
        if (answer && answer.toLowerCase() !== "غير معروف" && answer.toLowerCase() !== "yandex" && answer.length > 2) {
            console.log(`💡 النتيجة المكتشفة: ${answer}`);
            await service.messaging.sendGroupMessage(ROOM_ID, answer);
        } else {
            console.log('⚠️ لم يتم العثور على نتيجة واضحة، البوت سيبقى صامتاً.');
        }
    }
});

// تسجيل الدخول مع تأخير لضمان الاستقرار
service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(() => {
    console.log('✅ تم تسجيل الدخول بنجاح!');
    setTimeout(async () => {
        await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
        console.log('🚀 تم إرسال أمر البدء!');
    }, 5000);
}).catch(err => {
    console.error('❌ خطأ في التسجيل:', err.message);
});
