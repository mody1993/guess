import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;
const service = new WOLF();

// ================= الإعدادات الأساسية =================
const ROOM_ID = 70505; 
const GUESS_BOT_ID = 26491704; // ⚠️ ضع آيدي "بوت خمن" هنا
// ====================================================

let lastCategory = "";

service.on('message', async (message) => {
    if (Number(message.targetGroupId) !== ROOM_ID) return;
    if (Number(message.sourceSubscriberId) !== GUESS_BOT_ID) return;

    try {
        // 1. التقاط الفئة
        if (message.body.includes('الفئة:')) {
            lastCategory = message.body.split('\n')[0].replace('الفئة:', '').trim();
            console.log(`\n[🕹️] جولة جديدة | الفئة: ${lastCategory}`);
            return; 
        }

        // 2. تحليل الصورة
        if (message.body.startsWith('http') && message.body.match(/\.(jpeg|jpg|gif|png)/i)) {
            if (!lastCategory) return;

            console.log(`[🔍] جاري التحليل...`);
            const encoded = encodeURIComponent(message.body);
            const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encoded}`;
            
            const res = await fetch(searchUrl, { 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ar,ar-SA,en-US;q=0.9,en;q=0.8' 
                }
            });

            if (!res.ok) return;
            const html = await res.text();
            
            let answersList = [];
            const titleMatches = [...html.matchAll(/class="CbirItem-Title"[^>]*>([^<]+)<\/div>/gi)];
            titleMatches.forEach(m => answersList.push(m[1]));

            const inputMatch = html.match(/name="text"\s+value="([^"]+)"/i) || html.match(/"query":"([^"]+)"/i);
            if (inputMatch && inputMatch[1]) answersList.push(inputMatch[1]);

            const tagMatches = [...html.matchAll(/class="CbirTags-Item"[^>]*>([^<]+)<\/a>/gi)];
            tagMatches.forEach(m => answersList.push(m[1]));

            let finalAnswer = "";
            answersList = answersList.map(a => a.replace(/<[^>]*>|Yandex|Images|Search|Bing|Google|-/gi, '').trim()).filter(a => a.length > 1);

            if (answersList.length > 0) {
                if (lastCategory.includes('المشاهير')) {
                    finalAnswer = answersList.find(a => a.split(' ').length >= 2 && !a.includes('تصوير')) || answersList[0];
                } else {
                    finalAnswer = answersList.find(a => a.length >= 2 && a.length <= 15) || answersList[0];
                }
            }

            // 3. إرسال الإجابة (إذا وجدت)
            if (finalAnswer) {
                finalAnswer = finalAnswer.replace(/صورة لـ|خلفية|تنزيل|تصميم/g, '').trim();
                console.log(`[✅] الإجابة: ${finalAnswer}`);
                await service.messaging.sendGroupMessage(ROOM_ID, `!ج ${finalAnswer}`);
            } else {
                console.log('[❌] تعذر الحل.');
            }
            lastCategory = ""; 
        }
    } catch (error) {
        console.error('[⚠️] خطأ:', error.message);
    }
});

// بدء التشغيل
service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(() => {
    console.log('[🟢] البوت متصل!');
    setTimeout(async () => {
        await service.messaging.sendGroupMessage(ROOM_ID, '!ج');
    }, 3000);
}).catch(err => {
    console.error('[🔴] فشل:', err.message);
});
