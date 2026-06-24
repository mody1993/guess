import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;
const service = new WOLF();

const ROOM_ID = 70505; 
const GUESS_BOT_ID = 26491704; // ⚠️ تأكد من هذا الآيدي

let lastCategory = "";

service.on('message', async (message) => {
    if (Number(message.targetGroupId) !== ROOM_ID) return;
    if (Number(message.sourceSubscriberId) !== GUESS_BOT_ID) return;

    try {
        if (message.body.includes('الفئة:')) {
            lastCategory = message.body.split('\n')[0].replace('الفئة:', '').trim();
            return; 
        }

        if (message.body.startsWith('http') && message.body.match(/\.(jpeg|jpg|png)/i)) {
            const encoded = encodeURIComponent(message.body);
            const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encoded}`;
            
            const res = await fetch(searchUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
            });

            if (!res.ok) return;
            const html = await res.text();
            
            // استخراج العناوين والكلمات الدلالية
            const matches = [...html.matchAll(/class="CbirItem-Title"[^>]*>([^<]+)<\/div>|class="CbirTags-Item"[^>]*>([^<]+)<\/a>/gi)];
            let answers = matches.map(m => (m[1] || m[2]).replace(/<[^>]*>|Yandex|Images|Search|Bing|Google|-|تنزيل|صورة|خلفية|شعار|تصميم/gi, '').trim());
            
            // تصفية النتائج (نأخذ الكلمات التي لا تتجاوز 15 حرف)
            let finalAnswer = answers.find(a => a.length > 1 && a.length < 15);

            if (finalAnswer) {
                console.log(`[✅] الإجابة: ${finalAnswer}`);
                await service.messaging.sendGroupMessage(ROOM_ID, `!ج ${finalAnswer}`);
            } else {
                console.log('[❌] لم أجد إجابة مناسبة في هذه الجولة.');
            }
        }
    } catch (error) {
        console.error('[⚠️] خطأ:', error.message);
    }
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(() => {
    console.log('[🟢] البوت جاهز!');
    setTimeout(() => service.messaging.sendGroupMessage(ROOM_ID, '!ج'), 3000);
});
