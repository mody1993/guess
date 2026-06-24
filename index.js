import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;
const ROOM_ID = 70505;
const service = new WOLF();

// ذاكرة مؤقتة لحفظ الفئة
let lastCategory = "";

service.on('message', async (message) => {
    if (message.targetGroupId !== ROOM_ID.toString()) return;

    // 1. إذا كانت الرسالة تحتوي على فئة، احفظها في الذاكرة
    if (message.body.includes('الفئة:')) {
        lastCategory = message.body.split('\n')[0];
        console.log(`💾 تم حفظ الفئة: ${lastCategory}`);
        return; // لا نفعل شيئاً حتى تصل الصورة
    }

    // 2. إذا وصلت صورة (رابط)، استخدم الفئة المحفوظة
    if (message.body.startsWith('http') && (message.body.includes('.jpg') || message.body.includes('.jpeg'))) {
        if (!lastCategory) return; // إذا لم توجد فئة، تجاهل الصورة

        console.log(`🎯 استخدام الفئة المحفوظة: ${lastCategory}`);
        const encoded = encodeURIComponent(message.body);
        
        // اختيار المحرك بناءً على الفئة
        let searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encoded}`; // افتراضي
        
        if (lastCategory.includes('المشاهير')) {
            searchUrl = `https://www.google.com/searchbyimage?image_url=${encoded}`;
        } else if (lastCategory.includes('موسيقى') || lastCategory.includes('طعام')) {
            searchUrl = `https://www.bing.com/images/search?view=detailv2&q=imgurl:${encoded}`;
        }

        const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        const html = await res.text();
        const match = html.match(/<title>(.*?)<\/title>/i) || html.match(/<h2.*?>(.*?)<\/h2>/i);
        let answer = match ? match[1].replace(/<[^>]*>|Yandex|Bing|Google|Search/gi, '').trim() : null;

        if (answer && answer.length > 3) {
            await service.messaging.sendGroupMessage(ROOM_ID, answer);
            lastCategory = ""; // مسح الفئة بعد الإجابة
        }
    }
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1);
