import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';

const service = new WOLF();

// دالة البحث العكسي المعتمدة (بدون Gemini)
async function reverseSearch(imageUrl) {
    try {
        // نستخدم Yandex لأنه الأقوى في التعرف على الصور حالياً
        const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await response.text();
        const match = html.match(/<title>(.*?)<\/title>/i);
        return match ? match[1].replace('Yandex', '').replace('Image', '').trim() : "غير معروف";
    } catch (e) { return null; }
}

service.on('message', async (message) => {
    if (Number(message.targetGroupId) !== ROOM_ID || Number(message.sourceSubscriberId) !== TARGET_USER_ID) return;
    
    if (message.body?.startsWith('http') && (message.body.includes('.jpg') || message.body.includes('.jpeg'))) {
        console.log('🔍 جاري البحث العكسي...');
        
        const answer = await reverseSearch(message.body);
        
        if (answer) {
            console.log(`💡 النتيجة المستخرجة: ${answer}`);
            await service.messaging.sendGroupMessage(ROOM_ID, answer);
        }
    }
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(async () => {
    console.log('✅ تم تسجيل الدخول!');
    setTimeout(async () => {
        await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
    }, 5000);
}).catch(err => {
    console.error('❌ خطأ في التسجيل:', err);
});
