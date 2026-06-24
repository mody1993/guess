import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';
const service = new WOLF();

// دالة لجلب النتائج من أي محرك
async function getSearch(url, selector) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        const html = await res.text();
        const match = html.match(selector);
        return match ? match[1].replace(/<[^>]*>/g, '').trim() : null;
    } catch (e) { return null; }
}

async function getBestAnswer(imageUrl) {
    const encoded = encodeURIComponent(imageUrl);
    const results = await Promise.all([
        getSearch(`https://yandex.com/images/search?rpt=imageview&url=${encoded}`, /<title>(.*?)<\/title>/i),
        getSearch(`https://www.bing.com/images/search?view=detailv2&q=imgurl:${encoded}`, /<h2 class="title">(.*?)<\/h2>/i),
        getSearch(`https://duckduckgo.com/?q=image+search&iai=${encoded}`, /<title>(.*?)<\/title>/i),
        getSearch(`https://www.google.com/searchbyimage?image_url=${encoded}`, /<title>(.*?)<\/title>/i)
    ]);

    // تنظيف النتائج
    const cleanResults = results.filter(r => r && r.length > 3).map(r => 
        r.replace(/Yandex|Bing|Google|DuckDuckGo|Image|search|result|results|for/gi, '').trim().toLowerCase()
    );

    if (cleanResults.length === 0) return null;

    // خوارزمية المقارنة: إيجاد الكلمة الأكثر تكراراً
    const counts = {};
    cleanResults.forEach(res => counts[res] = (counts[res] || 0) + 1);
    
    // إرجاع النتيجة الأكثر تكراراً، أو الأولى إذا لم يتكرر شيء
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

service.on('message', async (message) => {
    if (Number(message.targetGroupId) !== ROOM_ID || Number(message.sourceSubscriberId) !== TARGET_USER_ID) return;
    
    if (message.body?.startsWith('http') && (message.body.includes('.jpg') || message.body.includes('.jpeg'))) {
        console.log('🔍 جاري التحليل والمقارنة بين المحركات...');
        
        const finalAnswer = await getBestAnswer(message.body);
        
        if (finalAnswer) {
            console.log(`💡 الإجابة المختارة (بعد المقارنة): ${finalAnswer}`);
            await service.messaging.sendGroupMessage(ROOM_ID, finalAnswer);
        } else {
            console.log('⚠️ لم يتوصل البوت لاتفاق بين المحركات.');
        }
    }
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1).then(() => {
    console.log('✅ تم تسجيل الدخول!');
    setTimeout(async () => { await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND); }, 5000);
});
