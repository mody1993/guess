import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;
const service = new WOLF();

// ================= الإعدادات الأساسية =================
const ROOM_ID = 70505; // آيدي الغرفة التي تلعبون فيها
const GUESS_BOT_ID = 26491704; // ⚠️ استبدل هذا الرقم بـ آيدي "بوت خمن" من بروفايله في WOLF
// ====================================================

// ذاكرة مؤقتة لحفظ الفئة عند بدء الجولة
let lastCategory = "";

service.on('message', async (message) => {
    // 1. تجاهل أي رسالة خارج الغرفة المحددة
    if (Number(message.targetGroupId) !== ROOM_ID) return;

    // 2. فلتر حصري: استقبل الرسائل التي يرسلها "بوت خمن" فقط
    if (Number(message.sourceSubscriberId) !== GUESS_BOT_ID) return;

    try {
        // 3. التقاط الفئة (يدعم: شعارات، عن قرب، حول العالم، منوع، المشاهير، الخ...)
        if (message.body.includes('الفئة:')) {
            lastCategory = message.body.split('\n')[0].replace('الفئة:', '').trim();
            console.log(`[🕹️] جولة جديدة! الفئة الحالية: ${lastCategory}`);
            return; 
        }

        // 4. التقاط الصورة وإرسالها للبحث العكسي
        if (message.body.startsWith('http') && message.body.match(/\.(jpeg|jpg|gif|png)/i)) {
            
            if (!lastCategory) {
                console.log('[⚠️] وصلت صورة من البوت ولكن لم يتم التقاط الفئة.');
                return;
            }

            console.log(`[🔍] جاري فحص الصورة...`);
            const encoded = encodeURIComponent(message.body);
            
            // استخدام Yandex كخيار أساسي ودقيق لجميع الفئات
            const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encoded}`;
            
            const res = await fetch(searchUrl, { 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
                }
            });

            if (!res.ok) throw new Error(`رفض محرك البحث الطلب (كود ${res.status})`);

            const html = await res.text();
            
            // 5. استخراج اسم الصورة وتنظيفه من الشوائب
            let answer = null;
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            
            if (titleMatch) {
                answer = titleMatch[1]
                    .replace(/<[^>]*>|Yandex|Images|Search|Bing|Google|-/gi, '') 
                    .replace(/Image search for clothes and similar products/gi, '') 
                    .trim();
            }

            // 6. إرسال الإجابة للغرفة
            if (answer && answer.length > 2) {
                console.log(`[✅] الإجابة المستخرجة: ${answer}`);
                await service.messaging.sendGroupMessage(ROOM_ID, `!ج ${answer}`);
                lastCategory = ""; // مسح الفئة للاستعداد للسؤال التالي
            } else {
                console.log('[❌] لم يتم العثور على اسم واضح للصورة.');
                await service.messaging.sendGroupMessage(ROOM_ID, `!ج غير معروف`);
            }
        }
    } catch (error) {
        console.error('[⚠️] حدث خطأ أثناء الاتصال بمحرك البحث:', error.message);
    }
});

// تشغيل البوت وتسجيل الدخول
service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(() => {
    console.log('[🟢] البوت متصل الآن وجاهز لاصطياد إجابات "بوت خمن"!');
}).catch(err => {
    console.error('[🔴] فشل تسجيل الدخول:', err.message);
});
