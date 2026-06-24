import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;
const service = new WOLF();

// ================= الإعدادات الأساسية =================
const ROOM_ID = 70505; // آيدي الغرفة
const GUESS_BOT_ID = 26491704; // ⚠️ ضع آيدي "بوت خمن" الحقيقي هنا
// ====================================================

let lastCategory = "";

service.on('message', async (message) => {
    if (Number(message.targetGroupId) !== ROOM_ID) return;
    if (Number(message.sourceSubscriberId) !== GUESS_BOT_ID) return;

    try {
        // 1. التقاط الفئة وتحديد نوع المعالجة
        if (message.body.includes('الفئة:')) {
            lastCategory = message.body.split('\n')[0].replace('الفئة:', '').trim();
            console.log(`\n[🕹️] جولة جديدة | الفئة: ${lastCategory}`);
            return; 
        }

        // 2. استقبال صورة السؤال
        if (message.body.startsWith('http') && message.body.match(/\.(jpeg|jpg|gif|png)/i)) {
            
            if (!lastCategory) return;

            console.log(`[🔍] جاري تحليل الصورة لفئة [${lastCategory}]...`);
            const encoded = encodeURIComponent(message.body);
            const searchUrl = `https://yandex.com/images/search?rpt=imageview&url=${encoded}`;
            
            const res = await fetch(searchUrl, { 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ar,ar-SA;q=0.9,en;q=0.8' 
                }
            });

            if (!res.ok) throw new Error(`Error ${res.status}`);
            const html = await res.text();
            
            let answersList = [];

            // 3. 🚀 استخراج البيانات المتقدم (سحب الأوسمة، العناوين، وحقول البحث)
            // البحث عن العناوين الرئيسية المتاحة بالصفحة
            const titleMatches = [...html.matchAll(/class="CbirItem-Title"[^>]*>([^<]+)<\/div>/gi)];
            titleMatches.forEach(m => answersList.push(m[1]));

            // البحث عن النص الموجود داخل حقل البحث التلقائي لياندكس
            const inputMatch = html.match(/name="text"\s+value="([^"]+)"/i) || html.match(/"query":"([^"]+)"/i);
            if (inputMatch && inputMatch[1]) answersList.push(inputMatch[1]);

            // البحث عن الكلمات الدلالية المصاحبة للصورة (ممتازة لفئات مثل رياضة، طعام، موسيقى، عن قرب)
            const tagMatches = [...html.matchAll(/class="CbirTags-Item"[^>]*>([^<]+)<\/a>/gi)];
            tagMatches.forEach(m => answersList.push(m[1]));

            // 4. فلترة وتصفية الأجوبة بناءً على الفئة الحالية
            let finalAnswer = "";

            // تنظيف القائمة من الشوائب العامة
            answersList = answersList.map(a => a.replace(/<[^>]*>|Yandex|Images|Search|Bing|Google|-/gi, '').trim()).filter(a => a.length > 1);

            if (lastCategory.includes('المشاهير')) {
                // في فئة المشاهير: نبحث عن أول إجابة تتكون من اسم ثنائي أو ثلاثي (اسم الشخص)
                finalAnswer = answersList.find(a => a.split(' ').length >= 2 && !a.includes('تصوير') && !a.includes('فستان')) || answersList[0];
            } 
            else if (lastCategory.includes('رياضة') || lastCategory.includes('موسيقى') || lastCategory.includes('عن قرب')) {
                // في هذه الفئات: نحتاج اسم الشيء مباشرة (مثل: ترامبولين، فلوت، قارورة ماء)
                // نختار الكلمة الأكثر تكراراً أو الأدق في الوصف
                finalAnswer = answersList.find(a => a.length > 2 && a.length < 20) || answersList[0];
            } 
            else {
                // باقي الفئات (شعارات، منوع، الخ...) نأخذ أول تخمين دقيق لقاعدة البيانات
                finalAnswer = answersList[0];
            }

            // 5. إرسال الإجابة النهائية المفلترة للغرفة
            if (finalAnswer) {
                // إزالة أي كلمات زائدة قد يضيفها محرك البحث لتكون الإجابة دقيقة ومباشرة
                finalAnswer = finalAnswer.replace(/صورة لـ|خلفية|تنزيل|تصميم/g, '').trim();

                console.log(`[✅] الإجابة المقترحة بنجاح: ${finalAnswer}`);
                await service.messaging.sendGroupMessage(ROOM_ID, `!ج ${finalAnswer}`);
            } else {
                console.log('[❌] تعذر تحديد إجابة متوافقة مع الفئة.');
                await service.messaging.sendGroupMessage(ROOM_ID, `!ج غير معروف`);
            }

            // تصفير الفئة انتظاراً للجولة القادمة
            lastCategory = ""; 
        }
    } catch (error) {
        console.error('[⚠️] خطأ أثناء معالجة الجولة:', error.message);
    }
});

// بدء التشغيل
service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(async () => {
    console.log('[🟢] البوت متصل ومستعد لجميع الفئات الآن!');
    await service.messaging.sendGroupMessage(ROOM_ID, '!ج');
}).catch(err => {
    console.error('[🔴] خطأ في الدخول:', err.message);
});
