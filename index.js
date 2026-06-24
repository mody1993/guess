import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';

const service = new WOLF();

// دالة البحث العكسي (تستخدم Yandex كمحرك مجاني)
async function reverseSearch(imageUrl) {
    try {
        // نرسل رابط الصورة مباشرة إلى Yandex للبحث العكسي
        const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`;
        
        // هنا نقوم بجلب الصفحة وتحليل العنوان (Title) الخاص بالنتيجة الأولى
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        // استخراج العنوان التقريبي للشيء في الصورة (من خلال الـ Meta Tag)
        const match = html.match(/<title>(.*?)<\/title>/i);
        return match ? match[1].replace('Yandex', '').replace('Image', '').trim() : "غير معروف";
    } catch (err) {
        console.error('❌ خطأ في البحث العكسي:', err.message);
        return null;
    }
}

service.on('message', async (message) => {
    const senderId = Number(message.sourceSubscriberId);
    const roomId = Number(message.targetGroupId || message.groupId || 0);

    if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

    // تفعيل التحليل فقط عند إرسال كلمة 'حل' لتوفير الكوتا
    if (message.body && message.body.startsWith('http')) {
        console.log('🔍 جاري البحث العكسي عن الصورة...');
        
        const answer = await reverseSearch(message.body);
        
        if (answer) {
            console.log(`💡 النتيجة المستخرجة: ${answer}`);
            await service.messaging.sendGroupMessage(ROOM_ID, answer);
        }
    }
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1);
